<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Portal\SuperAdmin\SettingsController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\NatconController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\PermissionController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\RoleController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\SalesCutoffController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\UserRoleController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\UserStatusController;

Route::prefix('settings')->group(function(){
    Route::get('/', [SettingsController::class, 'index'])->name('superadmin.settings.index');

    Route::get('/roles', [RoleController::class, 'index'])->name('superadmin.settings.roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('superadmin.settings.roles.store');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('superadmin.settings.roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('superadmin.settings.roles.destroy');

    Route::put('/users/{user}/role', [UserRoleController::class, 'update'])->name('superadmin.settings.users.role.update');
    Route::put('/users/{user}/status', [UserStatusController::class, 'update'])->name('superadmin.settings.users.status.update');

    Route::get('/sales-cutoffs', [SalesCutoffController::class, 'index'])->name('superadmin.settings.sales-cutoffs.index');
    Route::post('/sales-cutoffs', [SalesCutoffController::class, 'store'])->name('superadmin.settings.sales-cutoffs.store');
    Route::put('/sales-cutoffs/{salesCutoff}', [SalesCutoffController::class, 'update'])->name('superadmin.settings.sales-cutoffs.update');
    Route::delete('/sales-cutoffs/{salesCutoff}', [SalesCutoffController::class, 'destroy'])->name('superadmin.settings.sales-cutoffs.destroy');
    Route::put('/sales-encoding', [SalesCutoffController::class, 'encoding'])->name('superadmin.settings.sales-encoding.update');

    Route::get('/natcon', [NatconController::class, 'index'])->name('superadmin.settings.natcon.index');
    Route::put('/natcon', [NatconController::class, 'update'])->name('superadmin.settings.natcon.update');

    Route::post('/permissions', [PermissionController::class, 'store'])->name('superadmin.settings.permissions.store');
    Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->name('superadmin.settings.permissions.destroy');
});
