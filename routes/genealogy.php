<?php

use App\Http\Controllers\Portal\GenealogyController;
use Illuminate\Support\Facades\Route;

Route::prefix('genealogy')->middleware('can:view_genealogy')->group(function () {
    Route::get('/', [GenealogyController::class, 'index'])->name('genealogy.index');
    Route::get('/search', [GenealogyController::class, 'search'])->name('genealogy.search');
});
