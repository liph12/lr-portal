<?php

namespace App\Services;

use App\Models\Entities\Agent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// The New Agents Orientation (agent_attributes.nao_*): an agent either attended one face to face — a proof photo and the date,
// waiting for their sponsor's approval — or watches the New Agents Webinar, which saves how far they got (no skipping ahead).
// nao_attendance_status keeps the legacy meaning: `yes` = sent a proof of attendance (approved once reviewed, which sets
// nao_video_tracker to 100 so statistics read it as finished), `disapproved`; watching the webinar leaves it NULL and only
// moves the %. Legacy also has `no`.
class NaoService
{
    public const ATTENDED = 'yes';

    public const DISAPPROVED = 'disapproved';

    // A save may move ahead by the time since the last one (at most MAX_GAP: the page saves every 30 s while playing) plus
    // GRACE, so a client can't jump to the end; a capped save catches up over the next ones.
    private const SAVE_MAX_GAP_SECONDS = 120;

    private const SAVE_GRACE_SECONDS = 20;

    // The last few seconds (end card) count as finished.
    private const END_SLACK_SECONDS = 5;

    public function __construct(private SaleFileStorage $files, private ActivityLogger $activity) {}

    /**
     * The NAO step's state for the onboarding page.
     *
     * @return array<string, mixed>
     */
    public function state(Agent $agent): array
    {
        $row = $this->attributes($agent);
        $status = $row?->nao_attendance_status ?: null;
        $progress = (int) ($row->nao_video_tracker ?? 0);

        return [
            // Where they are: done (100%), awaiting (proof sent, not reviewed), disapproved, webinar (chose it / started), choose.
            'stage' => match (true) {
                $progress >= 100 => 'done',
                $status === self::ATTENDED && ! $row->nao_attendance_reviewed_at => 'awaiting',
                $status === self::DISAPPROVED => 'disapproved',
                $row?->nao_video_saved_at !== null || (int) ($row->nao_video_seconds ?? 0) > 0 => 'webinar',
                default => 'choose',
            },
            'approved' => $status === self::ATTENDED && ($row?->nao_attendance_reviewed_at !== null || $progress >= 100),
            'status' => $status,
            'progress' => (int) ($row->nao_video_tracker ?? 0),
            'seconds' => (int) ($row->nao_video_seconds ?? 0),
            'attended_on' => $row?->nao_date_of_attendance,
            'proof' => $row?->nao_proof_of_attendance ?: null,
            // Why the sponsor didn't approve it (shown with a disapproval).
            'remarks' => $row?->nao_attendance_remarks ?? null,
            'submitted_at' => $row?->nao_attendance_submitted_at ? Carbon::parse($row->nao_attendance_submitted_at)->toIso8601String() : null,
            'video' => ['id' => config('nao.webinar.video_id'), 'seconds' => (int) config('nao.webinar.seconds')],
            'sponsor' => $this->sponsor($row?->referral_id ? (int) $row->referral_id : null),
        ];
    }

    public function finished(Agent $agent): bool
    {
        $row = $this->attributes($agent);

        return $row && (int) $row->nao_video_tracker >= 100;
    }

    // "Yes, I attended": the proof (photo, selfie or screenshot) and the date, for the sponsor to approve.
    public function submitAttendance(Agent $agent, UploadedFile $proof, string $attendedOn): void
    {
        $this->refuseIfFinished($agent);
        $url = $this->files->store($proof, "nao-proofs/{$agent->id}");
        try {
            $this->write($agent, [
                'nao_attendance_status' => self::ATTENDED,
                // A new proof is reviewed afresh (after a disapproval, or replacing one still waiting).
                'nao_attendance_reviewed_by' => null,
                'nao_attendance_reviewed_at' => null,
                'nao_attendance_remarks' => null,
                'nao_proof_of_attendance' => $url,
                'nao_date_of_attendance' => $attendedOn,
                'nao_attendance_submitted_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->files->discardUploaded();
            throw $e;
        }

        $this->activity->describe('nao.attendance_submitted', "Sent NAO attendance of {$attendedOn} for the sponsor's approval", $agent, ['proof' => $url]);
    }

    // "No, not yet": they'll watch the webinar (nao_video_saved_at set → the page opens on the player from now on).
    public function chooseWebinar(Agent $agent): void
    {
        $this->refuseIfFinished($agent);
        $row = $this->attributes($agent);
        $this->write($agent, [
            'nao_video_saved_at' => now(),
            // The webinar path keeps the status empty (a disapproved proof is set aside).
            ...($row?->nao_attendance_status === self::DISAPPROVED ? ['nao_attendance_status' => null] : []),
        ]);
    }

    /**
     * Saves how far into the webinar they got (only forward, and only as far as the time since the last save allows).
     *
     * @return int the % watched
     */
    public function saveProgress(Agent $agent, int $seconds): int
    {
        $row = $this->attributes($agent);
        $length = max(1, (int) config('nao.webinar.seconds'));
        $before = (int) ($row->nao_video_seconds ?? 0);
        $savedAt = $row?->nao_video_saved_at ? Carbon::parse($row->nao_video_saved_at) : null;
        $allowed = $before + ($savedAt ? min(self::SAVE_MAX_GAP_SECONDS, (int) $savedAt->diffInSeconds(now())) : 0) + self::SAVE_GRACE_SECONDS;

        $watched = min($length, max($before, min($seconds, $allowed)));
        if ($watched >= $length - self::END_SLACK_SECONDS) {
            $watched = $length;
        }
        $progress = max((int) ($row->nao_video_tracker ?? 0), (int) floor($watched * 100 / $length));

        $this->write($agent, [
            'nao_video_seconds' => $watched,
            'nao_video_tracker' => min(100, $progress),
            'nao_video_saved_at' => now(),
        ]);
        if ($progress >= 100 && (int) ($row->nao_video_tracker ?? 0) < 100) {
            $this->activity->describe('nao.webinar_finished', 'Finished the New Agents Webinar', $agent);
        }

        return min(100, $progress);
    }

    private function refuseIfFinished(Agent $agent): void
    {
        if ($this->finished($agent)) {
            throw ValidationException::withMessages(['nao' => 'Your NAO is already complete.']);
        }
    }

    /**
     * Who approves the attendance: the sponsor (agent_attributes.referral_id), with how to reach them.
     *
     * @return array{name: string, avatar: ?string, mobile: ?string, email: ?string}|null
     */
    private function sponsor(?int $id): ?array
    {
        $sponsor = $id ? Agent::with('user:id,name,email')->find($id) : null;
        if (! $sponsor) {
            return null;
        }

        return [
            'name' => trim("{$sponsor->first_name} {$sponsor->last_name}") ?: (string) $sponsor->user?->name,
            'avatar' => $sponsor->avatar,
            'mobile' => $sponsor->mobile ?: null,
            'email' => $sponsor->email ?: $sponsor->user?->email,
        ];
    }

    private function attributes(Agent $agent): ?object
    {
        return DB::table('agent_attributes')->where('agent_id', $agent->id)->first();
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private function write(Agent $agent, array $values): void
    {
        DB::table('agent_attributes')->updateOrInsert(['agent_id' => $agent->id], $values + ['updated_at' => now()]);
    }
}
