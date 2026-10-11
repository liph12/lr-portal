<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, $role): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole($role)) {
            // Rendered as the Error page for browser visits and as JSON for API-style requests.
            abort(403, 'This area is for another role.');
        }

        return $next($request);
    }
}
