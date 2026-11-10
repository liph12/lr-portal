<?php

use App\Http\Controllers\Portal\SuperAdmin\ReportBuilderController;
use Illuminate\Support\Facades\Route;

// Report Builder: dynamic sales / recruits breakdowns with every view and a CSV export, superadmin only.
Route::prefix('report-builder')->name('superadmin.report-builder.')->controller(ReportBuilderController::class)->group(function () {
    Route::redirect('/', '/superadmin/report-builder/sales')->name('index');
    Route::get('/sales', 'sales')->name('sales');
    Route::get('/sales/export', 'exportSales')->name('sales.export');
    Route::post('/ai', 'ask')->name('ai');
    Route::get('/recruits', 'recruits')->name('recruits');
    Route::get('/recruits/export', 'exportRecruits')->name('recruits.export');
});
