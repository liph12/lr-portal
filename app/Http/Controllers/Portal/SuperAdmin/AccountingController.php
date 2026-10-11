<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;

// Not built yet: the shared "under construction" page keeps the menu item and its route working.
class AccountingController extends Controller
{
    public function index()
    {
        return inertia('Portal/UnderConstruction', [
            'title' => 'Accounting',
            'description' => 'Commissions, payouts and the money side of sales.',
        ]);
    }
}
