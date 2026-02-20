<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class DocumentationController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/Documentation/Index', [
            'user' => Auth::user()
        ]);
    }
}
