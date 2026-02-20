<?php

use App\Http\Controllers\Portal\SuperAdmin\DocumentationController;
use Illuminate\Support\Facades\Route;

Route::prefix('documentation')->group(function () {
    Route::get('/', [DocumentationController::class, 'index'])
        ->name('superadmin.documentation.index');
});
