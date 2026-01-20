<?php

use App\Http\Controllers\Portal\Admin\AdminDashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard', [AdminDashboardController::class, 'dashboard'])->name('admin.dashboard');