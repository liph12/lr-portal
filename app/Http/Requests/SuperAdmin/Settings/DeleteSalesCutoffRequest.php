<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Entities\SalesCutoff;
use Illuminate\Foundation\Http\FormRequest;

class DeleteSalesCutoffRequest extends FormRequest
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
        return [];
    }
}
