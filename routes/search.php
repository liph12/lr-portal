<?php

use App\Http\Controllers\Portal\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/search/users', [SearchController::class, 'users'])
    ->middleware('throttle:60,1')
    ->name('search.users');

// The FIRE certificates button in the people results (fetched from the training site, cached).
Route::get('/search/users/{user}/certificates', [SearchController::class, 'certificates'])
    ->middleware('throttle:30,1')
    ->name('search.users.certificates');

Route::get('/search/groups', [SearchController::class, 'groups'])
    ->middleware('throttle:60,1')
    ->name('search.groups');

Route::get('/search/agents', [SearchController::class, 'agents'])
    ->middleware('throttle:60,1')
    ->name('search.agents');
