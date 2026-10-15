<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Settings › NATCON (superadmin): one edition — its year and name, period, specific cutoff, qualifier amount, and Top Rent
// Managers' own period and cutoff date.
class SaveNatconEditionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(Role::SUPERADMIN);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'year' => ['required', 'integer', 'between:2000,2100', Rule::unique('natcon_editions', 'year')->ignore($this->route('edition'))],
            'name' => ['required', 'string', 'max:100'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
            // Optional until it's known: without one, everything encoded so far counts.
            'cutoff_at' => ['nullable', 'date', 'after_or_equal:to'],
            'qualifier_amount' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'rental_from' => ['required', 'date'],
            'rental_to' => ['required', 'date', 'after:rental_from'],
            'rental_cutoff' => ['required', 'date', 'after_or_equal:rental_to'],
            'is_default' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'year.unique' => 'There is already a NATCON for that year.',
            'to.after' => 'The period must end after it starts.',
            'cutoff_at.after_or_equal' => 'The cutoff can\'t be before the period ends.',
            'rental_to.after' => 'The rental period must end after it starts.',
            'rental_cutoff.after_or_equal' => 'The rental cutoff can\'t be before the rental period ends.',
        ];
    }
}
