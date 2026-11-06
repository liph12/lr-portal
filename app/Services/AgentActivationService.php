<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// FIRE completes an agent's activation (replacing the old "activated with the first sale" step): the account goes live
// the moment FIRE is done, for an agent who has never sold. AgentActivityService then gives them
// Agent::FIRE_DEACTIVATE_AFTER_MONTHS to land a first sale before it reads as dormant — a sale still reactivates on its
// own; ReactivationRequestService::approve is the other way back, through this service.
class AgentActivationService
{
    private const SALE_TABLES = ['agent_project_transactions', 'agent_rental_transactions', 'agent_brokerage_transactions'];

    public function __construct(private AgentActivityService $agentActivity, private ActivityLogger $activity) {}

    public function activateOnFireCompletion(Agent $agent): void
    {
        $row = DB::table('agent_attributes')->where('agent_id', $agent->id)->first(['fire_activated_at']);
        if (! $row || $row->fire_activated_at || $this->hasSold($agent->id)) {
            return;
        }
        DB::table('agent_attributes')->where('agent_id', $agent->id)->update(['fire_activated_at' => now(), 'updated_at' => now()]);
        $this->agentActivity->refresh([$agent->id]);
        $agent->loadMissing('user:id,name');
        $this->activity->describe('agent.fire_activated', ($agent->user?->name ?? 'The agent')."'s LR account activated — FIRE complete", $agent);
    }

    // Approving a reactivation request: restart the FIRE-triggered window, the same way AgentActivityService's general
    // rule restarts on a manual reactivation (UserAccountService::changeStatus).
    public function reactivate(Agent $agent, User $by): void
    {
        DB::table('agent_attributes')->where('agent_id', $agent->id)->update(['fire_activated_at' => now(), 'updated_at' => now()]);
        $this->agentActivity->refresh([$agent->id]);
        $agent->loadMissing('user:id,name');
        $this->activity->describe('agent.reactivated', "Reactivated {$agent->user?->name} (no sale since FIRE)", $agent, ['reviewed_by' => $by->id]);
    }

    private function hasSold(int $agentId): bool
    {
        foreach (self::SALE_TABLES as $table) {
            if (DB::table('agent_transactions as t')->join("{$table} as c", 'c.agent_transaction_id', '=', 't.id')
                ->where('t.agent_id', $agentId)->whereIn('t.sale_status', ['valid', 'pending'])->exists()) {
                return true;
            }
        }

        return DB::table('international_sales')->where('agent_id', $agentId)->whereIn('sale_status', ['valid', 'pending'])->exists();
    }
}
