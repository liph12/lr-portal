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
    Route::get('/record-sale', [DashboardController::class, 'recordSale'])->name('superadmin.record-sale');

    Route::prefix('record-sale')->group(function(){
        Route::get('/project', [SaleController::class, 'recordProject'])->name('superadmin.record-sale.project');
        Route::post('/project', [SaleController::class, 'storeProject'])->name('superadmin.record-sale.project.store');
        Route::get('/rental', [SaleController::class, 'recordRental'])->name('superadmin.record-sale.rental');
        Route::get('/brokerage', [SaleController::class, 'recordBrokerage'])->name('superadmin.record-sale.brokerage');
    });
});