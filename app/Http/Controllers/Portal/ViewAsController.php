<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StartViewAsRequest;
use App\Http\Requests\Portal\StopViewAsRequest;
use App\Models\Role;
use App\Services\ViewAsService;

class ViewAsController extends Controller
{
    public function __construct(private ViewAsService $viewAs) {}

    public function store(StartViewAsRequest $request)
    {
        $role = Role::where('name', $request->validated('role'))->firstOrFail();
        $this->viewAs->start($request->user(), $role);

        // Land where that role lands, the same way sign-in does.
        $request->user()->viewAs($role);

        return redirect($request->user()->homeUrl())->with('success', "You're now viewing the portal as {$role->label}.");
    }

    public function destroy(StopViewAsRequest $request)
    {
        $this->viewAs->stop($request->user(), $request);

        return redirect()->route('dashboard.index')->with('success', "You're back to Superadmin.");
    }
}
