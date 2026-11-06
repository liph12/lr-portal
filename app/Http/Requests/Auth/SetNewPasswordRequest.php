<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

// Only once the email was confirmed by its code or its link (the session's password-reset.verified).
class SetNewPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->session()->get('password-reset.verified');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()]];
    }
}
