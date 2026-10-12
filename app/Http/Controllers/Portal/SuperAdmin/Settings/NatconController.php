<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\UpdateNatconSettingsRequest;
use App\Services\NatconService;
use Illuminate\Support\Facades\DB;

// Settings › NATCON: next year's period, cutoff and qualifier amount without touching code.
class NatconController extends Controller
{
    public function __construct(private NatconService $natcon) {}

    public function index()
    {
        return inertia('SuperAdmin/Settings/Natcon/Index', [
            'settings' => $this->natcon->settings(),
            // The months that have a cutoff, to pick from (a month without one counts everything keyed in so far).
            'cutoffs' => DB::table('sales_cutoffs')->orderByDesc('month')->limit(36)->get(['month', 'cutoff_at']),
        ]);
    }

    public function update(UpdateNatconSettingsRequest $request)
    {
        $this->natcon->save($request->validated(), $request->user());

        return back()->with('success', 'NATCON settings saved.');
    }
}
