<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

Route::get('/', function () {
    return redirect('/login');
});

Route::middleware('guest')->group(function(){

    Route::get('/login', [UserController::class, 'login']) ->name('login');
    Route::get('/register', [UserController::class, 'register']);
    Route::get('/verify', [UserController::class, 'verify'])->name('verify');
    Route::get('/createaccount', [UserController::class, 'createAccount'])->name('create.account');
    Route::get('/createpassword', [UserController::class, 'createPassword'])->name('create.password');
    Route::get('/password-reset', [UserController::class, 'passwordReset']);
    Route::post('/login-attempt', [UserController::class, 'loginAttempt']); 
    Route::post('/password-reset-verify', [UserController::class, 'passwordResetVerify']); 

});

Route::middleware('auth')->group(function(){

    Route::post('/logout', [UserController::class, 'logout']);

    Route::prefix('superadmin')->middleware('role:superadmin')->group(function(){

        require base_path('routes/superadmin/superadmin-dashboard.php');
        require base_path('routes/superadmin/superadmin-management.php');
        require base_path('routes/superadmin/superadmin-accounting.php');
        require base_path('routes/superadmin/superadmin-documentation.php');
        require base_path('routes/superadmin/superadmin-humanresource.php');
        require base_path('routes/superadmin/superadmin-inbox.php'); 
    });

    Route::prefix('admin')->middleware('role:admin')->group(function(){

        require base_path('routes/admin/admin-dashboard.php');

    });

});