<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\Entities\Agent;
use Illuminate\Validation\Rule;

// Same reach as changing an agent's status: admins can't touch admins or superadmins.
class ChangeAgentTypeRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        $user = $this->route('agent')->user;

        // Local or global partner is part of the agent's designation.
        return $this->allows('edit_designation') && $user && $this->user()->can('updateStatus', $user);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['agent_type' => ['required', Rule::in(Agent::TYPES)]];
    }
}
