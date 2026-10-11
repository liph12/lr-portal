<?php

use App\Http\Controllers\Portal\StatisticsController;
use Illuminate\Support\Facades\Route;

Route::get('/statistics', [StatisticsController::class, 'index'])
    ->middleware('can:view_statistics')
    ->name('superadmin.statistics.index');
