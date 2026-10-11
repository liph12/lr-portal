<?php

namespace App\Http\Requests\Portal\Sales;

use Illuminate\Validation\Rule;

// Rentals have no developer; the remittance slip is the proof of transaction, the deposit slip optional.
class StoreRentalSaleRequest extends SaleRequest
{
    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $agent = ['nullable', 'integer', Rule::exists('agents', 'id')];

        return [
            ...$this->clientRules(),
            ...$this->propertyRules(),
            'rental_rate' => ['required', 'numeric', 'gt:0'],
            'closing_agent_id' => $agent,
            'partner_agent_id' => [...$agent, 'different:closing_agent_id'],
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
            'rental_rate.required' => 'Enter the monthly rental rate.',
            'rental_rate.gt' => 'Rental rate must be more than 0.',
            'closing_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.different' => 'The partner agent must be someone other than the closing agent.',
        ];
    }
}
