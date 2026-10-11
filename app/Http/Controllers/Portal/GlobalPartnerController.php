<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\GlobalPartners\ConfirmGlobalPartnerRequest;
use App\Models\Entities\Agent;
use App\Services\GlobalPartnerService;
use Illuminate\Http\Request;

// Global Partners: the list to confirm (the back office: everyone; a team leader / unit manager: their team's or
// sub-team's partners and their own recruits; an agent: their recruits) and their statistics on international sales.
class GlobalPartnerController extends Controller
{
    public function __construct(private GlobalPartnerService $partners) {}

    public function index(Request $request)
    {
        $reach = $this->reach($request);
        $f = $this->partners->filters($request->query());

        return inertia('Portal/GlobalPartners/Index', [
            'filters' => $f,
            'everyone' => $reach === null,
            // Leaders see partners recruited by others too: show who sponsored each one.
            'showSponsor' => $this->partners->coversOthers($reach),
            'counts' => fn () => $this->partners->counts($reach, $f),
            'partners' => function () use ($reach, $f) {
                $page = $this->partners->table($reach, $f);

                return ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()];
            },
        ]);
    }

    public function statistics(Request $request)
    {
        $reach = $this->reach($request);
        $f = $this->partners->filters($request->query());

        return inertia('Portal/GlobalPartners/Statistics', [
            'filters' => $f,
            'everyone' => $reach === null,
            'stats' => fn () => $this->partners->statistics($reach, $f),
        ]);
    }

    public function confirm(ConfirmGlobalPartnerRequest $request, Agent $agent)
    {
        $this->partners->confirm($agent, $request->user());

        return back()->with('success', ($agent->user?->name ?? 'The global partner').' is confirmed.');
    }

    private function reach(Request $request): array|null
    {
        $reach = $this->partners->reach($request->user());
        abort_if($reach === false, 403);

        return $reach;
    }
}
