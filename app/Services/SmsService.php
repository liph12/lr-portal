<?php

namespace App\Services;

use App\Jobs\SendSmsBlast;
use App\Models\User;
use App\Support\SmsText;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// SMS Manager: a message to whole groups (people by role — agents, unit managers, team leaders, staff, …) and / or typed-in
// numbers, sent through Semaphore by a queued job. An SMS manager reaches every active user nationwide and sends on the company's
// balance; anyone else allowed to send (team leaders) reaches the current members of the teams / sub-teams they lead and pays
// with their own credits.
class SmsService
{
    public function __construct(private TeamLeadershipService $leadership, private SmsCreditService $credits, private ActivityLogger $activity) {}

    public function manages(User $user): bool
    {
        return $user->can('manage_sms');
    }

    /**
     * The groups one can send to: each role with how many people in reach have a mobile number on record.
     *
     * @return array<int, array{role: string, label: string, count: int}>
     */
    public function groups(User $user): array
    {
        return $this->people($user)
            ->groupBy('roles.name', 'roles.label')
            ->orderByRaw('COUNT(DISTINCT users.id) DESC')
            ->get(['roles.name as role', 'roles.label', DB::raw('COUNT(DISTINCT users.id) as count')])
            ->map(fn ($r) => ['role' => $r->role, 'label' => $r->label, 'count' => (int) $r->count])
            ->all();
    }

    /**
     * The people of one group (role) in reach whose mobile number is usable, by name: the recipient list fills with them.
     *
     * @return array<int, array{id: int, name: string, mobile: string, role: string, label: string}>
     */
    public function members(User $user, string $role): array
    {
        return $this->contacts($this->people($user)->where('roles.name', $role)->orderBy('users.name'));
    }

