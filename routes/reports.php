<?php

use App\Http\Controllers\Portal\AgentProfileController;
use App\Http\Controllers\Portal\ReactivationRequestController;
use App\Http\Controllers\Portal\ReportsController;
use Illuminate\Support\Facades\Route;

// Shared by every portal (like /dashboard); how far each person's reports reach is decided in the controller.
Route::prefix('reports')->name('reports.')->group(function () {
    Route::get('/', [ReportsController::class, 'index'])->name('index');
    Route::get('/recruits', [ReportsController::class, 'recruits'])->name('recruits');
    Route::get('/recruits-progress', [ReportsController::class, 'recruitsProgress'])->name('recruits-progress');
    Route::post('/recruits-progress/analysis/send', [ReportsController::class, 'sendRecruitAnalysis'])->middleware('throttle:10,1')->name('recruits-progress.send-analysis');
    Route::get('/recruits-kpi', [ReportsController::class, 'recruitsKpi'])->name('recruits-kpi');
    Route::get('/{report}', [ReportsController::class, 'show'])
        ->whereIn('report', array_keys(ReportsController::REPORTS))
        ->name('show');
});

// Read-only agent profile opened from report rows; the controller allows view_reports or team managers.
Route::get('/agents/{agent}', [AgentProfileController::class, 'show'])->name('agents.show');
Route::get('/agents/{agent}/sales', [AgentProfileController::class, 'sales'])->name('agents.sales');
Route::get('/agents/{agent}/journey', [AgentProfileController::class, 'journey'])->name('agents.journey');
Route::get('/agents/{agent}/certificates/{module}', [AgentProfileController::class, 'certificate'])->whereNumber('module')->name('agents.certificate');
Route::get('/my-journey', [AgentProfileController::class, 'myJourney'])->name('my-journey');
Route::post('/my-journey/reactivation-request', [ReactivationRequestController::class, 'store'])->middleware('throttle:10,1')->name('my-journey.reactivation-request');
Route::put('/agents/{agent}', [AgentProfileController::class, 'update'])->middleware('can:edit_agent_profile')->name('agents.update');
Route::put('/agents/{agent}/upline', [AgentProfileController::class, 'changeUpline'])->middleware('can:edit_agent_profile')->name('agents.upline');
