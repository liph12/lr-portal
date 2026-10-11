<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;

// Not built yet: the shared "under construction" page keeps the menu item and its route working.
class InboxController extends Controller
{
    public function index()
    {
        return inertia('Portal/UnderConstruction', [
            'title' => 'Inbox',
            'description' => 'Messages and notifications for your account.',
        ]);
    }
}
