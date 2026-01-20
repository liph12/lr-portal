<?php

namespace App\Http\Controllers\Portal\SuperAdmin;

use App\Http\Controllers\Controller;

class DashboardController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/Dashboard/Index');
    }

    public function overview()
    {
        $BASE_TOTAL = 100;
        $totalRecruitsLastYear = 2000;
        $totalRecruits = 3500;
        $totalNaoRecruits = 2600;
        $totalFireRecruits = 1200;

        $recruits = [
            'total' => $totalRecruits,
            'difference' =>  (($totalRecruits / $totalRecruitsLastYear) * $BASE_TOTAL) - $BASE_TOTAL,
            'nao' => [
                'total' => $totalNaoRecruits,
                'difference' => (($totalNaoRecruits / $totalRecruits) * $BASE_TOTAL) - $BASE_TOTAL,
            ],
            'fire' => [
                'total' => $totalFireRecruits,
                'difference' => ($totalFireRecruits / $totalNaoRecruits * $BASE_TOTAL) - $BASE_TOTAL,
            ],
        ];

        return inertia('SuperAdmin/Dashboard/Overview/Index', ['recruits' => $recruits]);
    }

    public function viewSales()
    {
        return inertia('SuperAdmin/Reports/Index');
    }

    public function developerSales()
    {
        return inertia('SuperAdmin/Reports/Developer');
    }

    public function createSale()
    {
        return inertia('SuperAdmin/Dashboard/CreateSale/Index');
    }
}
