<?php

namespace App\Providers;

use App\Services\ActivityLogger;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One instance per request, shared by services (describe) and the LogActivity middleware (record).
        $this->app->scoped(ActivityLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
