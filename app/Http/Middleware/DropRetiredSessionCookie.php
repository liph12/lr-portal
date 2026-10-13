<?php

namespace App\Http\Middleware;

use App\Services\ImpersonationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Outermost on web routes. Every response re-sends the session cookie, so a slow background request (leaderboards, the
// online poll, presence auth, a prefetch) still running on a session that "sign in as" / "return" just replaced would, on
// finishing, put the old session back in the browser — and the superadmin back in the other account. Its cookie is
// dropped and the row it saved again removed; a page (GET) is asked for again, so the browser gets it for the account
// it's on now instead of the one it left.
class DropRetiredSessionCookie
{
    public function __construct(private ImpersonationService $impersonation) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $id = $request->hasSession() ? $request->session()->getId() : null;
        if ($id && $this->impersonation->isRetired($id)) {
            $request->session()->getHandler()->destroy($id);
            if ($request->isMethod('GET')) {
                $response = redirect($request->fullUrl());
            }
            $response->headers->removeCookie(config('session.cookie'), config('session.path'), config('session.domain'));
        }

        return $response;
    }
}
