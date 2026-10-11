<?php

namespace App\Http\Middleware;

use App\Models\Role;
use App\Models\User;
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
                'role' => $request->user()->roles()->value('label'),
                'portal' => $request->user()->portal(),
                'home' => $request->user()->homeUrl(),
                // Drives which menu items and quick links appear; the routes enforce the same gates.
                'permissions' => $request->user()->permissions()->pluck('name')->values(),
                'avatar' => $request->user()->agent()->value('avatar'),
                'can' => [
                    'access_superadmin' => $request->user()->hasRole(Role::SUPERADMIN),
                    'search_users' => $request->user()->can('search', User::class),
                    'manage_users' => $request->user()->can('manage', User::class),
                    'view_leaderboards' => $request->user()->can(LeaderboardService::PERMISSION),
                ],
            ] : null,
            // Everyone sees who's online (same as the realtime presence channel); this adds "last seen".
            'online_users' => fn () => $request->user()
                ? app(OnlineUsersService::class)->recentlyActive($request->user()->id)
                : [],
            // Optional: never computed on normal visits, only when the leaderboard panel asks for it with a
            // partial reload — and only for roles granted the permission.
            'leaderboards' => Inertia::optional(fn () => $request->user()?->can(LeaderboardService::PERMISSION)
                ? app(LeaderboardService::class)->recentMonths()
                : null),
            'flash' => fn () => [
                'success' => $request->session()->get('success'),
            ],
        ];
    }
}
