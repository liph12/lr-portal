<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// Making an edition the default, or deleting one (never the default: /natcon would have nothing to show).
class ManageNatconEditionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(Role::SUPERADMIN);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($this->isMethod('delete') && $this->route('edition')->is_default) {
                $validator->errors()->add('edition', 'Make another NATCON the default before deleting this one.');
            }
        }];
    }
}
