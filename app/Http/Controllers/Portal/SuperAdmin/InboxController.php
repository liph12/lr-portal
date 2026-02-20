<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class InboxController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/Inbox/Index', [
            'user' => Auth::user()
        ]);
    }
}
