<?php

namespace App\Http\Middleware;

use App\Services\ActivityLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class LogActivity
{
    public function __construct(private ActivityLogger $logger) {}

    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('activity.started_at', hrtime(true));
        // Captured up front so a logout is still attributed to the user who logged out.
        $request->attributes->set('activity.user_before', $request->user());

        return $next($request);
    }

    // Runs after the response is sent, so logging never slows the user down.
    public function terminate(Request $request, Response $response): void
    {
        if (! $this->logger->shouldLog($request)) {
            return;
        }

        $startedAt = $request->attributes->get('activity.started_at');
        $durationMs = $startedAt ? (int) round((hrtime(true) - $startedAt) / 1e6) : null;

        try {
            $this->logger->record(
                $request,
                $response,
                $request->user() ?? $request->attributes->get('activity.user_before'),
                $durationMs,
            );
        } catch (Throwable $e) {
            // A broken audit write must not surface as an error for an action that already succeeded.
            report($e);
        }
    }
}
