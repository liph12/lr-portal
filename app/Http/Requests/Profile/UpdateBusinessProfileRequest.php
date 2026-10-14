<?php

namespace App\Http\Requests\Profile;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

// The public business profile's own fields (Profile › Business profile): About me, mobile, social links, WhatsApp,
// and the agent's own "My Links" list.
class UpdateBusinessProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'about' => ['nullable', 'string', 'max:1000'],
            'mobile' => ['nullable', 'string', 'max:30'],
            'facebook' => ['nullable', 'url', 'max:255'],
            'instagram' => ['nullable', 'url', 'max:255'],
            'twitter' => ['nullable', 'url', 'max:255'],
            'linkedin' => ['nullable', 'url', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'links' => ['nullable', 'array', 'max:10'],
            'links.*.label' => ['required', 'string', 'max:60'],
            'links.*.url' => ['required', 'url', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'about' => 'About me',
            'facebook' => 'Facebook link',
            'instagram' => 'Instagram link',
            'twitter' => 'X link',
            'linkedin' => 'LinkedIn link',
            'whatsapp' => 'WhatsApp number',
            'links.*.label' => 'link label',
            'links.*.url' => 'link URL',
        ];
    }
}
