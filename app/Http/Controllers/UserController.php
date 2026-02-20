<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthUserService;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    private $authUserService;

    public function __construct(AuthUserService $s)
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
            return back()->withErrors([
                'email' => 'Invalid credentials.',
            ]);
        }

        return $this->authUserService->redirect();
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        
        return redirect('/login');
    }
}
