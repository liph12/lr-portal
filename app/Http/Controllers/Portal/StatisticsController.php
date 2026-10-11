<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\Request;

// Shared by every portal; each portal's route decides who may reach it (role + `can:view_reports`).
class StatisticsController extends Controller
{
    public function __construct(private StatisticsService $statistics) {}

    public function index(Request $request)
    {
        $period = in_array($request->query('period'), StatisticsService::PERIODS, true)
            ? $request->query('period')
            : '12m';

        return inertia('Portal/Statistics', [
            'stats' => $this->statistics->summary($period),
        ]);
    }
}
