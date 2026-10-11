<?php

use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\StatisticsController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.index');
Route::get('/statistics', [StatisticsController::class, 'index'])
    ->middleware('can:view_reports')
    ->name('admin.statistics.index');
