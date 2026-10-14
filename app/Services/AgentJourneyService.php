<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Support\Areas;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// An agent's onboarding journey, milestone by milestone: registered → profile photo → NAO → FIRE → activation. Dates come
// from the data (agent_attributes, sales) and the activity log, whose readable entries name the agent as their subject.
class AgentJourneyService
{
    // FIRE is complete at three certificates (agent_attributes.fire_certificates, as Recruits counts it).
    public const FIRE_DONE = 3;

    public function __construct(private AgentUplineService $uplines, private ActivationRequestService $activations) {}

    /**
     * @return array<string, mixed>
     */
    public function for(Agent $agent): array
    {
        $agent->loadMissing('user:id,name,email');
        $row = DB::table('agent_attributes')->where('agent_id', $agent->id)->first();
        $placement = $this->uplines->placementOf($agent);
        $sponsor = $row?->referral_id ? Agent::with('user:id,name')->find($row->referral_id) : null;

        $milestones = [
            $this->registered($agent, $sponsor, $placement),
            $this->photo($agent),
            $this->nao($agent, $row),
            $this->fire($row),
            $this->activation($agent),
        ];
        // The first one not done yet is where they are; everything after it comes later.
        $current = null;
        foreach ($milestones as $i => $m) {
            if ($m['status'] !== 'done' && $current === null) {
                $current = $i;
                $milestones[$i]['status'] = $m['status'] === 'waiting' ? 'waiting' : 'current';
            } elseif ($m['status'] !== 'done') {
                $milestones[$i]['status'] = 'upcoming';
            }
        }

        return [
            'agent' => [
                'id' => $agent->id,
                'name' => trim("{$agent->first_name} {$agent->last_name}") ?: (string) $agent->user?->name,
                'first_name' => $agent->first_name ?: strtok((string) $agent->user?->name, ' '),
                'avatar' => $agent->avatar,
                'branch' => $agent->area ? Areas::name($agent->area) : null,
                'team' => $placement['team']?->name,
                'sub_team' => $placement['sub_team']?->name,
                'sponsor' => $sponsor ? ['name' => trim("{$sponsor->first_name} {$sponsor->last_name}") ?: $sponsor->user?->name, 'avatar' => $sponsor->avatar] : null,
            ],
            'milestones' => $milestones,
            'done' => count(array_filter($milestones, fn ($m) => $m['status'] === 'done')),
        ];
    }

    private function registered(Agent $agent, ?Agent $sponsor, array $placement): array
    {
        $where = $placement['team']?->name ? ' and joined '.$placement['team']->name.($placement['sub_team']?->name ? ' / '.$placement['sub_team']->name : '') : '';

        // Joined Leuterio Realty (legacy lr_joined; "0000-00-00" = none), else when the record was made.
        $joined = $agent->lr_joined_at && ! str_starts_with((string) $agent->lr_joined_at, '0000') ? $agent->lr_joined_at : $agent->created_at;

        return $this->milestone('registered', 'Registered', 'done', $joined,
            ($sponsor ? 'Sponsored by '.(trim("{$sponsor->first_name} {$sponsor->last_name}") ?: $sponsor->user?->name) : 'Welcome to Leuterio Realty').$where.'.');
    }

    private function photo(Agent $agent): array
    {
        return $agent->avatar
            ? $this->milestone('photo', 'Profile photo', 'done', $this->logged($agent, ['profile.photo_updated']), 'Clients and the team can recognise you.')
            : $this->milestone('photo', 'Profile photo', 'todo', null, 'Add a clear photo of your face — it shows on your profile and business card.');
    }

    private function nao(Agent $agent, ?object $row): array
    {
        $status = $row?->nao_attendance_status;
        $progress = (int) ($row->nao_video_tracker ?? 0);
        if ($status === NaoService::ATTENDED && $row->nao_attendance_reviewed_at) {
            $by = $row->nao_attendance_reviewed_by ? DB::table('users')->where('id', $row->nao_attendance_reviewed_by)->value('name') : null;
            $on = $row->nao_date_of_attendance ? ' on '.Carbon::parse($row->nao_date_of_attendance)->format('M j, Y') : '';

            return $this->milestone('nao', 'New Agents Orientation', 'done', $row->nao_attendance_reviewed_at, "Attended face to face{$on}".($by ? ", approved by {$by}" : '').'.');
        }
        if ($progress >= 100) {
            return $this->milestone('nao', 'New Agents Orientation', 'done', $this->logged($agent, ['nao.webinar_finished']) ?? $row?->nao_video_saved_at,
                $status === NaoService::ATTENDED ? 'Attended face to face.' : 'Finished the New Agents Webinar.');
        }
        if ($status === NaoService::ATTENDED) {
            return $this->milestone('nao', 'New Agents Orientation', 'waiting', $row->nao_attendance_submitted_at, 'Attendance sent — waiting for your sponsor to approve it.');
        }

        return $this->milestone('nao', 'New Agents Orientation', 'todo', null, $progress > 0 ? "Webinar {$progress}% watched — keep going." : 'Attend the NAO face to face, or watch the New Agents Webinar.');
    }

    private function fire(?object $row): array
    {
        $count = min(self::FIRE_DONE, (int) ($row->fire_certificates ?? 0));

        return $this->milestone('fire', 'FIRE — Filipinohomes Institute of Real Estate', $count >= self::FIRE_DONE ? 'done' : 'todo', null,
            $count >= self::FIRE_DONE ? 'FIRE complete — three modules passed.' : "{$count} of ".self::FIRE_DONE.' FIRE modules passed. Finish FIRE to sell with confidence and grow faster.',
            ['certificates' => $count, 'of' => self::FIRE_DONE]);
    }

    private function activation(Agent $agent): array
    {
        $first = collect([
            DB::table('agent_transactions')->where('agent_id', $agent->id)->min('created_at'),
            DB::table('international_sales')->where('agent_id', $agent->id)->min('created_at'),
        ])->filter()->min();

        if ($first) {
            return $this->milestone('activation', 'Activation', 'done', $first, 'Your LR account is active — activated with your first sale.');
        }
        // The account is activated with the first sale: a request for activation + that sale's proof of transaction.
        $request = $this->activations->latest($agent);

        return $request
            ? $this->milestone('activation', 'Activation', 'waiting', $request['submitted_at'], 'Request for activation sent — the office will activate your account and encode your sale.', ['activation' => $request])
            : $this->milestone('activation', 'Activation', 'todo', null, 'Your LR account is activated with your first sale: send your request for activation with the sale\'s proof of transaction.', ['activation' => null]);
    }

    // When a readable activity-log entry about this agent first happened.
    private function logged(Agent $agent, array $actions): ?string
    {
        return DB::table('activity_logs')->where('subject_type', $agent->getMorphClass())->where('subject_id', $agent->id)
            ->whereIn('action', $actions)->where('outcome', 'success')->min('created_at');
    }

    private function milestone(string $key, string $title, string $status, mixed $date, string $detail, array $extra = []): array
    {
        return ['key' => $key, 'title' => $title, 'status' => $status, 'date' => $date ? Carbon::parse($date)->toIso8601String() : null, 'detail' => $detail] + $extra;
    }
}
