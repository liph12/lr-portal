<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

// Forgot password, step one: an email that actually has an account.
class SendPasswordResetCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['email' => ['required', 'email', 'max:255', 'exists:users,email']];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['email.exists' => 'No account uses this email.'];
    }
}
