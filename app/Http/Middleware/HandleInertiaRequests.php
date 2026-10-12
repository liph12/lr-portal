<?php

namespace App\Http\Middleware;

use App\Models\Entities\Team;
use App\Models\Role;
use App\Models\User;
use App\Services\CommissionReceivingService;
use App\Services\ContactLinkService;
use App\Services\GlobalPartnerService;
use App\Services\GroupSearchService;
use App\Services\ImpersonationService;
use App\Services\OfficeService;
use App\Services\TeamLeadershipService;
use App\Services\UserPreferenceService;
use App\Services\LeaderboardService;
use App\Services\OnlineUsersService;
use App\Services\SaleValidationService;
use App\Support\Areas;
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
                // Global partners in reach (everyone's for the back office, their invites for a sponsor) and how many wait
                // for confirmation: the menu item and its badge.
                'global_partners' => ($gp = app(GlobalPartnerService::class))->reach($request->user()) === false
                    ? null
                    : ['pending' => $gp->pendingCount($request->user())],
                // Pending sales this user can validate (all for the back office, their area's for a secretary), any date:
                // the Sales validation menu badge. Null when they don't validate sales.
                'sales_validation' => ($pending = app(SaleValidationService::class)->pendingCount($request->user())) === null
                    ? null
                    : ['pending' => $pending],
                // Commission slips waiting to be received within reach, per category the user receives: the Brokerage and
                // Rental receiving menu items and their badges; null when the user receives neither.
                'commission_receiving' => app(CommissionReceivingService::class)->awaiting($request->user()),
                // Areas of the offices this user is the secretary of: their sales validation and statistics reach.
                'office_areas' => collect(app(OfficeService::class)->areasFor($request->user()))->map(fn ($a) => Areas::name($a))->values(),
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
                // The public contact page's path (Your links); null until the account has an agent record.
                'contact_url' => app(ContactLinkService::class)->urlFor($request->user()),
                // Settings › Preferences (links, theme, text size); null without use_preferences = defaults.
                'preferences' => app(UserPreferenceService::class)->sharedFor($request->user()),
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
            // Shown as a toast (AppFeedback): ->with('success' | 'warning' | 'error', '…') on a redirect.
            'flash' => function () use ($request) {
                $flash = [
                    'success' => $request->session()->get('success'),
                    'warning' => $request->session()->get('warning'),
                    'error' => $request->session()->get('error'),
                ];

                // Partial reloads keep the last page's props, flash included; the id lets the UI toast each message once.
                return [...$flash, 'id' => array_filter($flash) ? (string) Str::ulid() : null];
            },
        ];
    }
}
