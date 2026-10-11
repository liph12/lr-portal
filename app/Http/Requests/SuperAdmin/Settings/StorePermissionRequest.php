<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Permission;
use App\Services\RolePermissionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Permission::class);
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
            'label' => ['required', 'string', 'max:60', 'regex:/[A-Za-z0-9]/'],
            'name' => [Rule::unique('permissions', 'name')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.regex' => 'The permission name needs at least one letter or number.',
            'name.unique' => 'This permission already exists.',
        ];
    }
}
