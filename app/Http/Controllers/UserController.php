<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ActivityLogger;
use App\Services\AuthUserService;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    private $authUserService;

    public function __construct(AuthUserService $s, private ActivityLogger $activity)
    {
        $this->authUserService = $s;
    }

    public function login()
    {
        return inertia('User/Auth/Login');
    }

    public function register()
    {
        return inertia('User/Auth/Register');
    }

    public function verify()
    {
        return inertia('User/Auth/Verify');
    }
  
    public function CreateAccount()
    {
        return inertia('User/Auth/Stepper/CreateAccount');
    }

    public function createPassword()
    {
        return inertia('User/Auth/CreatePassword');
    }

    public function passwordReset()
    {
        return inertia('User/Auth/PasswordReset');
    }

    public function passwordResetVerify()
    {
        return redirect()->intended(route('create.password'));
    }

    public function loginAttempt(Request $request)
    {
        $data = $request->only('email', 'password');
        $authorized = $this->authUserService->createSession($data, $request);

        if(!$authorized)
        {
            $this->activity->describe('auth.login_failed', 'Failed sign-in for '.$request->string('email'));

            return back()->withErrors([
                'email' => 'Invalid email or password.',
            ]);
        }

        // Correct password but the account was deactivated, resigned or terminated.
        if (! $authorized->isActive()) {
            $this->activity->describe('auth.login_blocked', "Blocked sign-in for {$authorized->status} account", $authorized);
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->withErrors([
                'email' => "This account is {$authorized->status}. Contact your administrator if this is a mistake.",
            ]);
        }

        $this->activity->describe('auth.login', 'Signed in', $authorized);

        return $this->authUserService->redirect();
    }

    public function logout(Request $request)
    {
        $this->activity->describe('auth.logout', 'Signed out', $request->user());

        Auth::logout();
        $request->session()->invalidate();
        
        return redirect('/login');
    }
}
