<?php

namespace App\Services;

use App\Support\SocialLinks;
use Illuminate\Support\Facades\DB;

class PersonDetailsService
{
    public function __construct(private AgentActivityService $activity) {}

    /**
     * What the search results and Management › Agents show about each person: team / sub-team (and since when), registration, licences,
     * contact and their 6-month activity window.
     *
     * @param  int[]  $agentIds
     * @return array<int, array<string, mixed>>
     */
    public function for(array $agentIds): array
    {
        if (! $agentIds) {
            return [];
        }

        $rows = DB::table('agents as a')
            ->leftJoin('agent_credentials as c', 'c.agent_id', '=', 'a.id')
            ->leftJoin('team_agents as ta', fn ($j) => $j->on('ta.agent_id', '=', 'a.id')->where('ta.status', 'active'))
            ->leftJoin('teams as t', 't.id', '=', 'ta.team_id')
            ->leftJoin('sub_team_agents as sa', fn ($j) => $j->on('sa.agent_id', '=', 'a.id')->where('sa.status', 'active'))
            ->leftJoin('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->leftJoin('agent_attributes as at', 'at.agent_id', '=', 'a.id')
            ->leftJoin('agent_profiles as pr', 'pr.agent_id', '=', 'a.id')
            ->whereIn('a.id', $agentIds)
            ->get(['a.id', 'a.created_at', 'a.lr_joined_at', 'a.mobile', 'a.phone', 'a.address', 'a.city', 'a.state', 'c.prc_expiration', 'c.dhsud_expiration',
                't.name as team', 'ta.joined_at as team_joined', 's.name as sub_team', 'sa.joined_at as sub_team_joined', 'at.fire_certificates', 'pr.facebook'])
            ->keyBy('id');
        $windows = $this->activity->windows($agentIds);
        // How many sales each has (valid or pending, international too) — so a row shows at a glance who has sold.
        $sales = DB::table('agent_transactions')->whereIn('agent_id', $agentIds)->whereIn('sale_status', ['valid', 'pending'])
            ->selectRaw('agent_id, COUNT(*) as n')->groupBy('agent_id')->pluck('n', 'agent_id');
        $international = DB::table('international_sales')->whereIn('agent_id', $agentIds)->whereIn('sale_status', ['valid', 'pending'])
            ->selectRaw('agent_id, COUNT(*) as n')->groupBy('agent_id')->pluck('n', 'agent_id');

        return $rows->map(fn ($r) => [
            'team' => $r->team,
            'team_joined' => $r->team_joined ? substr((string) $r->team_joined, 0, 10) : null,
            'sub_team' => $r->sub_team,
            'sub_team_joined' => $r->sub_team_joined ? substr((string) $r->sub_team_joined, 0, 10) : null,
            // Joined Leuterio Realty (legacy lr_joined), else the portal sign-up.
            'registered' => $r->lr_joined_at ? substr((string) $r->lr_joined_at, 0, 10) : ($r->created_at ? substr((string) $r->created_at, 0, 10) : null),
            'mobile' => $r->mobile ?: $r->phone,
            'address' => collect([$r->address, $r->city, $r->state])->filter()->unique()->implode(', ') ?: null,
            'prc_expiration' => $r->prc_expiration,
            'dhsud_expiration' => $r->dhsud_expiration,
            'fire_count' => (int) ($r->fire_certificates ?? 0),
            'facebook' => SocialLinks::facebook($r->facebook),
            'sales' => (int) ($sales[$r->id] ?? 0) + (int) ($international[$r->id] ?? 0),
            'activity' => $windows[$r->id] ?? null,
        ])->all();
    }
}
