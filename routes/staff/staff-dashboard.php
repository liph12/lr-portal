<?php

use App\Http\Controllers\Portal\StatisticsController;
use Illuminate\Support\Facades\Route;

// The dashboard is shared at /dashboard; this keeps the portal's index name pointing there.
Route::get('/dashboard', fn () => redirect()->route('dashboard.index'))->name('staff.index');
Route::get('/statistics', [StatisticsController::class, 'index'])
    ->middleware('can:view_reports')
    ->name('staff.statistics.index');
