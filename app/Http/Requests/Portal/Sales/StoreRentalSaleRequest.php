<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\AgentRentalTransaction;
use Illuminate\Validation\Rule;

// Rental sales are encoded from the Rent.ph Rent Commission Report Slip. The remittance date stands in for the
// reservation date (cutoffs and reports go by it); the duration is also kept as the sale's term.
class StoreRentalSaleRequest extends SaleRequest
{
    protected function prepareForValidation(): void
    {
        $value = (int) $this->input('duration_value');
        $unit = (string) $this->input('duration_unit');

        $this->merge([
            'reservation_date' => $this->input('remittance_date'),
            'payment_terms' => $value > 0 && $unit !== '' ? $value.' '.($value === 1 ? rtrim($unit, 's') : $unit) : null,
        ]);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $agent = ['nullable', 'integer', Rule::exists('agents', 'id')];

        return [
            ...$this->clientRules(),
            'unit_no' => ['required', 'string', 'max:255'],
            'project_property_type_id' => ['required', 'integer', Rule::exists('project_property_types', 'id')],
            'property_size' => ['required', 'numeric', 'gt:0', 'max:99999999'],
            'rental_rate' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'duration_value' => ['required', 'integer', 'min:1', 'max:999'],
            'duration_unit' => ['required', Rule::in(AgentRentalTransaction::DURATION_UNITS)],
            'payment_terms' => ['required', 'string', 'max:50'],
            'remittance_date' => ['required', 'date', 'before_or_equal:today'],
            'commission_received' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'commission_status' => ['required', Rule::in(self::COMMISSION_STATUSES)],
            'remarks' => ['nullable', 'string', 'max:1000'],
            // The team and unit manager come from the closing agent, so there must be one — picked, or (no LR account yet)
            // typed in with an email to link them by once they sign up.
            'closing_agent_id' => ['required_without:unregistered_agent_name', ...$agent],
            'unregistered_agent_name' => ['nullable', 'required_without:closing_agent_id', 'string', 'max:150'],
            'unregistered_agent_email' => ['nullable', 'required_with:unregistered_agent_name', 'email', 'max:255'],
            'unregistered_agent_mobile' => ['nullable', 'string', 'max:30'],
            'partner_agent_id' => [...$agent, 'different:closing_agent_id'],
            'contract' => $this->fileRule(),
            'proof_of_transaction' => $this->fileRule(),
            'deposit_slip' => $this->fileRule(required: false),
        ];
    }

    public function after(): array
    {
        return [
            ...parent::after(),
            function (\Illuminate\Validation\Validator $validator) {
                $email = strtolower(trim((string) $this->input('unregistered_agent_email')));
                if (! $this->filled('closing_agent_id') && $email !== '' && \Illuminate\Support\Facades\DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->exists()) {
                    $validator->errors()->add('unregistered_agent_email', 'This email already has an LR account — pick them as the closing agent instead.');
                }
            },
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
            'unit_no.required' => 'Enter the unit address.',
            'property_size.required' => 'Enter the size of the property.',
            'rental_rate.required' => 'Enter the rate of rental.',
            'rental_rate.gt' => 'Rental rate must be more than 0.',
            'duration_value.required' => 'Enter the duration.',
            'duration_unit.in' => 'Choose days, months or years.',
            'remittance_date.before_or_equal' => "The remittance date can't be in the future.",
            'closing_agent_id.required_without' => 'Select the closing agent, or enter them as not yet in LR.',
            'unregistered_agent_email.required_with' => "Enter their email — it links the sale once they make an LR account.",
            'closing_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.exists' => 'Select an agent from the list.',
            'partner_agent_id.different' => 'The partner agent must be someone other than the closing agent.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [...parent::attributes(), 'commission_received' => 'amount received', 'unit_no' => 'address'];
    }
}
