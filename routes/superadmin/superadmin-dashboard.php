<?php

use Illuminate\Support\Facades\Route;

// The dashboard moved to the shared /dashboard; keep old links and the portal's index name working.
Route::get('/dashboard/main', fn () => redirect()->route('dashboard.index'))->name('superadmin.index');
Route::get('/dashboard/{path}', fn (string $path) => redirect("/dashboard/{$path}"))->where('path', '.*');
