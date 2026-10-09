<?php

namespace App\Http\Requests\SuperAdmin;

use App\Models\Entities\AgentTransaction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectSaleRequest extends FormRequest
{
    public const MAX_FILES = 10;
    public const MAX_FILE_KB = 20480;

    public const COMMISSION_STATUSES = ['Unclaimed', 'Partially Claimed', 'Fully Claimed'];

    public function authorize(): bool
    {
        return $this->user()->can('create', AgentTransaction::class);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
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

            'developer_id' => ['required', 'integer', Rule::exists('developers', 'id')],
            // A listed project must belong to the chosen developer; unlisted ones are typed by name instead.
            'developer_project_id' => [
                'nullable',
                'integer',
                Rule::exists('developer_projects', 'id')->where('developer_id', $this->integer('developer_id')),
            ],
            'project_name' => ['required_without:developer_project_id', 'nullable', 'string', 'max:255'],
            'unit_no' => ['required', 'string', 'max:100'],
            'project_property_type_id' => ['required', 'integer', Rule::exists('project_property_types', 'id')],
            'unit_type' => ['nullable', 'string', 'max:100'],
            'floor_area' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'lot_area' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'total_contract_price' => ['required', 'numeric', 'gt:0'],
            'reservation_date' => ['required', 'date'],
            'payment_terms' => ['required', 'string', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'commission_status' => ['required', Rule::in(self::COMMISSION_STATUSES)],

            'files' => ['required', 'array', 'min:1', 'max:'.self::MAX_FILES],
            'files.*' => [
                'file',
                'max:'.self::MAX_FILE_KB,
                'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
                'mimetypes:image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/octet-stream,application/x-ole-storage,application/CDFV2',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.required' => 'Upload at least one proof of transaction.',
            'files.max' => 'You can upload up to '.self::MAX_FILES.' files.',
            'files.*.max' => 'Each file must be 20MB or smaller.',
            'files.*.mimes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
            'files.*.mimetypes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
            'files.*.uploaded' => 'A file failed to upload. It may be larger than the server allows.',
            'developer_id.required' => 'Select a developer.',
            'developer_project_id.exists' => 'That project does not belong to the selected developer.',
            'project_name.required_without' => 'Select a project, or enter its name if it is not listed.',
            'project_property_type_id.required' => 'Select a property type.',
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
            'developer_id' => 'developer',
            'developer_project_id' => 'project',
            'project_property_type_id' => 'property type',
            'unit_no' => 'unit / block and lot no.',
        ];
    }
}
