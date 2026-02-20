<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountingController extends Controller
{
    public function index()
{
    return inertia('SuperAdmin/Accounting/index', [
        'user' => Auth::user()
    ]);
}
}
