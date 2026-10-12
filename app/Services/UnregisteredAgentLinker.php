<?php

namespace App\Services;

use App\Models\Entities\Agent;
use Illuminate\Support\Facades\DB;

// Rentals closed by an agent with no LR account yet are kept under their name, email and mobile. Once an account with that
// email (or mobile) exists, the rental becomes theirs: the closing agent and the sale's credit both point at them.
class UnregisteredAgentLinker
{
    public function __construct(private AgentActivityService $activity) {}

    // Digits only, last 10 (09171234567, +639171234567 and 9171234567 are the same number).
    public static function mobileKey(?string $mobile): string
    {
        return substr(preg_replace('/\D/', '', (string) $mobile), -10);
    }

    // Links the waiting rentals to this agent; returns how many.
    public function link(Agent $agent): int
    {
        $email = strtolower(trim((string) ($agent->user?->email ?? $agent->email)));
        $mobile = self::mobileKey($agent->mobile ?: $agent->phone);
        if ($email === '' && $mobile === '') {
            return 0;
        }

        $waiting = DB::table('agent_rental_transactions')->whereNull('closing_agent_id')
            ->where(fn ($q) => $q->when($email !== '', fn ($w) => $w->orWhere('unregistered_agent_email', $email))
                ->when(strlen($mobile) === 10, fn ($w) => $w->orWhere('unregistered_agent_mobile', $mobile)))
            ->whereNotNull('unregistered_agent_email');
        $saleIds = (clone $waiting)->pluck('agent_transaction_id');
        if ($saleIds->isEmpty()) {
            return 0;
        }

        DB::transaction(function () use ($waiting, $saleIds, $agent) {
            $waiting->update(['closing_agent_id' => $agent->id]);
            DB::table('agent_transactions')->whereIn('id', $saleIds)->whereNull('agent_id')->update(['agent_id' => $agent->id]);
        });
        $this->activity->refresh([$agent->id]);

        return $saleIds->count();
    }

    // Every agent who now matches a waiting rental (after imports, which write agents without model events).
    public function linkAll(): int
    {
        $linked = 0;
        $emails = DB::table('agent_rental_transactions')->whereNull('closing_agent_id')->whereNotNull('unregistered_agent_email')->pluck('unregistered_agent_email')->unique();
        $mobiles = DB::table('agent_rental_transactions')->whereNull('closing_agent_id')->whereNotNull('unregistered_agent_mobile')->pluck('unregistered_agent_mobile')->unique()->all();
        $candidates = Agent::with('user:id,email')
            ->where(fn ($q) => $q->whereHas('user', fn ($u) => $u->whereIn(DB::raw('LOWER(email)'), $emails))->orWhereIn('email', $emails))
            ->get();
        foreach ($candidates as $agent) {
            $linked += $this->link($agent);
        }
        if ($mobiles) {
            Agent::whereNotNull('mobile')->get(['id', 'user_id', 'email', 'mobile', 'phone'])
                ->filter(fn ($a) => in_array(self::mobileKey($a->mobile), $mobiles, true))
                ->each(function ($agent) use (&$linked) {
                    $linked += $this->link($agent);
                });
        }

        return $linked;
    }
}
