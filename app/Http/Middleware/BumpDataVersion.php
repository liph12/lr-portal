<?php

namespace App\Http\Middleware;

use App\Support\DataCache;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// After a write that went through, cached report / statistics results are stale (DataCache).
class BumpDataVersion
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->isMethodSafe() && $response->getStatusCode() < 400 && ! $request->is(...config('data_cache.ignore_paths'))) {
            DataCache::bump();
        }

        return $response;
    }
}
