<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;

class AuthUserService
{
    public function createSession($credentials, $request)
    {
        if(Auth::guard('web')->attempt($credentials))
        {
            $request->session()->regenerate();

            return Auth::user();
        }

        return null;
    }

    public function redirect()
    {
        $user = Auth::user();
        $role = $user->roles[0];
        $dashboard = $role->name.'.index';

        return redirect()->intended(route($dashboard));
    }
}