<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;

// The dashboard every signed-in role shares (/dashboard/...); only Record Your Sale is permission-gated.
class DashboardController extends Controller
{
    public function index()
    {
        return inertia('Portal/Dashboard/Index');
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
            'difference' => (($totalRecruits / $totalRecruitsLastYear) * $BASE_TOTAL) - $BASE_TOTAL,
            'nao' => [
                'total' => $totalNaoRecruits,
                'difference' => (($totalNaoRecruits / $totalRecruits) * $BASE_TOTAL) - $BASE_TOTAL,
            ],
            'fire' => [
                'total' => $totalFireRecruits,
                'difference' => ($totalFireRecruits / $totalNaoRecruits * $BASE_TOTAL) - $BASE_TOTAL,
            ],
        ];

        return inertia('Portal/Dashboard/Overview/Index', ['recruits' => $recruits]);
    }

    public function viewSales()
    {
        return inertia('Portal/Dashboard/Reports/Index');
    }

    public function developerSales()
    {
        return inertia('Portal/Dashboard/Reports/Developer');
    }

    public function recordSale()
    {
        return inertia('Portal/Dashboard/RecordSale/Index');
    }
}
