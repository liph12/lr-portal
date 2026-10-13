<?php

use App\Http\Controllers\Portal\NatconController;
use Illuminate\Support\Facades\Route;

Route::prefix('natcon')->name('natcon.')->middleware('can:view_natcon')->group(function () {
    Route::get('/', [NatconController::class, 'index'])->name('index');
    Route::get('/my-sales', [NatconController::class, 'mine'])->name('mine');
    Route::get('/{board}', [NatconController::class, 'show'])->name('show');
});
