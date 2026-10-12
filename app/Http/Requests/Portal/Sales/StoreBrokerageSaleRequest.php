<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\AgentBrokerageTransaction;
use Illuminate\Validation\Rule;

// Brokerage sales are encoded from the Brokerage Commission Report Slip. The remittance date stands in for the
// reservation date (cutoffs and reports go by it); the property owner's name only goes on the generated slip.
class StoreBrokerageSaleRequest extends SaleRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['reservation_date' => $this->input('remittance_date')]);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $agent = ['nullable', 'integer', Rule::exists('agents', 'id')];

        return [
            ...$this->clientRules(),
            'brokerage_area_id' => ['required', 'integer', Rule::exists('brokerage_areas', 'id')->where('status', 'active')],
            ...$this->unitRules(),
            'remittance_date' => ['required', 'date', 'before_or_equal:today'],
            'payment_terms' => ['required', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'commission_status' => ['required', Rule::in(self::COMMISSION_STATUSES)],
            'commission_received' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'company_share_rate' => ['required', 'integer', Rule::in(AgentBrokerageTransaction::COMPANY_SHARE_RATES)],
            'closing_agent_id' => $agent,
            'partner_agent_id' => [...$agent, 'different:closing_agent_id'],
            'signing_broker_id' => ['required', 'integer', Rule::exists('agents', 'id')->where('is_broker', true)],
            'property_owner' => ['required', 'string', 'max:150'],
            'contract' => $this->fileRule(),
            'proof_of_transaction' => $this->fileRule(),
            'deposit_slip' => $this->fileRule(required: false),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            ...$this->fileMessages('contract', 'contract'),
            ...$this->fileMessages('proof_of_transaction', 'proof of transaction'),
            ...$this->fileMessages('deposit_slip', 'deposit slip'),
            'brokerage_area_id.required' => 'Select a brokerage area.',
            'brokerage_area_id.exists' => 'Select a brokerage area from the list.',
            'remittance_date.before_or_equal' => "The remittance date can't be in the future.",
            'company_share_rate.in' => 'Choose 15% or 10%.',
            'closing_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.different' => 'The partner agent must be someone other than the closing agent.',
            'signing_broker_id.required' => 'Select the signing broker.',
            'signing_broker_id.exists' => 'Select a broker from the list.',
            'property_owner.required' => "Enter the property owner's name.",
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [...parent::attributes(), 'brokerage_area_id' => 'brokerage area', 'commission_received' => 'commission received', 'company_share_rate' => 'company share'];
    }
}
