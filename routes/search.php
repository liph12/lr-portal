<?php

use App\Http\Controllers\Portal\SearchController;
use Illuminate\Support\Facades\Route;

Route::get('/search/users', [SearchController::class, 'users'])
    ->middleware('throttle:60,1')
    ->name('search.users');
