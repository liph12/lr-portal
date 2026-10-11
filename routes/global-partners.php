<?php

use App\Http\Controllers\Portal\GlobalPartnerController;
use Illuminate\Support\Facades\Route;

// Shared by every role: the back office sees every global partner, a sponsor their own invites (GlobalPartnerService).
Route::prefix('global-partners')->name('global-partners.')->controller(GlobalPartnerController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::get('/statistics', 'statistics')->middleware('can:view_global_partner_statistics')->name('statistics');
    Route::post('/{agent}/confirm', 'confirm')->name('confirm');
});
