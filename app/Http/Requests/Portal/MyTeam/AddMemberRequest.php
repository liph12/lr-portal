<?php

namespace App\Http\Requests\Portal\MyTeam;

use Illuminate\Validation\Rule;

class AddMemberRequest extends MyTeamRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'agent_id' => ['required', 'integer', Rule::exists('agents', 'id')],
            'sub_team_id' => ['nullable', 'integer', Rule::exists('sub_teams', 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['agent_id.required' => 'Pick the agent to add.'];
    }
}
