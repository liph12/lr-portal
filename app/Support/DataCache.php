<?php

namespace App\Support;

use Closure;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

// Caches expensive report / statistics results by what they were asked (filters, reach, page) and the current data
// version. Any write bumps the version (BumpDataVersion middleware, data commands), so later reads compute afresh instead
// of serving old numbers; old entries simply age out. Results also carry today's date, since "this month" moves.
final class DataCache
{
    private const VERSION_KEY = 'data-cache:version';

    /**
     * @template T
     *
     * @param  Closure(): T  $compute
     * @return T
     */
    public static function remember(string $name, array $params, Closure $compute): mixed
    {
        if (! config('data_cache.enabled')) {
            return $compute();
        }

        return Cache::remember(self::key($name, $params), now()->addMinutes(config('data_cache.ttl_minutes')), $compute);
    }

    // A paginator is cached as its rows and total, and rebuilt for the current request's URL and query.
    public static function page(string $name, array $params, Closure $compute): LengthAwarePaginator
    {
        $page = (int) request()->query('page', 1);
        [$items, $total, $perPage, $current] = self::remember($name, [...$params, 'page' => $page], function () use ($compute) {
            $result = $compute();

            return [$result->items(), $result->total(), $result->perPage(), $result->currentPage()];
        });

        return new LengthAwarePaginator($items, $total, $perPage, $current, ['path' => request()->url(), 'query' => request()->query()]);
    }

    // Everything cached so far is stale from now on.
    public static function bump(): void
    {
        Cache::forever(self::VERSION_KEY, (string) Str::ulid());
    }

    public static function version(): string
    {
        return Cache::rememberForever(self::VERSION_KEY, fn () => (string) Str::ulid());
    }

    private static function key(string $name, array $params): string
    {
        return 'data-cache:'.self::version().':'.$name.':'.md5(serialize([$params, now()->toDateString()]));
    }
}
