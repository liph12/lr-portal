<?php

namespace App\Http\Requests\Portal\Sales;

use Illuminate\Validation\Rule;

class StoreProjectSaleRequest extends SaleRequest
{
    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->clientRules(),
            'developer_id' => ['required', 'integer', Rule::exists('developers', 'id')],
            // A listed project must belong to the chosen developer; unlisted ones are typed by name instead.
            'developer_project_id' => [
                'nullable',
                'integer',
                Rule::exists('developer_projects', 'id')->where('developer_id', $this->integer('developer_id')),
            ],
            'project_name' => ['required_without:developer_project_id', 'nullable', 'string', 'max:255'],
            ...$this->propertyRules(),
            'proof_of_transaction' => $this->fileRule(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            ...$this->fileMessages('proof_of_transaction', 'proof of transaction'),
            'developer_id.required' => 'Select a developer.',
            'developer_project_id.exists' => 'That project does not belong to the selected developer.',
            'project_name.required_without' => 'Select a project, or enter its name if it is not listed.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            ...parent::attributes(),
            'developer_id' => 'developer',
            'developer_project_id' => 'project',
        ];
    }
}
