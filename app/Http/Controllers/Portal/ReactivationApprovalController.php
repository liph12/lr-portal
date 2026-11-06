<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\ReactivationApprovals\ReviewReactivationRequestRequest;
use App\Models\Entities\Agent;
use App\Services\ReactivationRequestService;
use Illuminate\Http\Request;

// Reactivation requests: agents FIRE activated (because they'd never sold) who then had no sale within
// Agent::FIRE_DEACTIVATE_AFTER_MONTHS, for the back office (nationwide), office secretaries (their branches), leaders
// (their team / sub-team) and sponsors (their recruits) to review.
class ReactivationApprovalController extends Controller
{
    public function __construct(private ReactivationRequestService $requests) {}

    public function index(Request $request)
    {
        $reach = $this->requests->reach($request->user());
        abort_if($reach === false, 403);
        $f = $this->requests->filters($request->query());

        return inertia('Portal/ReactivationRequests/Index', [
            'filters' => $f,
            'everyone' => $reach === null,
            'counts' => fn () => $this->requests->counts($reach, $f),
            'submissions' => function () use ($reach, $f) {
                $page = $this->requests->table($reach, $f);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
        ]);
    }

    public function approve(ReviewReactivationRequestRequest $request, Agent $agent)
    {
        $this->requests->approve($agent, $request->user());

        return back()->with('success', ($agent->user?->name ?? 'The agent')."'s account is reactivated.");
    }

    public function disapprove(ReviewReactivationRequestRequest $request, Agent $agent)
    {
        $this->requests->disapprove($agent, $request->user(), $request->validated('reason'));

        return back()->with('success', ($agent->user?->name ?? 'The agent')."'s request was disapproved. They'll see your reason.");
    }
}
