<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\Entities\Team;
use Illuminate\Validation\Rule;

class SaveSubTeamRequest extends ManagementRequest
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
            'team_id' => ['required', 'integer', Rule::exists('teams', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'agent_id' => ['required', 'integer', Rule::exists('agents', 'id')],
            'status' => ['required', Rule::in(Team::STATUSES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['agent_id.required' => 'Pick the sub-team leader.', 'team_id.required' => 'Pick the team it belongs to.'];
    }
}
