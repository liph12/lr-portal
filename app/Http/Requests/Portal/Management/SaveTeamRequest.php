<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\Entities\Team;
use Illuminate\Validation\Rule;

class SaveTeamRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        return $this->allows('edit_teams');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('teams', 'name')->ignore($this->route('team'))],
            'agent_id' => ['required', 'integer', Rule::exists('agents', 'id')],
            'status' => ['required', Rule::in(Team::STATUSES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['agent_id.required' => 'Pick the team leader.', 'name.unique' => 'Another team already has this name.'];
    }
}
