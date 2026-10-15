<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// SMS credits of senders who pay for their own messages (team leaders): one credit = one SMS part to one number. They buy
// them outside the app (any payment) and send the proof; an SMS manager approves the credits. The balance is the ledger's sum.
class SmsCreditService
{
    public const STATUSES = ['pending', 'approved', 'disapproved'];

    public function __construct(private SaleFileStorage $files, private ActivityLogger $activity) {}

    public function balance(User $user): int
    {
        return (int) DB::table('sms_credit_ledger')->where('user_id', $user->id)->sum('change');
    }

    public function request(User $user, int $credits, UploadedFile $proof, ?string $notes): void
    {
        $url = $this->files->store($proof, "sms-payments/{$user->id}");
        try {
            $id = DB::table('sms_credit_requests')->insertGetId([
                'user_id' => $user->id, 'credits' => $credits, 'proof_of_payment' => $url, 'notes' => $notes ?: null,
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->files->discardUploaded();
            throw $e;
        }

        $this->activity->describe('sms.credits_requested', "Requested {$credits} SMS credits", $user, ['request' => $id, 'proof' => $url]);
    }

    public function approve(int $requestId, User $reviewer, int $credits): void
    {
        DB::transaction(function () use ($requestId, $reviewer, $credits) {
            $row = $this->pending($requestId);
            DB::table('sms_credit_requests')->where('id', $row->id)->update([
                'status' => 'approved', 'credits_granted' => $credits, 'reviewed_by' => $reviewer->id, 'reviewed_at' => now(), 'remarks' => null, 'updated_at' => now(),
            ]);
            $this->record($row->user_id, $credits, 'purchase', requestId: $row->id);
        });
        $this->activity->describe('sms.credits_approved', "Approved {$credits} SMS credits", User::find(DB::table('sms_credit_requests')->where('id', $requestId)->value('user_id')), ['request' => $requestId]);
    }

    public function disapprove(int $requestId, User $reviewer, string $remarks): void
    {
        $row = $this->pending($requestId);
        DB::table('sms_credit_requests')->where('id', $row->id)->update([
            'status' => 'disapproved', 'reviewed_by' => $reviewer->id, 'reviewed_at' => now(), 'remarks' => $remarks, 'updated_at' => now(),
        ]);
        $this->activity->describe('sms.credits_disapproved', 'Disapproved an SMS credit request', User::find($row->user_id), ['request' => $row->id, 'remarks' => $remarks]);
    }

    // Takes the credits for a send, or refuses when there aren't enough (the user's row is locked so two sends can't both spend them).
    public function charge(User $user, int $credits, int $blastId): void
    {
        DB::transaction(function () use ($user, $credits, $blastId) {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->value('id');
            if ($this->balance($user) < $credits) {
                throw ValidationException::withMessages(['message' => "This needs {$credits} credits; you have {$this->balance($user)}. Request more credits first."]);
            }
            $this->record($user->id, -$credits, 'send', blastId: $blastId);
        });
    }

    // Credits of the messages Semaphore didn't take go back.
    public function refund(int $userId, int $credits, int $blastId): void
    {
        if ($credits > 0) {
            $this->record($userId, $credits, 'refund', blastId: $blastId);
        }
    }

    // Credit requests waiting, for the menu badge: only for SMS managers (null = not one).
    public function pendingCount(User $user): ?int
    {
        return $user->can('manage_sms') ? DB::table('sms_credit_requests')->where('status', 'pending')->count() : null;
    }

    /**
     * Credit requests: everyone's for an SMS manager, else the user's own; newest first, waiting ones first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function requests(User $user, ?string $status = null): array
    {
        return DB::table('sms_credit_requests as r')
            ->join('users as u', 'u.id', '=', 'r.user_id')
            ->leftJoin('users as rv', 'rv.id', '=', 'r.reviewed_by')
            ->leftJoin('agents as a', 'a.user_id', '=', 'u.id')
            ->when(! $user->can('manage_sms'), fn ($q) => $q->where('r.user_id', $user->id))
            ->when($status, fn ($q) => $q->where('r.status', $status))
            ->orderByRaw("CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END")->orderByDesc('r.created_at')->orderByDesc('r.id')
            ->limit(200)
            ->get(['r.id', 'r.user_id', 'u.name', 'a.avatar', 'r.credits', 'r.credits_granted', 'r.proof_of_payment', 'r.notes', 'r.status', 'r.remarks', 'r.created_at', 'r.reviewed_at', 'rv.name as reviewed_by'])
            ->map(fn ($r) => (array) $r + ['created_at' => Carbon::parse($r->created_at)->toIso8601String()])
            ->map(fn ($r) => ['reviewed_at' => $r['reviewed_at'] ? Carbon::parse($r['reviewed_at'])->toIso8601String() : null] + $r)
            ->all();
    }

    /**
     * The user's latest credit movements.
     *
     * @return array<int, array{id: int, change: int, reason: string, created_at: string}>
     */
    public function ledger(User $user): array
    {
        return DB::table('sms_credit_ledger')->where('user_id', $user->id)->orderByDesc('id')->limit(50)->get(['id', 'change', 'reason', 'created_at'])
            ->map(fn ($r) => ['id' => $r->id, 'change' => (int) $r->change, 'reason' => $r->reason, 'created_at' => Carbon::parse($r->created_at)->toIso8601String()])->all();
    }

    private function pending(int $requestId): object
    {
        $row = DB::table('sms_credit_requests')->where('id', $requestId)->lockForUpdate()->first();
        if (! $row || $row->status !== 'pending') {
            throw ValidationException::withMessages(['request' => 'That credit request was already reviewed.']);
        }

        return $row;
    }

    private function record(int $userId, int $change, string $reason, ?int $requestId = null, ?int $blastId = null): void
    {
        DB::table('sms_credit_ledger')->insert([
            'user_id' => $userId, 'change' => $change, 'reason' => $reason, 'sms_credit_request_id' => $requestId, 'sms_blast_id' => $blastId,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
