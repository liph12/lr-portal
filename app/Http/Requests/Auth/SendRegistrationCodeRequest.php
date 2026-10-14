<?php

namespace App\Http\Requests\Auth;

use App\Services\RegistrationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

// Registration, before anything else: the sponsor from the referral link, confirmed, and an email not already in use.
class SendRegistrationCodeRequest extends FormRequest
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
        return [
            'ref' => ['required', 'string', 'max:16'],
            'type' => ['nullable', Rule::in(RegistrationService::TYPES)],
            'confirm_sponsor' => ['accepted'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email', 'unique:agents,email'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'confirm_sponsor.accepted' => 'Confirm that this is your sponsor / upline to continue.',
            'email.unique' => 'This email already has an account. Sign in instead.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (! app(RegistrationService::class)->sponsor(mb_strtolower(trim((string) $this->input('ref'))))) {
                $validator->errors()->add('ref', "This referral link isn't valid. Ask your sponsor for theirs.");
            }
        }];
    }
}
