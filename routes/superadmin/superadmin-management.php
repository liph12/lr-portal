<?php

use App\Http\Controllers\Portal\SuperAdmin\ManagementController;
use Illuminate\Support\Facades\Route;

Route::prefix('management')->group(function(){
    Route::get('/', [ManagementController::class, 'index'])->name('superadmin.index');
});