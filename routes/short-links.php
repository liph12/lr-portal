<?php

use App\Http\Controllers\Portal\QrMakerController;
use Illuminate\Support\Facades\Route;

// Public: the short links agents put in QR codes (Dashboard › QR Code Maker) open for anyone, signed in or not.
Route::get('/url/{code}', [QrMakerController::class, 'open'])->where('code', '[A-Za-z0-9-]{1,40}')->name('short-link.open');
