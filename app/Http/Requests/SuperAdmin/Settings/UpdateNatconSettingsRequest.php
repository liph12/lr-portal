<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

// Settings › NATCON (superadmin): the period, the month whose cutoff closes it, the qualifier amount, and Top Rent Managers' own period + cutoff date.
class UpdateNatconSettingsRequest extends FormRequest
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
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
            'cutoff_month' => ['required', 'date_format:Y-m'],
            'qualifier_amount' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'rental_from' => ['required', 'date'],
            'rental_to' => ['required', 'date', 'after:rental_from'],
            'rental_cutoff' => ['required', 'date', 'after_or_equal:rental_to'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['to.after' => 'The period must end after it starts.', 'cutoff_month.date_format' => 'Choose a month.', 'rental_to.after' => 'The rental period must end after it starts.', 'rental_cutoff.after_or_equal' => 'The cutoff can\'t be before the rental period ends.'];
    }
}
