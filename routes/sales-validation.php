<?php

use App\Http\Controllers\Portal\SalesValidationController;
use Illuminate\Support\Facades\Route;

// Sales validation lives in the superadmin, admin and staff portals: each portal file calls this with its own name,
// giving /{portal}/sales-validation routes named {portal}.sales-validation.*, behind the sales_validation permission.
return function (string $portal) {
    Route::prefix('sales-validation')
        ->name("{$portal}.sales-validation.")
        ->middleware('can:sales_validation')
        ->controller(SalesValidationController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::patch('/{sale}', 'update')->name('update');
            Route::put('/{sale}', 'edit')->name('edit');
        });
};
