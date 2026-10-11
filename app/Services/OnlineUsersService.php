<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Reads presence from the database session store (SESSION_DRIVER=database): a user's newest session
// row says when they last loaded a page.
class OnlineUsersService
{
    private const ONLINE_WITHIN_MINUTES = 5;
    private const LIMIT = 10;

    /**
     * @return array<int, array{id: int, name: string, avatar: ?string, role: ?string, online: bool, last_seen: string}>
     */
    public function recentlyActive(?int $exceptUserId = null): array
    {
        if (config('session.driver') !== 'database') {
            return [];
        }

        // Anyone with a session younger than the session lifetime is still signed in.
        $since = now()->subMinutes((int) config('session.lifetime'))->getTimestamp();

        $lastSeen = DB::table(config('session.table', 'sessions'))
            ->selectRaw('user_id, MAX(last_activity) AS last_seen_at')
            ->whereNotNull('user_id')
            ->where('last_activity', '>=', $since)
            ->when($exceptUserId, fn ($q) => $q->where('user_id', '!=', $exceptUserId))
            ->groupBy('user_id')
            ->orderByDesc('last_seen_at')
            ->limit(self::LIMIT)
            ->pluck('last_seen_at', 'user_id');

        if ($lastSeen->isEmpty()) {
            return [];
        }

        $users = User::query()
            ->whereKey($lastSeen->keys())
            ->where('status', User::STATUS_ACTIVE)
            ->with(['roles:id,label', 'agent:id,user_id,avatar'])
            ->get(['id', 'name'])
            ->keyBy('id');

        return $lastSeen
            ->filter(fn ($at, $id) => $users->has($id))
            ->map(function ($at, $id) use ($users) {
                $user = $users[$id];
                $minutes = (int) Carbon::createFromTimestamp($at)->diffInMinutes(now(), true);

                return [
                    'id' => (int) $id,
                    'name' => $user->name,
                    'avatar' => $user->agent?->avatar,
                    'role' => $user->roles->first()?->label,
                    'online' => $minutes < self::ONLINE_WITHIN_MINUTES,
                    'last_seen' => $minutes < 60 ? "{$minutes}m" : intdiv($minutes, 60).'h',
                ];
            })
            ->values()
            ->all();
    }
}
