<?php

use App\Http\Controllers\Portal\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('profile')->group(function () {
    Route::get('/', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/photo', [ProfileController::class, 'updatePhoto'])->name('profile.photo.update');
    Route::delete('/photo', [ProfileController::class, 'destroyPhoto'])->name('profile.photo.destroy');
    Route::post('/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');
});
