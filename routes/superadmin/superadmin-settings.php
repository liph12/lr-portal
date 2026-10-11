<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Portal\SuperAdmin\SettingsController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\PermissionController;
use App\Http\Controllers\Portal\SuperAdmin\Settings\RoleController;
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

    Route::post('/permissions', [PermissionController::class, 'store'])->name('superadmin.settings.permissions.store');
    Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])->name('superadmin.settings.permissions.destroy');
});
