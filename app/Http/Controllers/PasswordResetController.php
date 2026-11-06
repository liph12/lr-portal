<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\SendPasswordResetCodeRequest;
use App\Http\Requests\Auth\SetNewPasswordRequest;
use App\Http\Requests\Auth\VerifyPasswordResetCodeRequest;
use App\Services\PasswordResetService;
use Illuminate\Http\Request;

// Forgot password (guests): email → a 6-digit code and a link, either confirms it → set a new password. Where they are
// is kept in the session (`password-reset` = email, verified), never trusted from the page.
class PasswordResetController extends Controller
{
    private const SESSION = 'password-reset';

    public function __construct(private PasswordResetService $passwordReset) {}

    public function show(Request $request)
    {
        $state = $request->session()->get(self::SESSION, []);

        return inertia('User/Auth/PasswordReset', ['email' => $state['email'] ?? null]);
    }

    public function send(SendPasswordResetCodeRequest $request)
    {
        $email = mb_strtolower(trim($request->validated('email')));
        $this->passwordReset->send($email);
        $request->session()->put(self::SESSION, ['email' => $email, 'verified' => false]);

        return redirect()->route('password.reset')->with('success', "We sent a 6-digit code and a reset link to {$email}.");
    }

    public function verifyCode(VerifyPasswordResetCodeRequest $request)
    {
        $this->passwordReset->verifyCode($request->session()->get(self::SESSION.'.email'), $request->validated('code'));
        $request->session()->put(self::SESSION.'.verified', true);

        return redirect()->route('password.reset.new');
    }

    // The emailed link.
    public function verifyLink(Request $request)
    {
        $email = mb_strtolower(trim((string) $request->query('email')));
        $token = (string) $request->query('token');

        if (! $email || ! $token || ! $this->passwordReset->verifyToken($email, $token)) {
            return redirect()->route('password.reset')->with('error', 'This link is invalid or expired. Ask for a new one.');
        }

        $request->session()->put(self::SESSION, ['email' => $email, 'verified' => true]);

        return redirect()->route('password.reset.new');
    }

    public function newPassword(Request $request)
    {
        $state = $request->session()->get(self::SESSION, []);
        if (empty($state['verified'])) {
            return redirect()->route('password.reset');
        }

        return inertia('User/Auth/CreatePassword', ['email' => $state['email']]);
    }

    public function update(SetNewPasswordRequest $request)
    {
        $email = $request->session()->get(self::SESSION.'.email');
        $this->passwordReset->reset($email, $request->validated('password'));
        $request->session()->forget(self::SESSION);

        return redirect()->route('login')->with('success', 'Password updated. Sign in with your new password.');
    }
}
