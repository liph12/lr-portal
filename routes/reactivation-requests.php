<?php

use App\Http\Controllers\Portal\ReactivationApprovalController;
use Illuminate\Support\Facades\Route;

// Reactivation requests, shared by every role; who sees what is decided by ReactivationRequestService::reach.
Route::prefix('reactivation-requests')->name('reactivation-approvals.')->controller(ReactivationApprovalController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/{agent}/approve', 'approve')->name('approve');
    Route::post('/{agent}/disapprove', 'disapprove')->name('disapprove');
});
