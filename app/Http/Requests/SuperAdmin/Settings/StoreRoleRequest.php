<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use App\Services\RolePermissionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Role::class);
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['name' => RolePermissionService::slug((string) $this->input('label'))]);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:50', 'regex:/[A-Za-z0-9]/'],
            'name' => [Rule::unique('roles', 'name')],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.regex' => 'The role name needs at least one letter or number.',
            'name.unique' => 'A role with this name already exists.',
        ];
    }
}
