<?php

use App\Http\Controllers\Portal\AgentProfileController;
use App\Http\Controllers\Portal\ReportsController;
use Illuminate\Support\Facades\Route;

// Shared by every portal (like /dashboard); sales figures, so view_reports only.
Route::prefix('reports')->name('reports.')->middleware('can:view_reports')->group(function () {
    Route::get('/', [ReportsController::class, 'index'])->name('index');
    Route::get('/{report}', [ReportsController::class, 'show'])
        ->whereIn('report', array_keys(ReportsController::REPORTS))
        ->name('show');
});

// Read-only agent profile opened from report rows; the controller allows view_reports or team managers.
Route::get('/agents/{agent}', [AgentProfileController::class, 'show'])->name('agents.show');
