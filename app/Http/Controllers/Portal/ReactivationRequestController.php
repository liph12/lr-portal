<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Journey\StoreReactivationRequestRequest;
use App\Services\ReactivationRequestService;

class ReactivationRequestController extends Controller
{
    public function __construct(private ReactivationRequestService $requests) {}

    // From the journey's Activation step, once FIRE activated the agent but no sale came within the window: a
    // supporting file and optional notes.
    public function store(StoreReactivationRequestRequest $request)
    {
        $this->requests->submit($request->user()->agent, $request->file('file'), $request->input('notes'));

        return back()->with('success', 'Your request for reactivation was sent. The office will review it.');
    }
}
