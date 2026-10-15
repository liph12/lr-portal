<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\RunLegacyMigrationRequest;
use App\Services\Legacy\LegacyMigration;
use App\Services\Legacy\LegacyMigrationLauncher;
use Inertia\Inertia;
use RuntimeException;

// Settings › Legacy migration (developers): the legacy database, the import steps and how the last run went, the commands for
// deploy day, and a way to run the import here.
class LegacyMigrationController extends Controller
{
    public function __construct(private LegacyMigration $migration) {}

    public function index()
    {
        return inertia('SuperAdmin/Settings/LegacyMigration/Index', [
            'steps' => collect($this->migration->steps())->map(fn ($label, $command) => ['command' => $command, 'label' => $label])->values(),
            'latest' => $this->migration->latest(),
            'running' => $this->migration->running(),
            // information_schema of a large database takes a moment: after the page.
            'source' => Inertia::defer(fn () => $this->migration->source()),
            'excluded' => config('legacy.excluded_tables'),
        ]);
    }

    public function run(RunLegacyMigrationRequest $request, LegacyMigrationLauncher $launcher)
    {
        try {
            $runId = $this->migration->queue($request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
        $launcher->launch($runId);

        return back()->with('success', 'Legacy migration started. Its progress shows here.');
    }
}
