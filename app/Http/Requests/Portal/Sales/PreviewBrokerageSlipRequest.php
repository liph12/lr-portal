<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\AgentBrokerageTransaction;
use App\Models\Entities\AgentTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// The slip preview takes whatever has been filled in so far: everything optional, only shapes checked.
class PreviewBrokerageSlipRequest extends FormRequest
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

        return [
            'client_firstname' => ['nullable', 'string', 'max:100'],
            'client_middlename' => ['nullable', 'string', 'max:100'],
            'client_lastname' => ['nullable', 'string', 'max:100'],
            'brokerage_area_id' => $id,
            'project_property_type_id' => $id,
            'remittance_date' => ['nullable', 'date'],
            'commission_received' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'company_share_rate' => ['nullable', 'integer', Rule::in(AgentBrokerageTransaction::COMPANY_SHARE_RATES)],
            'closing_agent_id' => $id,
            'partner_agent_id' => $id,
            'signing_broker_id' => $id,
            'property_owner' => ['nullable', 'string', 'max:150'],
        ];
    }
}
