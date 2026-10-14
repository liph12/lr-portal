<?php

namespace App\Http\Requests\Auth;

use App\Models\Entities\Agent;
use App\Services\RegistrationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

// The four steps and the password, once the email is confirmed (the session's registration.verified).
class StoreRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->session()->get('registration.verified');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            // 1 · Basic info
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['required', Rule::in(['Male', 'Female'])],
            'marital_status' => ['required', Rule::in(Agent::MARITAL_STATUSES)],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString(), 'after:1900-01-01'],
            'citizenship' => ['required', 'string', 'max:60'],
            // 2 · Contact
            'mobile' => ['required', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'facebook' => ['nullable', 'url', 'max:255'],
            'tin' => ['nullable', 'string', 'max:30'],
            // 3 · Address
            'address' => ['required', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:12'],
            // A global partner is based outside the Philippines.
            'country' => $this->session()->get('registration.type') === RegistrationService::TYPE_INTERNATIONAL
                ? ['required', Rule::in(array_keys(config('countries'))), Rule::notIn([Agent::DEFAULT_COUNTRY_CODE])]
                : ['prohibited'],
            // 4 · About
            'education' => ['required', 'array', 'min:1', 'max:5'],
            'education.*' => ['string', 'max:120'],
            'professions' => ['required', 'array', 'min:1', 'max:5'],
            'professions.*' => ['string', 'max:80'],
            'hobbies' => ['required', 'array', 'min:1', 'max:10'],
            'hobbies.*' => ['string', 'max:80'],
            'skills' => ['required', 'string', 'max:255'],
            'work_experience' => ['nullable', 'string', 'max:255'],
            'about' => ['nullable', 'string', 'max:255'],
            // 5 · Password
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'birthdate.before_or_equal' => 'You need to be at least 18 to register.',
            'country.not_in' => 'Global partners are based outside the Philippines. Register as a salesperson instead.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['province' => 'province', 'facebook' => 'Facebook link', 'tin' => 'TIN'];
    }
}
