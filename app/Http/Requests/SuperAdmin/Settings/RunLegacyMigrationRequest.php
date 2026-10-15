<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

// Settings › Legacy migration: running the import steps on this database (never --fresh: wiping it is command-line only).
class RunLegacyMigrationRequest extends FormRequest
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
        return ['from' => ['nullable', 'string', 'in:'.implode(',', array_keys(config('legacy.steps')))]];
    }
}
