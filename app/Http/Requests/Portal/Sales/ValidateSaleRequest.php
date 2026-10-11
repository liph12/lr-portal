<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\SaleValidationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ValidateSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        // A secretary may only touch sales of their own office's area.
        $validation = app(SaleValidationService::class);
        $allowed = $validation->allowedAreas($this->user());

        return $this->user()->can('sales_validation') && $allowed !== false && $validation->inAllowedArea($this->route('sale')->id, $allowed);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(SaleValidationService::STATUSES)]];
    }
}
