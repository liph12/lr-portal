<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\CommissionReceivingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// Correcting the date a brokerage / rental commission was received (the slip is signed again with it).
class ChangeReceivedDateRequest extends FormRequest
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
        return ['received_on' => ['required', 'date', 'before_or_equal:today']];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $sale = $this->route('sale');
                $details = $sale->sale_type === 'rental' ? $sale->rentalTransaction() : $sale->brokerageTransaction();
                if (! $details->value('received_at')) {
                    $validator->errors()->add('received_on', 'This sale has not been received yet.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['received_on.before_or_equal' => "The date received can't be in the future."];
    }
}
