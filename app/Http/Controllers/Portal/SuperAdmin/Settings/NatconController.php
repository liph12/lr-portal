<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\ManageNatconEditionRequest;
use App\Http\Requests\SuperAdmin\Settings\SaveNatconEditionRequest;
use App\Models\Entities\NatconEdition;
use App\Services\NatconService;

// Settings › NATCON: the editions (NATCON 2026, 2027…) — period, cutoff and qualifier amount each — and which one /natcon shows.
class NatconController extends Controller
{
    public function __construct(private NatconService $natcon) {}

    public function index()
    {
        return inertia('SuperAdmin/Settings/Natcon/Index', [
            'editions' => NatconEdition::orderByDesc('year')->get()->map(fn (NatconEdition $e) => $this->natcon->edition($e->year))->all(),
        ]);
    }

    public function store(SaveNatconEditionRequest $request)
    {
        $edition = $this->natcon->save(null, $request->validated(), $request->user());

        return back()->with('success', "{$edition->name} added.");
    }

    public function update(SaveNatconEditionRequest $request, NatconEdition $edition)
    {
        $this->natcon->save($edition, $request->validated(), $request->user());

        return back()->with('success', "{$edition->name} saved.");
    }

    public function makeDefault(ManageNatconEditionRequest $request, NatconEdition $edition)
    {
        $this->natcon->makeDefault($edition);

        return back()->with('success', "{$edition->name} is now the NATCON everyone sees first.");
    }

    public function destroy(ManageNatconEditionRequest $request, NatconEdition $edition)
    {
        $this->natcon->delete($edition);

        return back()->with('success', "{$edition->name} deleted.");
    }
}
