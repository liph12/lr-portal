<?php

use App\Http\Controllers\Portal\ImpersonationController;
use App\Http\Controllers\Portal\ViewAsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

// Signed-in visitors go to their own portal; everyone else to sign-in.
Route::get('/', fn () => auth()->check() ? redirect()->route('home') : redirect()->route('login'));

Route::middleware('guest')->group(function(){

    Route::get('/login', [UserController::class, 'login']) ->name('login');
    Route::get('/register', [UserController::class, 'register']);
    Route::get('/verify', [UserController::class, 'verify'])->name('verify');
    Route::get('/createaccount', [UserController::class, 'createAccount'])->name('create.account');
    Route::get('/create-password', [UserController::class, 'createPassword'])->name('create.password');
    Route::get('/password-reset', [UserController::class, 'passwordReset']);
    Route::post('/login-attempt', [UserController::class, 'loginAttempt']); 
    Route::post('/password-reset-verify', [UserController::class, 'passwordResetVerify']); 

});

// Public contact pages: anyone with an agent's link, signed in or not.
require base_path('routes/contact.php');

Route::middleware(['auth', 'active'])->group(function(){

    Route::post('/logout', [UserController::class, 'logout']);
    // Laravel's `guest` middleware sends signed-in users here; it resolves to their portal home.
    Route::get('/home', fn () => redirect(auth()->user()->homeUrl()))->name('home');

    require base_path('routes/profile.php');
    require base_path('routes/settings.php');
    require base_path('routes/genealogy.php');
    require base_path('routes/commission-receiving.php');
    require base_path('routes/natcon.php');
    require base_path('routes/dashboard.php');
    require base_path('routes/reports.php');
    require base_path('routes/my-team.php');
    require base_path('routes/search.php');
    require base_path('routes/global-partners.php');
    (require base_path('routes/sales-validation.php'))();

    // Superadmin role preview; the requests check the real role, so the way back always works.
    Route::post('/view-as', [ViewAsController::class, 'store'])->name('view-as.start');
    Route::delete('/view-as', [ViewAsController::class, 'destroy'])->name('view-as.stop');

    // Superadmin "sign in as" a specific user; leaving is allowed for whoever is being impersonated.
    Route::post('/impersonate/{user}', [ImpersonationController::class, 'store'])->name('impersonate.start');
    Route::delete('/impersonate', [ImpersonationController::class, 'destroy'])->name('impersonate.stop');
    // Only reached from a stale history entry or a refresh (the page itself never links here): just go home.
    Route::get('/impersonate', fn () => redirect()->route('dashboard.index'));

    Route::prefix('superadmin')->middleware('role:superadmin')->group(function(){

        require base_path('routes/superadmin/superadmin-dashboard.php');
        require base_path('routes/superadmin/superadmin-management.php');
        require base_path('routes/superadmin/superadmin-statistics.php');
        require base_path('routes/superadmin/superadmin-accounting.php');
        require base_path('routes/superadmin/superadmin-documentation.php');
        require base_path('routes/superadmin/superadmin-sales-validation.php');
        require base_path('routes/superadmin/superadmin-humanresource.php');
        require base_path('routes/superadmin/superadmin-inbox.php'); 
        require base_path('routes/superadmin/superadmin-settings.php'); 
    });

    Route::prefix('admin')->middleware('role:admin')->group(function(){

        require base_path('routes/admin/admin-dashboard.php');
        require base_path('routes/admin/admin-management.php');
        require base_path('routes/admin/admin-documentation.php');
        require base_path('routes/admin/admin-sales-validation.php');
    });

    Route::prefix('staff')->middleware('role:staff')->group(function(){

        require base_path('routes/staff/staff-dashboard.php');
        require base_path('routes/staff/staff-documentation.php');
        require base_path('routes/staff/staff-management.php');
        require base_path('routes/staff/staff-sales-validation.php');

    });

});