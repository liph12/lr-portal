<?php

use App\Http\Controllers\Portal\FireTrainingController;
use Illuminate\Support\Facades\Route;

// FIRE training (realestatetraining.ph's modules and exams, inside the portal), for anyone with an agent record.
Route::prefix('fire')->name('fire.')->controller(FireTrainingController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::get('/{module}', 'show')->whereNumber('module')->name('show');
    Route::get('/{module}/exam', 'exam')->whereNumber('module')->name('exam');
    Route::post('/{module}/exam', 'submit')->whereNumber('module')->middleware('throttle:20,1')->name('submit');
});
