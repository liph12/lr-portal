<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Portal\SuperAdmin\SettingsController;

Route::prefix('settings')->group(function(){
    Route::get('/', [SettingsController::class, 'index'])->name('superadmin.settings.index');
});