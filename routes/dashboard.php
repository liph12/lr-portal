<?php

use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\SalesReportController;
use App\Http\Controllers\Portal\Sales\SaleController;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\InternationalSale;
use Illuminate\Support\Facades\Route;

// One dashboard for every role (like /profile); each user's home. Recording sales needs `record_sales`.
Route::prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', fn () => redirect()->route('dashboard.index'));
    Route::get('/main', [DashboardController::class, 'index'])->name('index');
    Route::get('/overview', [DashboardController::class, 'overview'])->name('overview');
    // Everyone with an agent record: their own sales one by one, with statistics.
    Route::get('/my-sales', [DashboardController::class, 'mySales'])->name('my-sales');
    // Everything for view_reports; team leaders / unit managers get their own team (the controller decides).
    Route::get('/view-sales', [SalesReportController::class, 'index'])->name('view-sales');
    Route::get('/view-sales/developer', fn () => redirect()->route('dashboard.view-sales', ['view' => 'developers']))->name('view-sales.developer');

    // The landing page is for anyone who can record either kind; each form has its own gate.
    Route::get('/record-sale', [DashboardController::class, 'recordSale'])->name('record-sale');

    Route::prefix('record-sale')->name('record-sale')->middleware('can:create,'.InternationalSale::class)->group(function () {
        Route::get('/international', [SaleController::class, 'recordInternational'])->name('.international');
        Route::post('/international', [SaleController::class, 'storeInternational'])->name('.international.store');
    });

    Route::prefix('record-sale')->name('record-sale')->middleware('can:create,'.AgentTransaction::class)->group(function () {
        Route::get('/project', [SaleController::class, 'recordProject'])->name('.project');
        Route::post('/project', [SaleController::class, 'storeProject'])->name('.project.store');
        Route::get('/rental', [SaleController::class, 'recordRental'])->name('.rental');
        Route::post('/rental', [SaleController::class, 'storeRental'])->name('.rental.store');
        Route::post('/rental/slip-preview', [SaleController::class, 'previewRentalSlip'])->name('.rental.slip-preview');
        Route::get('/brokerage', [SaleController::class, 'recordBrokerage'])->name('.brokerage');
        Route::post('/brokerage', [SaleController::class, 'storeBrokerage'])->name('.brokerage.store');
        // The commission slip as it would be generated, from the form so far (nothing saved).
        Route::post('/brokerage/slip-preview', [SaleController::class, 'previewBrokerageSlip'])->name('.brokerage.slip-preview');
    });
});
