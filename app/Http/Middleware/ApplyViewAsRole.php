<?php

namespace App\Http\Middleware;

use App\Services\ViewAsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplyViewAsRole
{
    public function __construct(private ViewAsService $viewAs) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasSession() && $request->user()) {
            $this->viewAs->apply($request->user(), $request->session());
        }

        return $next($request);
    }
}
