<?php

namespace App\Http\Requests\Portal;

use Illuminate\Foundation\Http\FormRequest;

// The current user is whoever is being impersonated; ImpersonationService::stop checks that a superadmin started it.
// Not refused when there's nothing to stop (a second click, another tab already returned): that just goes home.
class StopImpersonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
