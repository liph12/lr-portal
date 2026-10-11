<?php

use App\Http\Controllers\Portal\AgentProfileController;
use App\Http\Controllers\Portal\ReportsController;
use Illuminate\Support\Facades\Route;

// Shared by every portal (like /dashboard); how far each person's reports reach is decided in the controller.
Route::prefix('reports')->name('reports.')->group(function () {
    Route::get('/', [ReportsController::class, 'index'])->name('index');
    Route::get('/recruits', [ReportsController::class, 'recruits'])->name('recruits');
    Route::get('/recruits-progress', [ReportsController::class, 'recruitsProgress'])->name('recruits-progress');
    Route::get('/{report}', [ReportsController::class, 'show'])
        ->whereIn('report', array_keys(ReportsController::REPORTS))
        ->name('show');
});

// Read-only agent profile opened from report rows; the controller allows view_reports or team managers.
Route::get('/agents/{agent}', [AgentProfileController::class, 'show'])->name('agents.show');
Route::get('/agents/{agent}/sales', [AgentProfileController::class, 'sales'])->name('agents.sales');
