<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

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
        $dashboard = $user->roles()->value('name').'.index';

        // Roles created in Settings (agent, unit_manager, …) have no portal yet; land them on their profile.
        return redirect()->intended(Route::has($dashboard) ? route($dashboard) : route('profile.edit'));
    }
}