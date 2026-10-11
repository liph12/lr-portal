<?php

use App\Http\Controllers\Portal\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/search/users', [SearchController::class, 'users'])
    ->middleware('throttle:60,1')
    ->name('search.users');

Route::get('/search/agents', [SearchController::class, 'agents'])
    ->middleware('throttle:60,1')
    ->name('search.agents');
