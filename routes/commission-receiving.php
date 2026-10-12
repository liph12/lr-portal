<?php

use App\Http\Controllers\Portal\CommissionReceivingController;
use Illuminate\Support\Facades\Route;

// Brokerage and rental receiving are separate pages, each behind its own permission, for the back office only
// (CommissionReceivingService::categories).
foreach (['brokerage' => 'receive_brokerage_sales', 'rental' => 'receive_rental_sales'] as $category => $permission) {
    Route::prefix("{$category}-receiving")->name("{$category}-receiving.")->middleware("can:{$permission}")->group(function () use ($category) {
        Route::get('/', [CommissionReceivingController::class, 'index'])->defaults('category', $category)->name('index');
        Route::post('/{sale}/receive', [CommissionReceivingController::class, 'receive'])->defaults('category', $category)->name('receive');
        Route::patch('/{sale}/received-date', [CommissionReceivingController::class, 'receivedDate'])->defaults('category', $category)->name('received-date');
        Route::post('/{sale}/disapprove', [CommissionReceivingController::class, 'disapprove'])->defaults('category', $category)->name('disapprove');
    });
}
