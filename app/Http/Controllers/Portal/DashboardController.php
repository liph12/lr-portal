<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\InternationalSale;
use App\Services\SalesEncodingService;
use Illuminate\Http\Request;

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

    public function recordSale(Request $request, SalesEncodingService $encoding)
    {
        $can = [
            'local' => $request->user()->can('create', AgentTransaction::class),
            'international' => $request->user()->can('create', InternationalSale::class),
        ];
        abort_unless($can['local'] || $can['international'], 403);

        return inertia('Portal/Dashboard/RecordSale/Index', ['encoding' => $encoding->state(), 'can' => $can]);
    }
}
