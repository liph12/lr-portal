<?php

use App\Http\Controllers\Portal\DashboardController;
use App\Http\Controllers\Portal\QrMakerController;
use App\Http\Controllers\Portal\Sales\SaleController;
use App\Http\Controllers\Portal\SalesReportController;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\InternationalSale;
use Illuminate\Support\Facades\Route;

// One dashboard for every role (like /profile); each user's home. Recording sales needs `record_sales`.
Route::prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', fn () => redirect()->route('dashboard.index'));
    // New agents with onboarding to do land on /welcome instead.
    Route::get('/main', [DashboardController::class, 'index'])->middleware('onboarding')->name('index');
    Route::get('/overview', [DashboardController::class, 'overview'])->name('overview');
    // Everyone with an agent record: their own sales one by one, with statistics.
    Route::get('/my-sales', [DashboardController::class, 'mySales'])->name('my-sales');
    // Everything for view_reports; team leaders / unit managers get their own team (the controller decides).
    Route::get('/view-sales', [SalesReportController::class, 'index'])->name('view-sales');
    Route::get('/view-sales/developer', fn () => redirect()->route('dashboard.view-sales', ['view' => 'developers']))->name('view-sales.developer');

    // Generate LR ID: anyone signed in (an agent record is made on first visit, like /profile); the card itself is
    // drawn in the browser, so the server only supplies the data, the photo and a download log.
    Route::get('/lr-id', [DashboardController::class, 'lrId'])->name('lr-id');
    Route::get('/lr-id/photo', [DashboardController::class, 'lrIdPhoto'])->name('lr-id.photo');
    Route::post('/lr-id/downloaded', [DashboardController::class, 'lrIdDownloaded'])->name('lr-id.downloaded');

    // QR Code Maker: anyone signed in; the QR is drawn in the browser, the server keeps the optional short links.
    Route::get('/qr-maker', [QrMakerController::class, 'index'])->name('qr-maker');
    Route::post('/qr-maker/links', [QrMakerController::class, 'storeLink'])->name('qr-maker.links.store');
    Route::delete('/qr-maker/links/{link}', [QrMakerController::class, 'destroyLink'])->name('qr-maker.links.destroy');

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
