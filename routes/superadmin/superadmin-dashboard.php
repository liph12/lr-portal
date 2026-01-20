<?php

use App\Http\Controllers\Portal\SuperAdmin\DashboardController;
use App\Http\Controllers\Portal\SuperAdmin\ManagementController;
use App\Http\Controllers\Portal\SuperAdmin\Reports\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')->group(function(){
    Route::get('/main', [DashboardController::class, 'index'])->name('superadmin.index');
    Route::get('/overview', [DashboardController::class, 'overview'])->name('superadmin.overview');
    Route::get('/view-sales', [DashboardController::class, 'viewSales'])->name('superadmin.view-sales');
    Route::get('/view-sales/developer', [DashboardController::class, 'developerSales'])->name('superadmin.view-sales.developer');
    Route::get('/create-sale', [DashboardController::class, 'createSale'])->name('superadmin.create-sale');

    Route::prefix('create-sale')->group(function(){
        Route::get('/project', [SaleController::class, 'createProject'])->name('superadmin.create-sale.project');
        Route::get('/rental', [SaleController::class, 'createRental'])->name('superadmin.create-sale.rental');
        Route::get('/brokerage', [SaleController::class, 'createBrokerage'])->name('superadmin.create-sale.brokerage');
    });
});