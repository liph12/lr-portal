<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\Entities\Team;
use Illuminate\Validation\Rule;

// Shared by teams and sub-teams.
class ChangeTeamStatusRequest extends ManagementRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(Team::STATUSES)]];
    }
}
