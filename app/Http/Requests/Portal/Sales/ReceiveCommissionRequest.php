<?php

namespace App\Http\Requests\Portal\Sales;

use App\Services\CommissionReceivingService;
use App\Services\CommissionSlipImage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// Receiving a brokerage or rental commission, signed: the category's permission, within the receiver's areas, while it still waits.
class ReceiveCommissionRequest extends FormRequest
{
    // A drawn signature is small; this caps what a pasted image could be.
    private const MAX_BYTES = 600 * 1024;

    public function authorize(): bool
    {
        $sale = $this->route('sale');

        return app(CommissionReceivingService::class)->canOpen($this->user(), $sale->id, $this->route('category'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'signature' => ['required', 'string', 'starts_with:data:image/png;base64,', 'max:'.(int) (self::MAX_BYTES * 4 / 3 + 64)],
            'received_on' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }
                $png = $this->signaturePng();
                $size = $png ? @getimagesizefromstring($png) : false;
                if (! $size || $size['mime'] !== 'image/png' || $size[0] > 3000 || $size[1] > 1500) {
                    $validator->errors()->add('signature', 'The signature could not be read. Clear it and sign again.');
                } elseif (! app(CommissionSlipImage::class)->trimmed($png)) {
                    $validator->errors()->add('signature', 'Sign in the box before receiving.');
                }
                $sale = $this->route('sale');
                $details = $sale->sale_type === 'rental' ? $sale->rentalTransaction() : $sale->brokerageTransaction();
                if ($details->value('received_at')) {
                    $validator->errors()->add('signature', 'This sale was already received.');
                } elseif ($sale->sale_status !== 'pending') {
                    $validator->errors()->add('signature', 'This sale was disapproved; it can no longer be received here.');
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
            'signature.required' => 'Sign in the box before receiving.',
            'signature.*' => 'The signature could not be read. Clear it and sign again.',
            'received_on.required' => 'Choose the date it was received.',
            'received_on.before_or_equal' => "The date received can't be in the future.",
        ];
    }

    // The signature as PNG bytes.
    public function signaturePng(): ?string
    {
        $data = base64_decode(substr((string) $this->input('signature'), strlen('data:image/png;base64,')), true);

        return $data === false ? null : $data;
    }
}
