<?php

use Illuminate\Foundation\Inspiring;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('model:prune', ['--model' => [ActivityLog::class]])->daily();

// Rolling 6-month window, so it has to move forward every day even when nobody records a sale.
Schedule::command('agents:refresh-activity')->dailyAt('01:00');
