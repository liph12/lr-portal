<?php

use App\Http\Controllers\Portal\DocumentationController;
use App\Models\Entities\AgentDocument;
use Illuminate\Support\Facades\Route;

// Documentation lives in the superadmin, admin and staff portals: each portal file calls this with its own name,
// giving /{portal}/documentation routes named {portal}.documentation.*, all behind manage_documents.
return function (string $portal) {
    Route::prefix('documentation')
        ->name("{$portal}.documentation.")
        ->middleware('can:manage,'.AgentDocument::class)
        ->controller(DocumentationController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::patch('/{document}', 'review')->name('review');
            Route::post('/{document}/comments', 'comment')->name('comments.store');
        });
};
