<?php

namespace App\Http\Requests\Portal\MyTeam;

use App\Services\TeamLeadershipService;
use Illuminate\Foundation\Http\FormRequest;

// Every change under My Team is for the leader of the team in the URL, and only for that team.
abstract class MyTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(TeamLeadershipService::class)->leadsTeam($this->user(), $this->route('team'));
    }
}
