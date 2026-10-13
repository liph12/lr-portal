<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StartImpersonationRequest;
use App\Http\Requests\Portal\StopImpersonationRequest;
use App\Models\User;
use App\Services\ImpersonationService;

class ImpersonationController extends Controller
{
    public function __construct(private ImpersonationService $impersonation) {}

    public function store(StartImpersonationRequest $request, User $user)
    {
        $this->impersonation->start($request, $user);

        return redirect($user->homeUrl())->with('success', "You're now signed in as {$user->name}.");
    }

    public function destroy(StopImpersonationRequest $request)
    {
        if (! $request->session()->has(ImpersonationService::SESSION_KEY)) {
            return redirect()->route('dashboard.index');
        }
        $this->impersonation->stop($request);

        return redirect()->route('dashboard.index')->with('success', "You're back in your own account.");
    }
}
