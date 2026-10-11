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
        $home = $user->homeUrl();
        $intended = session()->pull('url.intended');

        // Only honour a remembered page inside the user's own area; otherwise a staff member who once
        // opened a superadmin link would land on a "Forbidden" page right after signing in.
        $prefix = $user->portal() ? '/'.$user->portal() : null;
        $path = $intended ? (string) parse_url($intended, PHP_URL_PATH) : null;
        $allowed = $path && ($path === '/profile' || ($prefix && str_starts_with($path, $prefix.'/')));

        return redirect($allowed ? $intended : $home);
    }
}