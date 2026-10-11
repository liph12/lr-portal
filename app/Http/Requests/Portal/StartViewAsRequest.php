<?php

namespace App\Http\Requests\Portal;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartViewAsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->reallyHasRole(Role::SUPERADMIN);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'role' => ['required', 'string', Rule::exists('roles', 'name'), Rule::notIn([Role::SUPERADMIN])],
        ];
    }
}