    /**
     * People in reach to add one by one, by name, email, mobile or member number (at most 20).
     *
     * @return array<int, array{id: int, name: string, mobile: string, role: string, label: string}>
     */
    public function search(User $user, string $text): array
    {
        $text = trim($text);
        if (mb_strlen($text) < 2) {
            return [];
        }
        $digits = preg_replace('/\D/', '', $text);
        $query = $this->people($user)->where(function ($q) use ($text, $digits) {
            $q->where('users.name', 'like', "%{$text}%")->orWhere('users.email', 'like', "%{$text}%");
            if (strlen($digits) >= 4) {
                // The digits as one run, whatever separators the record has, without the 0 / 63 in front.
                $needle = ltrim(preg_replace('/^63/', '', $digits), '0');
                $q->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(agents.mobile, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') LIKE ?", ['%'.$needle.'%'])
                    ->orWhere('agents.id', (int) $digits);
            }
        })->orderBy('users.name')->limit(40);

        return array_slice($this->contacts($query), 0, 20);
    }

    /**
     * Everyone a message would go to, by number (once each): the chosen people still in reach, then the typed-in numbers.
     *
     * @param  int[]  $people  user ids
     * @param  string[]  $custom  normalised numbers
     * @return array<string, ?int> number => user id (null for a typed-in number)
     */
    public function recipients(User $user, array $people, array $custom): array
    {
        $numbers = [];
        foreach (array_chunk(array_values(array_unique($people)), 1000) as $ids) {
            foreach ($this->contacts($this->people($user)->whereIn('users.id', $ids)->orderBy('users.id')) as $p) {
                $numbers[$p['mobile']] ??= $p['id'];
            }
        }
        foreach ($custom as $n) {
            $numbers[$n] ??= null;
        }

        return $numbers;
    }

    /**
     * Of these user ids, the ones this user may text (in reach, with a usable number).
     *
     * @param  int[]  $people
     * @return int[]
     */
    public function reachable(User $user, array $people): array
    {
        $found = [];
        foreach (array_chunk(array_values(array_unique($people)), 1000) as $ids) {
            foreach ($this->contacts($this->people($user)->whereIn('users.id', $ids)) as $p) {
                $found[$p['id']] = $p['id'];
            }
        }

        return array_values($found);
    }

    /**
     * Queues a message: charges the credits (unless it's on the company), records it and its recipients, and hands it to the job.
     *
     * @param  string[]  $roles  the groups ticked (for the record)
     * @param  int[]  $people  user ids
     * @param  string[]  $custom
     */
    public function send(User $user, string $message, array $roles, array $people, array $custom): int
    {
        $recipients = $this->recipients($user, $people, $custom);
        $parts = SmsText::parts($message);
        $charged = ! $this->manages($user);

        $blastId = DB::transaction(function () use ($user, $message, $roles, $custom, $recipients, $parts, $charged) {
            $id = DB::table('sms_blasts')->insertGetId([
                'user_id' => $user->id, 'message' => $message, 'groups' => json_encode(array_values($roles)), 'custom_numbers' => count($custom),
                'recipients' => count($recipients), 'parts' => $parts, 'credits' => count($recipients) * $parts, 'charged' => $charged,
                'status' => 'queued', 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($charged) {
                $this->credits->charge($user, count($recipients) * $parts, $id);
            }
            foreach (array_chunk($recipients, 1000, true) as $chunk) {
                DB::table('sms_blast_recipients')->insert(array_map(fn ($number, $userId) => [
                    'sms_blast_id' => $id, 'mobile' => $number, 'user_id' => $userId, 'status' => 'queued', 'created_at' => now(), 'updated_at' => now(),
                ], array_map('strval', array_keys($chunk)), $chunk));
            }

            return $id;
        });

        $this->activity->describe('sms.sent', 'Sent a text message to '.count($recipients).' '.(count($recipients) === 1 ? 'number' : 'numbers'), $user, ['blast' => $blastId]);
        // One Semaphore call's worth goes out right after the response (no queue worker needed); bigger sends go to the queue.
        count($recipients) <= SemaphoreClient::MAX_NUMBERS ? SendSmsBlast::dispatchAfterResponse($blastId) : SendSmsBlast::dispatch($blastId);

        return $blastId;
    }

    /**
     * Messages sent: everyone's for an SMS manager, else one's own; newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function history(User $user): array
    {
        $labels = DB::table('roles')->pluck('label', 'name');

        return DB::table('sms_blasts as b')->join('users as u', 'u.id', '=', 'b.user_id')
            ->when(! $this->manages($user), fn ($q) => $q->where('b.user_id', $user->id))
            ->orderByDesc('b.id')->limit(100)
            ->get(['b.id', 'u.name as sender', 'b.message', 'b.groups', 'b.custom_numbers', 'b.recipients', 'b.parts', 'b.credits', 'b.charged', 'b.status', 'b.sent', 'b.failed', 'b.error', 'b.created_at'])
            ->map(fn ($b) => [
                ...(array) $b,
                'groups' => array_map(fn ($r) => $labels[$r] ?? $r, json_decode((string) $b->groups, true) ?: []),
                'charged' => (bool) $b->charged,
                'created_at' => Carbon::parse($b->created_at)->toIso8601String(),
            ])->all();
    }

    /**
     * @return array<int, array{id: int, name: string, mobile: string, role: string, label: string}>
     */
    private function contacts(Builder $query): array
    {
        $rows = [];
        foreach ($query->get(['users.id', 'users.name', 'agents.mobile', 'roles.name as role', 'roles.label']) as $p) {
            if ($mobile = SmsText::mobile($p->mobile)) {
                $rows[] = ['id' => (int) $p->id, 'name' => $p->name, 'mobile' => $mobile, 'role' => $p->role, 'label' => $p->label];
            }
        }

        return $rows;
    }

    // Active users with a mobile number on record, joined to their role — everyone for an SMS manager, else the members of the
    // groups the user leads (nobody when they lead none: they can still type numbers in).
    private function people(User $user): Builder
    {
        $query = DB::table('users')
            ->join('role_user', 'role_user.user_id', '=', 'users.id')
            ->join('roles', 'roles.id', '=', 'role_user.role_id')
            ->join('agents', 'agents.user_id', '=', 'users.id')
            ->where('users.status', 'active')
            ->whereNotNull('agents.mobile')->where('agents.mobile', '<>', '');
        if (! $this->manages($user)) {
            $members = $this->leadership->ledMemberIds($user);
            $members ? $query->whereIn('agents.id', $members) : $query->whereRaw('1 = 0');
        }

        return $query;
    }
}
