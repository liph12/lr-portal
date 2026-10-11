<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Entities\SalesCutoff;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSalesEncodingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', SalesCutoff::class);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            // Shown to everyone who tries to record a sale while it's off.
            'message' => ['nullable', 'string', 'max:255'],
        ];
    }
}
