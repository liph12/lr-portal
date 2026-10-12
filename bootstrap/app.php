<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\ApplyViewAsRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogActivity;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            // Before anything reads roles: a superadmin's role preview must apply to the whole request.
            ApplyViewAsRole::class,
            HandleInertiaRequests::class,
            LogActivity::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'active' => EnsureUserIsActive::class,
            'guest' => RedirectIfAuthenticated::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Sessions live in the database; a brokerage property owner's name must not ride along in a failed form's old input.
        $exceptions->dontFlash(['current_password', 'password', 'password_confirmation', 'property_owner']);

        // Browser visits get a real page for these instead of Laravel's plain error HTML (which Inertia
        // would show in a modal). JSON callers keep JSON; local 500s keep the debug screen.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();

            if ($request->expectsJson() || ! in_array($status, [403, 404, 419, 500, 503], true)) {
                return $response;
            }

            if ($status >= 500 && app()->hasDebugModeEnabled()) {
                return $response;
            }

            if ($status === 419) {
                return back()->withErrors(['email' => 'Your session expired. Please try again.']);
            }

            return inertia('Error', ['status' => $status])->toResponse($request)->setStatusCode($status);
        });
    })->create();
