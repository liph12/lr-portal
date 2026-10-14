<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\NaoApprovals\ReviewNaoAttendanceRequest;
use App\Models\Entities\Agent;
use App\Services\NaoApprovalService;
use App\Support\Areas;
use Illuminate\Http\Request;
use Inertia\Inertia;

// NAO approvals: face-to-face attendances sent from onboarding, for the back office (nationwide), office secretaries (their
// branches), leaders (their team / sub-team) and sponsors (their recruits) to approve.
class NaoApprovalController extends Controller
{
    public function __construct(private NaoApprovalService $approvals) {}

    public function index(Request $request)
    {
        $reach = $this->approvals->reach($request->user());
        abort_if($reach === false, 403);
        $f = $this->approvals->filters($request->query());

        return inertia('Portal/NaoApprovals/Index', [
            'filters' => $f,
            'scope' => $this->scope($reach),
            'counts' => fn () => $this->approvals->counts($reach, $f),
            'groups' => fn () => $this->approvals->groupOptions($reach),
            'person' => fn () => $this->approvals->person($reach, $f['person']),
            // Typeahead of the sponsor / agent filter: a partial reload with ?person_q=.
            'personOptions' => Inertia::optional(fn () => $this->approvals->personOptions($reach, (string) $request->query('person_q', ''))),
            'submissions' => function () use ($reach, $f) {
                $page = $this->approvals->table($reach, $f);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
        ]);
    }

    public function approve(ReviewNaoAttendanceRequest $request, Agent $agent)
    {
        $this->approvals->approve($agent, $request->user());

        return back()->with('success', ($agent->user?->name ?? 'The agent')."'s NAO attendance is approved.");
    }

    public function disapprove(ReviewNaoAttendanceRequest $request, Agent $agent)
    {
        $this->approvals->disapprove($agent, $request->user(), $request->validated('reason'));

        return back()->with('success', ($agent->user?->name ?? 'The agent')."'s NAO attendance was disapproved. They'll see your reason.");
    }

    // What the reader covers, for the subtitle.
    private function scope(array|null $reach): array
    {
        return $reach === null
            ? ['everyone' => true]
            : ['everyone' => false, 'branches' => array_map(fn ($a) => Areas::name($a), $reach['areas']), 'leads' => (bool) ($reach['teams'] || $reach['sub_teams'])];
    }
}
