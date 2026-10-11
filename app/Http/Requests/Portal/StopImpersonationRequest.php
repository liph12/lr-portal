<?php

namespace App\Http\Requests\Portal;

use App\Services\ImpersonationService;
use Illuminate\Foundation\Http\FormRequest;

// The current user is whoever is being impersonated; what matters is that a superadmin started it.
class StopImpersonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->session()->has(ImpersonationService::SESSION_KEY);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
