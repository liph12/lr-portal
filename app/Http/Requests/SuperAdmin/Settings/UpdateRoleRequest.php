<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('role'));
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:50', Rule::unique('roles', 'label')->ignore($this->route('role'))],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['label.unique' => 'Another role already uses this name.'];
    }
}
