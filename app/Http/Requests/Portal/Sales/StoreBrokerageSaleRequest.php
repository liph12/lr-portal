<?php

namespace App\Http\Requests\Portal\Sales;

use Illuminate\Validation\Rule;

// Brokerage sales belong to a brokerage area, not a developer; the remittance slip is the proof of transaction.
class StoreBrokerageSaleRequest extends SaleRequest
{
    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->clientRules(),
            'brokerage_area_id' => ['required', 'integer', Rule::exists('brokerage_areas', 'id')->where('status', 'active')],
            ...$this->propertyRules(),
            'deposit_slip' => $this->fileRule(required: false),
            'remittance_slip' => $this->fileRule(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            ...$this->fileMessages('deposit_slip', 'deposit slip'),
            ...$this->fileMessages('remittance_slip', 'remittance slip'),
            'brokerage_area_id.required' => 'Select a brokerage area.',
            'brokerage_area_id.exists' => 'Select a brokerage area from the list.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [...parent::attributes(), 'brokerage_area_id' => 'brokerage area'];
    }
}
