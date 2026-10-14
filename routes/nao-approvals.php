<?php

use App\Http\Controllers\Portal\NaoApprovalController;
use Illuminate\Support\Facades\Route;

// NAO approvals, shared by every role; who sees what is decided by NaoApprovalService::reach.
Route::prefix('nao-approvals')->name('nao-approvals.')->controller(NaoApprovalController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/{agent}/approve', 'approve')->name('approve');
    Route::post('/{agent}/disapprove', 'disapprove')->name('disapprove');
});
