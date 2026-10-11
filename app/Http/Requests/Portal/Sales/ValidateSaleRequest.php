<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\SaleValidationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ValidateSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('sales_validation');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(SaleValidationService::STATUSES)]];
    }
}
