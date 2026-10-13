<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\SaleValidationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Sales validation: correcting a sale while validating it. Keys are the column names (SaleValidationService::EDITABLE);
// which property fields apply follows the sale's category. Measurements stay optional here: many legacy sales never
// had them, and a validator shouldn't be blocked from fixing a name because an area is missing.
class UpdateValidatedSaleRequest extends FormRequest
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
        $area = ['nullable', 'numeric', 'gt:0', 'max:99999999'];

        $rules = [
            // Editing the details is separate from validating (PATCH …/{sale}); a status here is still applied if sent.
            'status' => ['sometimes', Rule::in(SaleValidationService::STATUSES)],
            'client_first_name' => ['required', 'string', 'max:255'],
            'client_middle_name' => ['nullable', 'string', 'max:100'],
            // Legacy sales keep the client's full name in client_first_name (salesreport.clientfamilyname).
            'client_last_name' => ['nullable', 'string', 'max:100'],
            'client_mobile' => ['nullable', 'string', 'max:30'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_gender' => ['nullable', Rule::in(['Male', 'Female'])],
            // New sales store a 2-letter code, legacy ones a country name.
            'client_country' => ['nullable', 'string', 'max:100'],
            'client_address' => ['nullable', 'string', 'max:1000'],
            'client_birthdate' => ['nullable', 'date', 'before:today'],
            'unit_number' => ['nullable', 'string', 'max:100'],
            'commission_status' => ['nullable', Rule::in(SaleRequest::COMMISSION_STATUSES)],
            'term_of_payment' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:255'],
            'total_contract_price' => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'reservation_date' => ['required', 'date'],
            'project_property_type_id' => ['nullable', 'integer', Rule::exists('project_property_types', 'id')],
            'unit_type' => ['nullable', 'string', 'max:100'],
            'floor_area' => $area,
            'lot_area' => $area,
        ];

        $slips = ['remittance_date' => ['nullable', 'date'], 'commission_received' => ['nullable', 'numeric', 'min:0', 'max:99999999.99']];

        return $rules + match ($this->route('sale')->sale_type) {
            'project' => [
                'developer_id' => ['required', 'integer', Rule::exists('developers', 'id')],
                'project_name' => ['required', 'string', 'max:255'],
            ],
            'brokerage' => ['brokerage_area_id' => ['required', 'integer', Rule::exists('brokerage_areas', 'id')]] + $slips,
            'rental' => [
                'closing_agent' => ['nullable', 'string', 'max:255'],
                'partner_agent' => ['nullable', 'string', 'max:255'],
                'rental_rate' => ['nullable', 'numeric', 'gt:0', 'max:99999999.99'],
                'property_size' => ['nullable', 'string', 'max:100'],
            ] + $slips,
            default => [],
        };
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['total_contract_price.gt' => 'Total contract price must be more than 0.'];
    }
}
