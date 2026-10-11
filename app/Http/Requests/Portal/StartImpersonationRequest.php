<?php

namespace App\Http\Requests\Portal;

use App\Models\Role;
use App\Services\ImpersonationService;
use Illuminate\Foundation\Http\FormRequest;

// Only a real superadmin, and not while already signed in as someone else.
class StartImpersonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->reallyHasRole(Role::SUPERADMIN) && ! $this->session()->has(ImpersonationService::SESSION_KEY);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
