<?php

use App\Http\Controllers\Portal\SuperAdmin\HumanResourceController;
use Illuminate\Support\Facades\Route;

Route::prefix('human-resource')->group(function () {
    Route::get('/', [HumanResourceController::class, 'index'])
        ->name('superadmin.humanresource.index');
});
