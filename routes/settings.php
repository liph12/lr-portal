<?php

use App\Http\Controllers\Portal\PreferencesController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

// Settings every user has (the superadmin's system settings stay under /superadmin/settings).
Route::prefix('settings')->middleware('can:'.User::PREFERENCES_PERMISSION)->group(function () {
    Route::get('/preferences', [PreferencesController::class, 'edit'])->name('settings.preferences.edit');
    Route::put('/preferences', [PreferencesController::class, 'update'])->name('settings.preferences.update');
    Route::put('/preferences/genealogy', [PreferencesController::class, 'updateGenealogy'])->name('settings.preferences.genealogy');
    Route::put('/preferences/theme', [PreferencesController::class, 'updateTheme'])->name('settings.preferences.theme');
});
