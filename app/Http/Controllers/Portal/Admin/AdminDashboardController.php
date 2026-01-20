<?php

namespace App\Http\Controllers\Portal\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminDashboardController extends Controller
{
    public function dashboard()
    {
        return inertia('Admin/AdminDashboard', ['user' => Auth::user()]);
    }
}
