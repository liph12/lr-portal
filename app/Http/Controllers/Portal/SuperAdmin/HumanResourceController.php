<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class HumanResourceController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/HumanResource/Index', [
            'user' => Auth::user()
        ]);
    }
}
