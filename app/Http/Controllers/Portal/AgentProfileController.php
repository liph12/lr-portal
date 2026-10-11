<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\Agent;
use App\Models\Entities\Team;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Services\GlobalPartnerService;
use App\Services\OfficeService;
use App\Services\RecruitmentService;
use App\Services\SaleValidationService;
use App\Services\SalesReportService;
use App\Support\Areas;
use App\Support\SocialLinks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// A read-only agent profile, opened from the reports and the navbar search: for the back office (superadmin, admin,
// staff), the agent's own leaders, and the agent themself. Their sales need view_reports for the back office.
class AgentProfileController extends Controller
{
    public function __construct(private SalesReportService $reports) {}

    public function show(Request $request, Agent $agent)
    {
        $user = $request->user();
        abort_unless($this->canView($user, $agent), 403);

        $agent->load('user:id,name,email,status');
        $filters = $this->reports->filters(['view' => 'agents', 'agent_id' => $agent->id] + $request->only(['from', 'to', 'status']));

        $memberships = fn (string $table, string $groups, string $column) => DB::table("{$table} as m")
            ->join("{$groups} as g", 'g.id', '=', "m.{$column}")
            ->where('m.agent_id', $agent->id)
            ->orderByDesc('m.joined_at')
            ->get(['g.id', 'g.name', 'm.joined_at', 'm.transferred_at', 'm.status']);

        $profile = DB::table('agent_profiles')->where('agent_id', $agent->id)->first();
        $credentials = DB::table('agent_credentials')->where('agent_id', $agent->id)->first();
        $attributes = DB::table('agent_attributes')->where('agent_id', $agent->id)->first();

        // The upline: referral_id is the sponsor's member number, which is their agent id here.
        $sponsorId = $attributes?->referral_id ? (int) $attributes->referral_id : null;
        $sponsor = $sponsorId ? DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->where('a.id', $sponsorId)->first(['a.id', 'a.avatar', 'a.area', 'u.name', 'u.email']) : null;

        $seesSales = ! $user->hasAnyRole(UserPolicy::SEARCH_ROLES) || $user->can('view_reports');

        // The tax number stays with the back office and the agent themself, not with team leaders.
        $seesPrivate = $user->hasAnyRole(UserPolicy::SEARCH_ROLES) || $agent->user_id === $user->id;

        return inertia('Portal/Agents/Show', [
            'details' => [
                'first_name' => $agent->first_name,
                'middle_name' => $agent->middle_name,
                'last_name' => $agent->last_name,
                'gender' => $agent->gender === null ? null : ($agent->gender ? 'Male' : 'Female'),
                'marital_status' => $agent->marital_status,
                'phone' => $agent->phone,
                'address' => $agent->address,
                'signed_up' => $agent->created_at?->toDateString(),
                // Joined Leuterio Realty (legacy lr_joined) — often before the portal sign-up.
                'joined_lr' => $agent->lr_joined_at ? substr((string) $agent->lr_joined_at, 0, 10) : null,
                'about' => $profile?->about,
                'skills' => $profile?->skills,
                'work_experience' => $profile?->work_experience,
                'links' => array_filter([
                    'Facebook' => SocialLinks::facebook($profile?->facebook),
                    'LinkedIn' => $profile?->linkedin,
                    'WhatsApp' => $profile?->whatsapp,
                    'Twitter / X' => $profile?->twitter,
                ]),
                'tin' => $seesPrivate ? $credentials?->tax_identification_no : null,
                'tin_hidden' => ! $seesPrivate && filled($credentials?->tax_identification_no),
                'prc_expiration' => $credentials?->prc_expiration,
                'dhsud_expiration' => $credentials?->dhsud_expiration,
                'referral_link' => $attributes?->referral_link,
                'date_activated' => $agent->activated_at?->toDateString(),
                'nao' => min((int) ($attributes?->nao_video_tracker ?? 0), RecruitmentService::NAO_COMPLETE),
                'nao_attendance_status' => $attributes?->nao_attendance_status ?: null,
                'nao_date_of_attendance' => $attributes?->nao_date_of_attendance,
                'nao_proof_of_attendance' => $attributes?->nao_proof_of_attendance ?: null,
                'fire' => (int) ($attributes?->fire_certificates ?? 0),
                'direct_recruits' => DB::table('agent_attributes')->where('referral_id', $agent->id)->count(),
            ],
            'sponsor' => $sponsorId ? [
                'id' => $sponsorId,
                'name' => $sponsor?->name,
                'email' => $sponsor?->email,
                'avatar' => $sponsor?->avatar,
                'area' => $sponsor?->area ? Areas::name($sponsor->area) : null,
                // Only link when the reader could open that profile.
                'linkable' => $sponsor !== null && ($user->hasAnyRole(UserPolicy::SEARCH_ROLES) || $user->can('manage', Team::class) || $this->leadsAgent($user, Agent::find($sponsorId))),
            ] : null,

            'agent' => [
                'id' => $agent->id,
                'user_id' => $agent->user_id,
                'name' => $agent->user?->name ?? trim("{$agent->first_name} {$agent->last_name}"),
                'avatar' => $agent->avatar,
                'email' => $agent->user?->email ?? $agent->email,
                'mobile' => $agent->mobile,
                'status' => Agent::displayStatus($agent->user?->status, $agent->activity),
                'role' => $agent->user?->roles()->value('label'),
                'agent_type' => $agent->agent_type,
                'activity' => $agent->activity,
                'area' => $agent->area ? Areas::name($agent->area) : null,
                'city' => $agent->city,
                'state' => $agent->state,
                'country' => $agent->country,
                'country_code' => $agent->country_code,
            ],
            'teams' => $memberships('team_agents', 'teams', 'team_id'),
            'subTeams' => $memberships('sub_team_agents', 'sub_teams', 'sub_team_id'),
            'filters' => $filters,
            'summary' => $seesSales ? fn () => $this->reports->summary($filters) : null,
        ]);
    }

