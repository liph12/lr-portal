<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\CommissionReceivingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// Disapproving a brokerage / rental commission slip that's still waiting: the reason is required and goes on the slip.
class DisapproveCommissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(CommissionReceivingService::class)->canOpen($this->user(), $this->route('sale')->id, $this->route('category'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'min:3', 'max:500']];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $sale = $this->route('sale');
                $details = $sale->sale_type === 'rental' ? $sale->rentalTransaction() : $sale->brokerageTransaction();
                if ($details->value('received_at') || $sale->sale_status !== 'pending') {
                    $validator->errors()->add('reason', 'Only a sale still waiting to be received can be disapproved.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['reason.required' => 'Give the reason for disapproving.', 'reason.min' => 'Give the reason for disapproving.'];
    }
}
