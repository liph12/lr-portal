<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Fire\SubmitFireExamRequest;
use App\Models\Entities\Agent;
use App\Services\FireTrainingService;
use Illuminate\Http\Request;
use RuntimeException;

// FIRE inside the portal (FireTrainingService → realestatetraining.ph): the modules, one module's video and
// slides, and its exam. Every agent may take it; the training site keeps the records.
class FireTrainingController extends Controller
{
    public function __construct(private FireTrainingService $fire) {}

    public function index(Request $request)
    {
        $agent = $this->agent($request);
        try {
            $member = $this->fire->resolve($agent);
            $modules = $member['requires_endorsement'] ? [] : $this->fire->modules($agent);
            $this->fire->syncPasses($agent, $modules);
        } catch (RuntimeException $e) {
            return inertia('Portal/Fire/Index', ['modules' => [], 'endorsement' => false, 'error' => $e->getMessage(), 'passScore' => FireTrainingService::PASS_SCORE]);
        }

        return inertia('Portal/Fire/Index', [
            'modules' => $modules,
            // The training site wants an endorsement letter before this account may start.
            'endorsement' => $member['requires_endorsement'],
            'error' => null,
            'passScore' => FireTrainingService::PASS_SCORE,
        ]);
    }

    public function show(Request $request, int $module)
    {
        return $this->modulePage($request, $module, 'Portal/Fire/Module');
    }

    // A new question order every time the exam opens (each attempt, each retake); answers keep their question numbers.
    public function exam(Request $request, int $module)
    {
        return $this->modulePage($request, $module, 'Portal/Fire/Exam', ['result' => $request->session()->get('fire_result')], shuffle: true);
    }

    public function submit(SubmitFireExamRequest $request, int $module)
    {
        try {
            $result = $this->fire->submit($request->user()->agent, $module, $request->validated('answers'));
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fire.exam', $module)->with('fire_result', $result);
    }

    private function modulePage(Request $request, int $module, string $page, array $extra = [], bool $shuffle = false)
    {
        $agent = $this->agent($request);
        try {
            $exam = $this->fire->exam($agent, $module);
            // Where "Next module" goes: the next one in the list, if any.
            $ids = array_column($this->fire->modules($agent), 'id');
            $at = array_search($module, $ids, true);
            $next = $at === false ? null : ($ids[$at + 1] ?? null);
        } catch (RuntimeException $e) {
            return redirect()->route('fire.index')->with('error', $e->getMessage());
        }

        if ($shuffle) {
            shuffle($exam['questions']);
        }

        return inertia($page, $exam + ['next' => $next, 'count' => count($ids), 'passScore' => FireTrainingService::passScore(count($exam['questions']) ?: 10)] + $extra);
    }

    private function agent(Request $request): Agent
    {
        return $request->user()->agent ?? abort(404);
    }
}
