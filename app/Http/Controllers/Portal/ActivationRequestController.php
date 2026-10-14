<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Journey\StoreActivationRequestRequest;
use App\Services\ActivationRequestService;

class ActivationRequestController extends Controller
{
    public function __construct(private ActivationRequestService $requests) {}

    // From the journey's last step: the request for activation + the sale's proof of transaction.
    public function store(StoreActivationRequestRequest $request)
    {
        $this->requests->submit($request->user()->agent, $request->file('request_form'), $request->file('proof_of_transaction'), $request->input('notes'));

        return back()->with('success', 'Your request for activation was sent. The office will activate your account and encode your sale.');
    }
}
