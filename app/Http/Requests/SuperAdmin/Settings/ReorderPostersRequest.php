<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

// The dashboard posters' new order (superadmin): every poster's id, first to last.
class ReorderPostersRequest extends FormRequest
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
        return ['ids' => ['required', 'array'], 'ids.*' => ['integer', 'distinct', 'exists:dashboard_posters,id']];
    }
}
