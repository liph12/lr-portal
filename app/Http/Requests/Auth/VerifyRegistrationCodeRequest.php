<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyRegistrationCodeRequest extends FormRequest
{
    // Only after a code was sent to the email held in this session.
    public function authorize(): bool
    {
        return filled($this->session()->get('registration.email'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['code' => ['required', 'digits:6']];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['code.digits' => 'Enter the 6-digit code from the email.'];
    }
}
