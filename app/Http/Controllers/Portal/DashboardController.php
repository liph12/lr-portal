<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\Request;

// Home page for the admin and staff portals. Superadmin keeps its own tabbed dashboard.
class DashboardController extends Controller
{
    public function __construct(private StatisticsService $statistics) {}

    public function index(Request $request)
    {
        return inertia('Portal/Dashboard', [
            // Headline numbers only for roles allowed to see reports.
            'kpis' => $request->user()->can('view_reports') ? $this->statistics->summary('12m')['kpis'] : null,
        ]);
    }
}
