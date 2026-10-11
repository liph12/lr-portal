<?php

namespace App\Http\Middleware;

use App\Models\Entities\Team;
use App\Models\Role;
use App\Models\User;
use App\Services\GroupSearchService;
use App\Services\ImpersonationService;
use App\Services\TeamLeadershipService;
use App\Services\LeaderboardService;
use App\Services\OnlineUsersService;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => fn () => $request->user() ? [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                // For greetings: the agent profile's first name, else the account name's first word.
                'first_name' => $request->user()->agent()->value('first_name') ?: Str::before(trim($request->user()->name), ' '),
                'email' => $request->user()->email,
                'role' => $request->user()->actingRole()?->label,
                // Set while a superadmin previews another role; the banner offers the way back.
                'viewing_as' => $request->user()->viewingAs()?->label,
                // Set while a superadmin is signed in as this user; the banner offers the way back.
                'impersonator' => ($impersonator = app(ImpersonationService::class)->impersonator($request)) ? ['id' => $impersonator->id, 'name' => $impersonator->name] : null,
                // Teams / sub-teams this user leads: drives the My Team menu and its switcher.
                'leads' => app(TeamLeadershipService::class)->summaryFor($request->user()),
                'view_as_roles' => $request->user()->reallyHasRole(Role::SUPERADMIN)
                    ? Role::where('name', '!=', Role::SUPERADMIN)->orderBy('label')->get(['name', 'label'])
                    : [],
                'portal' => $request->user()->portal(),
                'home' => $request->user()->homeUrl(),
                // Drives which menu items and quick links appear; the routes enforce the same gates.
                'permissions' => $request->user()->permissions()->pluck('name')->values(),
                'avatar' => $request->user()->agent()->value('avatar'),
                // Imported agents keep their legacy member id, which is also their referral number.
                'agent_id' => $request->user()->agent()->value('id'),
                'can' => [
                    'access_superadmin' => $request->user()->hasRole(Role::SUPERADMIN),
                    'search_users' => $request->user()->can('search', User::class),
                    'manage_users' => $request->user()->can('manage', User::class),
                    // Teams / sub-teams / areas in the navbar search (same reach as the reports).
                    'search_groups' => app(GroupSearchService::class)->canSearch($request->user()),
                    'view_leaderboards' => $request->user()->can(LeaderboardService::PERMISSION),
                    'view_as' => $request->user()->reallyHasRole(Role::SUPERADMIN),
                    'impersonate' => $request->user()->reallyHasRole(Role::SUPERADMIN) && ! $request->session()->has(ImpersonationService::SESSION_KEY),
                    'manage_teams' => $request->user()->can('manage', Team::class),
                ],
            ] : null,
            // Everyone sees who's online (same as the realtime presence channel); this adds "last seen".
            'online_users' => fn () => $request->user()
                ? app(OnlineUsersService::class)->recentlyActive($request->user()->id)
                : [],
            // Optional: never computed on normal visits, only when the leaderboard panel asks for it with a
            // partial reload — and only for roles granted the permission.
            'leaderboards' => Inertia::optional(fn () => $request->user()?->can(LeaderboardService::PERMISSION)
                ? app(LeaderboardService::class)->recentMonths($request->user()->hasAnyRole(LeaderboardService::AMOUNT_ROLES))
                : null),
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
            ],
        ];
    }
}
