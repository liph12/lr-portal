<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Sales\SaleRequest;
use App\Http\Requests\Portal\Sms\RequestSmsCreditsRequest;
use App\Http\Requests\Portal\Sms\ReviewSmsCreditsRequest;
use App\Http\Requests\Portal\Sms\SendSmsRequest;
use App\Services\SemaphoreClient;
use App\Services\SmsCreditService;
use App\Services\SmsService;
use App\Support\SmsText;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use RuntimeException;

// SMS Manager (permission send_sms; manage_sms = credit requests, the company balance, everyone nationwide).
class SmsController extends Controller
{
    public function __construct(private SmsService $sms, private SmsCreditService $credits) {}

    public function index(Request $request, SemaphoreClient $semaphore)
    {
        $user = $request->user();
        $manages = $this->sms->manages($user);

        return inertia('Portal/Sms/Index', [
            'groups' => $this->sms->groups($user),
            'manages' => $manages,
            // Own credits for those who pay per message; null = on the company's balance.
            'balance' => $manages ? null : $this->credits->balance($user),
            'maxParts' => SmsText::MAX_PARTS,
            'configured' => $semaphore->configured(),
            'history' => $this->sms->history($user),
            'company' => $manages ? Inertia::defer(fn () => $this->company($semaphore)) : null,
            // One group's people (partial reload with ?members_role=), and people to add one by one (?people_q=).
            'members' => Inertia::optional(fn () => ['role' => (string) $request->query('members_role'), 'people' => $this->sms->members($user, (string) $request->query('members_role'))]),
            'peopleOptions' => Inertia::optional(fn () => $this->sms->search($user, (string) $request->query('people_q', ''))),
        ]);
    }

    public function send(SendSmsRequest $request)
    {
        $this->sms->send($request->user(), (string) $request->input('message'), $request->groups(), $request->people(), $request->numbers());

        return back()->with('success', 'Your message is on its way. Its status shows in Sent messages.');
    }

    public function credits(Request $request)
    {
        $user = $request->user();

        return inertia('Portal/Sms/Credits', [
            'manages' => $this->sms->manages($user),
            'balance' => $this->credits->balance($user),
            'ledger' => $this->credits->ledger($user),
            'requests' => $this->credits->requests($user),
            'maxFileKb' => min(SaleRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024)),
        ]);
    }

    public function requestCredits(RequestSmsCreditsRequest $request)
    {
        $this->credits->request($request->user(), (int) $request->input('credits'), $request->file('proof_of_payment'), $request->input('notes'));

        return back()->with('success', 'Your credit request was sent. The credits are added once your payment is confirmed.');
    }

    public function approve(ReviewSmsCreditsRequest $request, int $creditRequest)
    {
        $this->credits->approve($creditRequest, $request->user(), (int) $request->input('credits'));

        return back()->with('success', 'Credits approved and added.');
    }

    public function disapprove(ReviewSmsCreditsRequest $request, int $creditRequest)
    {
        $this->credits->disapprove($creditRequest, $request->user(), (string) $request->input('reason'));

        return back()->with('success', 'Credit request disapproved.');
    }

    /**
     * @return array{balance: ?float, error: ?string}
     */
    private function company(SemaphoreClient $semaphore): array
    {
        try {
            return ['balance' => $semaphore->balance(), 'error' => null];
        } catch (RuntimeException $e) {
            return ['balance' => null, 'error' => $e->getMessage()];
        }
    }
}
