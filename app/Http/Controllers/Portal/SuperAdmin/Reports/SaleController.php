<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Reports;

use App\Http\Controllers\Controller;
use App\Models\Developer;

class SaleController extends Controller
{
    public function __construct()
    {
        // to do
    }

    public function createProject()
    {
        $developers = Developer::get();

        return inertia('SuperAdmin/Dashboard/CreateSale/Project', ['developers' => $developers]);
    }

    public function createRental()
    {
        return inertia('SuperAdmin/Dashboard/CreateSale/Rental');
    }

    public function createBrokerage()
    {
        return inertia('SuperAdmin/Dashboard/CreateSale/Brokerage');
    }
}
