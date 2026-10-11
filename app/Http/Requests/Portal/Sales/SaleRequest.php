<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Rules every sale category shares: the client, the property and its measurements, and uploads.
abstract class SaleRequest extends FormRequest
{
    public const MAX_FILE_KB = 20480;

    public const COMMISSION_STATUSES = ['Unclaimed', 'Partially Claimed', 'Fully Claimed'];

    private const FILE_TYPES = 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.';

    public function authorize(): bool
    {
        return $this->user()->can('create', AgentTransaction::class);
    }

    /**
     * @return array<string, array<mixed>>
     */
    protected function clientRules(): array
    {
        return [
            'client_firstname' => ['required', 'string', 'max:100'],
            'client_middlename' => ['nullable', 'string', 'max:100'],
            'client_lastname' => ['required', 'string', 'max:100'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_mobile' => ['required', 'string', 'max:30'],
            'client_birthdate' => ['nullable', 'date', 'before:today'],
            'client_gender' => ['nullable', Rule::in(['Male', 'Female'])],
            'client_country' => ['required', 'string', 'size:2'],
            'client_address' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Property type plus the measurements that type has: condos a unit type and floor area,
     * house & lot and townhouses floor and lot area, lot only a lot area.
     *
     * @return array<string, array<mixed>>
     */
    protected function propertyRules(): array
    {
        $type = $this->integer('project_property_type_id');

        return [
            'unit_no' => ['required', 'string', 'max:100'],
            'project_property_type_id' => ['required', 'integer', Rule::exists('project_property_types', 'id')],
            'unit_type' => [Rule::requiredIf(in_array($type, ProjectPropertyType::WITH_UNIT_TYPE, true)), 'nullable', 'string', 'max:100'],
            'floor_area' => [Rule::requiredIf(in_array($type, ProjectPropertyType::WITH_FLOOR_AREA, true)), 'nullable', 'numeric', 'gt:0', 'max:99999999'],
            'lot_area' => [Rule::requiredIf(in_array($type, ProjectPropertyType::WITH_LOT_AREA, true)), 'nullable', 'numeric', 'gt:0', 'max:99999999'],
            'total_contract_price' => ['required', 'numeric', 'gt:0'],
            'reservation_date' => ['required', 'date'],
            'payment_terms' => ['required', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'commission_status' => ['required', Rule::in(self::COMMISSION_STATUSES)],
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function fileRule(bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'max:'.self::MAX_FILE_KB,
            'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
            'mimetypes:image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/octet-stream,application/x-ole-storage,application/CDFV2',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function fileMessages(string $field, string $label): array
    {
        return [
            "{$field}.required" => "Upload the {$label}.",
            "{$field}.max" => 'The file must be 20MB or smaller.',
            "{$field}.mimes" => self::FILE_TYPES,
            "{$field}.mimetypes" => self::FILE_TYPES,
            "{$field}.uploaded" => 'The file failed to upload. It may be larger than the server allows.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'project_property_type_id.required' => 'Select a property type.',
            'unit_type.required' => 'Select the unit type.',
            'floor_area.required' => 'Enter the floor area for this property type.',
            'lot_area.required' => 'Enter the lot area for this property type.',
            'total_contract_price.gt' => 'Total contract price must be more than 0.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'client_firstname' => 'client first name',
            'client_middlename' => 'client middle name',
            'client_lastname' => 'client last name',
            'client_mobile' => 'client mobile',
            'project_property_type_id' => 'property type',
            'unit_no' => 'unit / block and lot no.',
        ];
    }
}
