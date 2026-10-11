<?php

namespace App\Http\Requests\Portal\Management;

use Illuminate\Validation\Rule;

class TransferAgentRequest extends ManagementRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer', Rule::exists('teams', 'id')],
            'sub_team_id' => ['nullable', 'integer', Rule::exists('sub_teams', 'id')],
            'date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['team_id.required' => 'Pick the team to move the agent to.', 'date.before_or_equal' => "The transfer date can't be in the future."];
    }
}
