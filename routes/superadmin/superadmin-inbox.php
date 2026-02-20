<?php

use App\Http\Controllers\Portal\SuperAdmin\InboxController;
use Illuminate\Support\Facades\Route;

Route::prefix('inbox')->group(function () {
    Route::get('/', [InboxController::class, 'index'])
        ->name('superadmin.inbox.index');
});
