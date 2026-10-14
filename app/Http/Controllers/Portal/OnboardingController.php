<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Onboarding\OnboardingStepRequest;
use App\Http\Requests\Portal\Onboarding\SaveNaoProgressRequest;
use App\Http\Requests\Portal\Onboarding\StoreNaoAttendanceRequest;
use App\Http\Requests\Portal\Sales\SaleRequest;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Services\NaoService;
use App\Services\OnboardingService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

// Onboarding for new local agents (OnboardingService): the welcome page, their profile photo (uploaded through the usual
// POST /profile/photo, cropped first), then the NAO (NaoService). Anyone may open the pages; only those who need it are sent here.
class OnboardingController extends Controller
{
    public function __construct(private OnboardingService $onboarding, private NaoService $nao) {}

    public function welcome()
    {
        return inertia('Portal/Onboarding/Welcome');
    }

    public function photo()
    {
        return inertia('Portal/Onboarding/Photo', [
            // Photos are compressed in the browser first; this is the ceiling PHP will actually accept.
            'maxPhotoKb' => min(UpdateProfilePhotoRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024)),
        ]);
    }

    public function completePhoto(OnboardingStepRequest $request)
    {
        $agent = $request->user()->agent;
        if (! $agent->avatar) {
            throw ValidationException::withMessages(['photo' => 'Add your profile photo first.']);
        }
        $this->onboarding->complete($agent, 'photo');

        return redirect()->route('onboarding.nao')->with('success', 'Your profile photo is set.');
    }

    public function nao(Request $request)
    {
        $agent = $request->user()->agent ?? abort(404);

        return inertia('Portal/Onboarding/Nao', [
            'nao' => $this->nao->state($agent),
            'maxFileKb' => min(SaleRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024)),
        ]);
    }

    public function submitAttendance(StoreNaoAttendanceRequest $request)
    {
        $agent = $request->user()->agent;
        $this->nao->submitAttendance($agent, $request->file('proof'), $request->validated('attended_on'));
        $this->onboarding->complete($agent, 'nao');

        return redirect()->route('onboarding.nao')->with('success', 'Sent. Ask your sponsor to approve your NAO attendance.');
    }

    public function chooseWebinar(OnboardingStepRequest $request)
    {
        $this->nao->chooseWebinar($request->user()->agent);

        return redirect()->route('onboarding.nao');
    }

    // Saved by the player while it plays (an Inertia partial reload), and once more as the page is left (a keepalive
    // request that only needs the status).
    public function saveProgress(SaveNaoProgressRequest $request)
    {
        $agent = $request->user()->agent;
        if ($this->nao->saveProgress($agent, (int) $request->validated('seconds')) >= 100) {
            $this->onboarding->complete($agent, 'nao');
        }

        return $request->header('X-Inertia') ? redirect()->route('onboarding.nao') : response()->noContent();
    }

    // "Skip for now": no welcome page again this session.
    public function skip(OnboardingStepRequest $request)
    {
        $request->session()->put(OnboardingService::SKIPPED, true);

        return redirect()->route('dashboard.index');
    }
}
