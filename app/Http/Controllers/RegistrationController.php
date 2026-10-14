<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\SendRegistrationCodeRequest;
use App\Http\Requests\Auth\StoreRegistrationRequest;
use App\Http\Requests\Auth\VerifyRegistrationCodeRequest;
use App\Models\Entities\Agent;
use App\Services\RegistrationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Local agent registration (guests): sponsor from the referral link's code → confirm it + email → 6-digit code → four steps + a
// password. Where they are is kept in the session (`registration` = ref, email, verified), never trusted from the page.
class RegistrationController extends Controller
{
    private const SESSION = 'registration';

    public function __construct(private RegistrationService $registration) {}

    public function start(Request $request)
    {
        $state = $request->session()->get(self::SESSION, []);
        $ref = $request->string('ref')->trim()->lower()->value() ?: ($state['ref'] ?? null);
        // A Global Partner link says so (&type=international); without it, a salesperson.
        $type = $request->query('type') === RegistrationService::TYPE_INTERNATIONAL
            ? RegistrationService::TYPE_INTERNATIONAL
            : ($request->has('ref') ? RegistrationService::TYPE_LOCAL : ($state['type'] ?? RegistrationService::TYPE_LOCAL));
        // A new referral link (or the other kind), or "use another email", starts over.
        if (($state['ref'] ?? null) !== $ref || ($state['type'] ?? null) !== $type || $request->boolean('change')) {
            $state = ['ref' => $ref, 'type' => $type];
            $request->session()->put(self::SESSION, $state);
        }
        if (! empty($state['verified'])) {
            return redirect()->route('register.details');
        }

        return inertia('User/Auth/Register', [
            'referral' => $ref,
            'type' => $type,
            'sponsor' => $this->registration->sponsor($ref),
            // Set once a code was sent: the page then asks for it.
            'email' => $state['email'] ?? null,
        ]);
    }

    public function sendCode(SendRegistrationCodeRequest $request)
    {
        $email = mb_strtolower(trim($request->validated('email')));
        $this->registration->sendCode($email);
        $ref = $request->string('ref')->trim()->lower()->value();
        $type = $request->validated('type') ?? RegistrationService::TYPE_LOCAL;
        $request->session()->put(self::SESSION, ['ref' => $ref, 'type' => $type, 'email' => $email, 'verified' => false]);

        return redirect()->route('register', array_filter(['ref' => $ref, 'type' => $type === RegistrationService::TYPE_INTERNATIONAL ? $type : null]))->with('success', "We sent a 6-digit code to {$email}.");
    }

    public function verifyCode(VerifyRegistrationCodeRequest $request)
    {
        $this->registration->verifyCode($request->session()->get(self::SESSION.'.email'), $request->validated('code'));
        $request->session()->put(self::SESSION.'.verified', true);

        return redirect()->route('register.details')->with('success', 'Email confirmed. Tell us about yourself.');
    }

    public function details(Request $request)
    {
        $state = $request->session()->get(self::SESSION, []);
        if (empty($state['verified'])) {
            return redirect()->route('register', array_filter(['ref' => $state['ref'] ?? null, 'type' => ($state['type'] ?? null) === RegistrationService::TYPE_INTERNATIONAL ? $state['type'] : null]));
        }

        return inertia('User/Auth/RegisterDetails', [
            'sponsor' => $this->registration->sponsor($state['ref']),
            'email' => $state['email'],
            'type' => $state['type'] ?? RegistrationService::TYPE_LOCAL,
            'maritalStatuses' => Agent::MARITAL_STATUSES,
        ]);
    }

    public function store(StoreRegistrationRequest $request)
    {
        $state = $request->session()->get(self::SESSION);
        $user = $this->registration->register($request->validated(), $state['email'], $state['ref'], $state['type'] ?? RegistrationService::TYPE_LOCAL);

        $request->session()->forget(self::SESSION);
        Auth::login($user);
        $request->session()->regenerate();

        return redirect($user->homeUrl())->with('success', "Welcome to Leuterio Realty, {$request->validated('first_name')}!");
    }
}
