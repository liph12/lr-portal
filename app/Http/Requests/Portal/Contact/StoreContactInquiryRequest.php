<?php

namespace App\Http\Requests\Portal\Contact;

use App\Models\Entities\ContactInquiry;
use App\Services\ContactLinkService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContactInquiryRequest extends FormRequest
{
    // Public form: anyone with the agent's link may write to them.
    public function authorize(): bool
    {
        return true;
    }

    // Names are stored in Title Case whatever the visitor typed (the form does the same as they type).
    protected function prepareForValidation(): void
    {
        $this->merge(collect(['first_name', 'middle_name', 'last_name'])
            ->filter(fn ($f) => is_string($this->input($f)))
            ->mapWithKeys(fn ($f) => [$f => ContactLinkService::titleCase($this->input($f))])
            ->all());

        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'inquirer_role' => ['required', Rule::in(ContactInquiry::ROLES)],
            'inquiry_type' => ['required', Rule::in(ContactInquiry::TYPES)],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc,strict,filter', 'max:255'],
            'contact_number' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9 ()-]{7,}$/'],
            'message' => ['required', 'string', 'max:2000'],
            'consent' => ['accepted'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'inquirer_role' => 'who you are',
            'inquiry_type' => 'inquiry type',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email' => 'Enter a valid email address.',
            'contact_number.regex' => 'Enter a valid contact number.',
            'consent.accepted' => 'Please accept the privacy policy to send your inquiry.',
        ];
    }
}
