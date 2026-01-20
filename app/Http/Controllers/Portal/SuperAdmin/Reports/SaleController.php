<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct()
    {
        // to do
    }

    public function createProject()
    {
        return inertia('SuperAdmin/Dashboard/CreateSale/Project');
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
