<?php

use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\Sales\SaleController;
use App\Models\Entities\AgentTransaction;
use Illuminate\Support\Facades\Route;

// One dashboard for every role (like /profile); each user's home. Recording sales needs `record_sales`.
Route::prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', fn () => redirect()->route('dashboard.index'));
    Route::get('/main', [DashboardController::class, 'index'])->name('index');
    Route::get('/overview', [DashboardController::class, 'overview'])->name('overview');
    Route::get('/view-sales', [DashboardController::class, 'viewSales'])->name('view-sales');
    Route::get('/view-sales/developer', [DashboardController::class, 'developerSales'])->name('view-sales.developer');

    Route::prefix('record-sale')->name('record-sale')->middleware('can:create,'.AgentTransaction::class)->group(function () {
        Route::get('/', [DashboardController::class, 'recordSale']);
        Route::get('/project', [SaleController::class, 'recordProject'])->name('.project');
        Route::post('/project', [SaleController::class, 'storeProject'])->name('.project.store');
        Route::get('/rental', [SaleController::class, 'recordRental'])->name('.rental');
        Route::post('/rental', [SaleController::class, 'storeRental'])->name('.rental.store');
        Route::get('/brokerage', [SaleController::class, 'recordBrokerage'])->name('.brokerage');
        Route::post('/brokerage', [SaleController::class, 'storeBrokerage'])->name('.brokerage.store');
    });
});
