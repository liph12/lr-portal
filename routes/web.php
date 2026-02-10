<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

Route::middleware('guest')->group(function(){

    Route::get('/login', [UserController::class, 'login']);
    Route::get('/register', [UserController::class, 'register']);
    Route::post('/login-attempt', [UserController::class, 'loginAttempt']);
    
});

Route::middleware('auth')->group(function(){

    Route::post('/logout', [UserController::class, 'logout']);

    Route::prefix('superadmin')->middleware('role:superadmin')->group(function(){

        require base_path('routes/superadmin/superadmin-dashboard.php');
        require base_path('routes/superadmin/superadmin-management.php');

    });

    Route::prefix('admin')->middleware('role:admin')->group(function(){

        require base_path('routes/admin/admin-dashboard.php');

    });

});