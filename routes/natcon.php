<?php

use App\Http\Controllers\Portal\NatconController;
use Illuminate\Support\Facades\Route;

// /natcon and /natcon/{board} are the default edition; /natcon/{year}/… any edition (Settings › NATCON).
Route::prefix('natcon')->name('natcon.')->middleware('can:view_natcon')->controller(NatconController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::get('/my-sales', 'mine')->name('mine');
    Route::get('/{year}', 'index')->whereNumber('year')->name('edition');
    Route::get('/{year}/my-sales', 'mine')->whereNumber('year')->name('edition.mine');
    Route::get('/{year}/{board}', 'show')->whereNumber('year')->name('edition.show');
    Route::get('/{board}', 'showDefault')->name('show');
});
