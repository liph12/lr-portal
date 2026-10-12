<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\AgentRentalTransaction;
use App\Models\Entities\AgentTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// The rent slip preview takes whatever has been filled in so far: everything optional, only shapes checked.
class PreviewRentalSlipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', AgentTransaction::class);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $id = ['nullable', 'integer'];
        $amount = ['nullable', 'numeric', 'min:0', 'max:9999999999'];

        return [
            'client_firstname' => ['nullable', 'string', 'max:100'],
            'client_middlename' => ['nullable', 'string', 'max:100'],
            'client_lastname' => ['nullable', 'string', 'max:100'],
            'unit_no' => ['nullable', 'string', 'max:255'],
            'project_property_type_id' => $id,
            'property_size' => $amount,
            'rental_rate' => $amount,
            'duration_value' => ['nullable', 'integer', 'min:0', 'max:999'],
            'duration_unit' => ['nullable', Rule::in(AgentRentalTransaction::DURATION_UNITS)],
            'remittance_date' => ['nullable', 'date'],
            'commission_received' => $amount,
            'closing_agent_id' => $id,
            'unregistered_agent_name' => ['nullable', 'string', 'max:150'],
            'partner_agent_id' => $id,
        ];
    }
}
