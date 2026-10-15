<?php

namespace App\Http\Requests\Portal\Sms;

use App\Http\Requests\Portal\Sales\SaleRequest;
use Illuminate\Foundation\Http\FormRequest;

// Buying SMS credits: how many, and the proof of payment (any payment method — it isn't asked).
class RequestSmsCreditsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('send_sms');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'credits' => ['required', 'integer', 'min:1', 'max:1000000'],
            'proof_of_payment' => ['required', 'file', 'max:'.SaleRequest::MAX_FILE_KB, 'mimes:jpg,jpeg,png,webp,pdf,doc,docx'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'proof_of_payment.required' => 'Add the proof of your payment.',
            'proof_of_payment.mimes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
        ];
    }

    public function attributes(): array
    {
        return ['proof_of_payment' => 'proof of payment'];
    }
}
