<?php

use App\Http\Controllers\Portal\ContactController;
use Illuminate\Support\Facades\Route;

// Public: the link an agent shares with clients (no sign-in). Sending is rate-limited per visitor.
Route::prefix('contact/{slug}')->name('contact.')->group(function () {
    Route::get('/', [ContactController::class, 'show'])->name('show');
    Route::post('/', [ContactController::class, 'store'])->middleware('throttle:10,1')->name('store');
    Route::get('/vcard', [ContactController::class, 'vcard'])->name('vcard');
});
