<?php

namespace App\Http\Requests\Portal\MyTeam;

use App\Models\Entities\Team;
use Illuminate\Validation\Rule;

class SaveSubTeamRequest extends MyTeamRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
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
        return ['agent_id.required' => 'Pick the unit manager.'];
    }
}
