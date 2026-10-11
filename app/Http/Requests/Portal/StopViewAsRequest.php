<?php

namespace App\Http\Requests\Portal;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

// Uses the real role: while previewing, the superadmin otherwise looks like the previewed role.
class StopViewAsRequest extends FormRequest
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
        return [];
    }
}
