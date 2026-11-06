<?php

namespace App\Services;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Forgot password (guests): one email carries both a 6-digit code and a reset link — whichever the agent uses first
// confirms them, then they set a new password. Same cache-backed pattern as RegistrationService's email code.
class PasswordResetService
{
    private const CODE_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    private const RESEND_SECONDS = 60;

    public function __construct(private ActivityLogger $activity) {}

    public function send(string $email): void
    {
        $key = $this->key($email);
        if (Cache::has("{$key}:sent")) {
            throw ValidationException::withMessages(['email' => 'A code was just sent. Wait a minute before asking for another.']);
        }

        $code = (string) random_int(100000, 999999);
        $token = Str::random(40);
        Cache::put($key, ['code_hash' => Hash::make($code), 'token_hash' => hash('sha256', $token), 'attempts' => 0], now()->addMinutes(self::CODE_MINUTES));
        Cache::put("{$key}:sent", true, now()->addSeconds(self::RESEND_SECONDS));

        Mail::to($email)->send(new PasswordResetMail($code, route('password.reset.link', ['email' => $email, 'token' => $token]), self::CODE_MINUTES));
    }

    public function verifyCode(string $email, string $code): void
    {
        $key = $this->key($email);
        $entry = Cache::get($key);
        if (! $entry) {
            throw ValidationException::withMessages(['code' => 'This code has expired. Send a new one.']);
        }
        if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            throw ValidationException::withMessages(['code' => 'Too many tries. Send a new code.']);
        }
        if (! Hash::check($code, $entry['code_hash'])) {
            Cache::put($key, ['attempts' => $entry['attempts'] + 1] + $entry, now()->addMinutes(self::CODE_MINUTES));
            throw ValidationException::withMessages(['code' => "That code isn't right."]);
        }

        Cache::forget($key);
    }

    // The emailed link: true once, then spent — same cache entry the code uses.
    public function verifyToken(string $email, string $token): bool
    {
        $key = $this->key($email);
        $entry = Cache::get($key);
        if (! $entry || ! hash_equals($entry['token_hash'], hash('sha256', $token))) {
            return false;
        }
        Cache::forget($key);

        return true;
    }

    public function reset(string $email, string $password): void
    {
        $user = User::where('email', $email)->firstOrFail();
        $user->update(['password' => $password]);

        $this->activity->describe('auth.password_reset', "{$user->name} reset their password", $user);
    }

    private function key(string $email): string
    {
        return 'password-reset:'.sha1(mb_strtolower(trim($email)));
    }
}
