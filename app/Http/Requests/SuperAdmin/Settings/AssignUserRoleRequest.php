<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = Role::find($this->integer('role_id'));

        // A missing role is reported by validation below rather than as a 403.
        return $role ? $this->user()->can('assign', $role) : $this->user()->hasRole(Role::SUPERADMIN);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')],
        ];
    }
}