    // One agent's sales one by one (with statistics): the same people who may open the profile, and for the back office
    // only with view_reports (like the profile's Sales section).
    public function sales(Request $request, Agent $agent)
    {
        $user = $request->user();
        abort_unless($this->canView($user, $agent) && (! $user->hasAnyRole(UserPolicy::SEARCH_ROLES) || $user->can('view_reports')), 403);

        // Locked to this agent: the URL can't point it at anyone else.
        $filters = $this->reports->lockedFilters(['view' => 'agents', 'list' => 'sales'] + $request->query(), ['agent_id' => $agent->id]);
        $agent->load('user:id,name');

        return inertia('Portal/Agents/Sales', [
            'agent' => ['id' => $agent->id, 'name' => $agent->user?->name ?? trim("{$agent->first_name} {$agent->last_name}"), 'avatar' => $agent->avatar, 'area' => $agent->area ? Areas::name($agent->area) : null],
            'filters' => $filters,
            'summary' => fn () => $this->reports->summary($filters),
            'totals' => fn () => $this->reports->categoryTotals($filters),
            'saleList' => function () use ($filters) {
                $page = $this->reports->saleList($filters);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
            'saleDetail' => fn () => ($sale = (int) $request->query('sale')) && $this->reports->containsSale($filters, $sale)
                ? app(SaleValidationService::class)->detail($sale)
                : null,
            'options' => ['categories' => SalesReportService::CATEGORIES, 'statuses' => SalesReportService::STATUSES],
        ]);
    }

    // Who may open an agent's profile: the back office, team managers, the agent, their leaders, their office's secretary
    // and, for a global partner, their sponsor.
    private function canView(User $user, Agent $agent): bool
    {
        return $user->hasAnyRole(UserPolicy::SEARCH_ROLES)
            || $user->can('manage', Team::class)
            || $agent->user_id === $user->id
            || $this->leadsAgent($user, $agent)
            || ($agent->area && in_array($agent->area, app(OfficeService::class)->areasFor($user), true))
            || app(GlobalPartnerService::class)->canManage($user, $agent);
    }

    // Team leaders and unit managers may open the profiles of their own active members.
    private function leadsAgent(User $user, Agent $agent): bool
    {
        $mine = $user->agent()->value('id');

        return $mine && (
            DB::table('team_agents as m')->join('teams as t', 't.id', '=', 'm.team_id')->where('m.agent_id', $agent->id)->where('m.status', 'active')->where('t.agent_id', $mine)->exists()
            || DB::table('sub_team_agents as m')->join('sub_teams as s', 's.id', '=', 'm.sub_team_id')->where('m.agent_id', $agent->id)->where('m.status', 'active')->where('s.agent_id', $mine)->exists()
        );
    }
}
