<?php

namespace App\Http\Requests\Portal\MyTeam;

use Illuminate\Validation\Rule;

class MoveMemberRequest extends MyTeamRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        // Empty takes the member out of their sub-team (they stay on the team).
        return ['sub_team_id' => ['nullable', 'integer', Rule::exists('sub_teams', 'id')]];
    }
}
