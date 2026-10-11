<?php

use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\StatisticsController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard', [DashboardController::class, 'index'])->name('staff.index');
Route::get('/statistics', [StatisticsController::class, 'index'])
    ->middleware('can:view_reports')
    ->name('staff.statistics.index');
