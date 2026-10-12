<?php

namespace App\Http\Requests\Portal\Management;

use Illuminate\Validation\Rule;

// Same reach as changing an agent's type or status: admins can't touch admins or superadmins.
class UpdateDesignationRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        $user = $this->route('agent')->user;

        return $this->allows('edit_designation') && $user && $this->user()->can('updateStatus', $user);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'unit_manager_by' => ['required', Rule::in(['none', 'rate', 'dashboard'])],
            'unit_manager_since' => ['nullable', 'required_unless:unit_manager_by,none', 'date', 'before_or_equal:today'],
            'is_broker' => ['required', 'boolean'],
            'broker_since' => ['nullable', 'required_if_accepted:is_broker', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'unit_manager_since.required_unless' => 'Choose the date of the promotion.',
            'broker_since.required_if_accepted' => 'Choose the date they became a broker.',
            '*.before_or_equal' => "The date can't be in the future.",
        ];
    }
}
