<?php

use App\Http\Controllers\Portal\SalesValidationController;
use Illuminate\Support\Facades\Route;

// Sales validation lives in the superadmin, admin and staff portals (each portal file calls this with its own name:
// /{portal}/sales-validation, {portal}.sales-validation.*) and, for office secretaries who have no portal, at the shared
// /sales-validation (called without a portal). All behind the sales_validation permission; SaleValidationService decides
// which areas each reader gets.
return function (?string $portal = null) {
    Route::prefix('sales-validation')
        ->name(($portal ? "{$portal}." : '').'sales-validation.')
        ->middleware('can:sales_validation')
        ->controller(SalesValidationController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::patch('/{sale}', 'update')->name('update');
            Route::put('/{sale}', 'edit')->name('edit');
        });
};
