<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

// Management › Agents › Designation: promote to unit manager (by rate = designation only; by dashboard = the Unit
// Manager role and its dashboard) and mark brokers, each from a date.
class AgentDesignationService
{
    // Roles that may be promoted to Unit Manager by dashboard (or put back from it).
    private const PROMOTABLE_ROLES = ['agent', 'global_partner', 'unit_manager'];

    public function __construct(private RolePermissionService $roles, private ActivityLogger $activity) {}

    /**
     * @param  array{unit_manager_by: string, unit_manager_since?: ?string, is_broker: bool|string, broker_since?: ?string}  $data  validated UpdateDesignationRequest input
     */
    public function update(User $actor, Agent $agent, array $data): void
    {
        $user = $agent->user;
        $role = $user->roles()->first();
        $um = in_array($data['unit_manager_by'], Agent::UM_BASES, true) ? $data['unit_manager_by'] : null;
        $broker = filter_var($data['is_broker'], FILTER_VALIDATE_BOOLEAN);

        $roleChanges = ($um === Agent::UM_BY_DASHBOARD) !== ($role?->name === 'unit_manager');
        if ($roleChanges && ! in_array($role?->name, self::PROMOTABLE_ROLES, true)) {
            throw ValidationException::withMessages([
                'unit_manager_by' => "{$user->name} is a ".($role?->label ?? 'user without a role').'; only agents can be made Unit Manager by dashboard.',
            ]);
        }

        DB::transaction(function () use ($actor, $agent, $user, $um, $broker, $data, $roleChanges) {
            if ($roleChanges) {
                // By dashboard = the Unit Manager role; leaving it (by rate, or none) goes back to Agent.
                $this->roles->assignRole($actor, $user, Role::where('name', $um === Agent::UM_BY_DASHBOARD ? 'unit_manager' : 'agent')->firstOrFail());
            }
            $agent->forceFill([
                'unit_manager_by' => $um,
                'unit_manager_since' => $um ? $data['unit_manager_since'] : null,
                'is_broker' => $broker,
                'broker_since' => $broker ? $data['broker_since'] : null,
            ])->save();
        });

        $parts = [
            $um ? "Unit Manager by {$um} from {$data['unit_manager_since']}" : 'not a Unit Manager',
            $broker ? "broker from {$data['broker_since']}" : 'not a broker',
        ];
        $this->activity->describe('agent.designation_changed', "Set {$user->name}: ".implode(', ', $parts), $agent, [
            'unit_manager_by' => $um, 'unit_manager_since' => $um ? $data['unit_manager_since'] : null,
            'is_broker' => $broker, 'broker_since' => $broker ? $data['broker_since'] : null,
        ]);
    }
}
