<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Entities\SalesCutoff;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveSalesCutoffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', SalesCutoff::class);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'month' => ['required', 'date_format:Y-m', Rule::unique('sales_cutoffs', 'month')->ignore($this->route('salesCutoff'))],
            'cutoff_at' => ['required', 'date'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }
                // A month can't close before it has started.
                if (Carbon::parse($this->input('cutoff_at'))->lt(Carbon::createFromFormat('Y-m-d', $this->input('month').'-01')->startOfDay())) {
                    $validator->errors()->add('cutoff_at', 'The cutoff must be on or after the first day of that month.');
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
            'month.unique' => 'That month already has a cutoff. Edit it instead.',
            'month.date_format' => 'Pick the sales month.',
            'cutoff_at.required' => 'Set the cutoff date and time.',
        ];
    }
}
