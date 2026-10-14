<?php

use App\Http\Controllers\Portal\OnboardingController;
use Illuminate\Support\Facades\Route;

// New agents' onboarding (the dashboard sends them here: RedirectToOnboarding).
Route::prefix('welcome')->name('onboarding.')->controller(OnboardingController::class)->group(function () {
    Route::get('/', 'welcome')->name('welcome');
    Route::get('/photo', 'photo')->name('photo');
    Route::post('/photo', 'completePhoto')->name('photo.complete');
    Route::get('/nao', 'nao')->name('nao');
    Route::post('/nao/attendance', 'submitAttendance')->middleware('throttle:10,1')->name('nao.attendance');
    Route::post('/nao/webinar', 'chooseWebinar')->name('nao.webinar');
    Route::put('/nao/progress', 'saveProgress')->middleware('throttle:30,1')->name('nao.progress');
    Route::post('/skip', 'skip')->name('skip');
});
