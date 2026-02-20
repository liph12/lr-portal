<?php

use App\Http\Controllers\Portal\SuperAdmin\AccountingController;
use Illuminate\Support\Facades\Route;

Route::prefix('accounting')->group(function(){
    Route::get('/', [AccountingController::class, 'index'])
        ->name('superadmin.accounting');
});