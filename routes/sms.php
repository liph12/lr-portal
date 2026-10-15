<?php

use App\Http\Controllers\Portal\SmsController;
use Illuminate\Support\Facades\Route;

// SMS Manager, shared by every role given send_sms; reviewing credit requests needs manage_sms (checked in its Form Request).
Route::prefix('sms')->name('sms.')->middleware('can:send_sms')->controller(SmsController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::post('/', 'send')->middleware('throttle:20,1')->name('send');
    Route::get('/credits', 'credits')->name('credits');
    Route::post('/credits', 'requestCredits')->middleware('throttle:10,1')->name('credits.request');
    Route::post('/credits/{creditRequest}/approve', 'approve')->whereNumber('creditRequest')->name('credits.approve');
    Route::post('/credits/{creditRequest}/disapprove', 'disapprove')->whereNumber('creditRequest')->name('credits.disapprove');
});
