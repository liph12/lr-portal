<?php

namespace App\Http\Middleware;

use App\Services\ImpersonationService;
use App\Services\OnboardingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// On the dashboard (everyone's landing page): a new agent who still has onboarding to do goes to the step they're on — not when
// they skipped it this session, and not while a superadmin is signed in as them.
class RedirectToOnboarding
{
    public function __construct(private OnboardingService $onboarding) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') && ! $request->header('X-Inertia-Partial-Data')
            && ! $request->session()->get(OnboardingService::SKIPPED)
            && ! $request->session()->has(ImpersonationService::SESSION_KEY)
            && $request->user() && $this->onboarding->needs($request->user())) {
            return redirect($this->onboarding->nextUrl($request->user()->agent));
        }

        return $next($request);
    }
}
