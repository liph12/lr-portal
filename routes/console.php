<?php

use Illuminate\Foundation\Inspiring;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune', ['--model' => [ActivityLog::class]])->daily();

// Rolling 6-month window, so it has to move forward every day even when nobody records a sale.
Schedule::command('agents:refresh-activity')->dailyAt('01:00');

// The database cache never deletes expired rows by itself; DataCache leaves old versions behind after every write.
Artisan::command('cache:prune-expired', function () {
    if (config('cache.stores.'.config('cache.default').'.driver') !== 'database') {
        return $this->info('The cache store is not the database; nothing to prune.');
    }
    $table = config('cache.stores.'.config('cache.default').'.table', 'cache');
    $this->info(number_format(DB::table($table)->where('expiration', '<', time())->delete()).' expired cache entries removed.');
})->purpose('Delete expired rows from the database cache');
Schedule::command('cache:prune-expired')->hourly();
