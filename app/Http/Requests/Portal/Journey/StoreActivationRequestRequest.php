<?php

namespace App\Http\Requests\Portal\Journey;

use App\Http\Requests\Portal\Sales\SaleRequest;
use Illuminate\Foundation\Http\FormRequest;

// The request for activation and the proof of transaction of the sale it comes with; only someone with an agent record sends one.
class StoreActivationRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->agent !== null;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        $file = ['required', 'file', 'max:'.SaleRequest::MAX_FILE_KB, 'mimes:jpg,jpeg,png,webp,pdf,doc,docx'];

        return [
            'request_form' => $file,
            'proof_of_transaction' => $file,
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'request_form.required' => 'Add your signed request for activation.',
            'proof_of_transaction.required' => 'Add the proof of transaction of your sale.',
            '*.mimes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
        ];
    }

    public function attributes(): array
    {
        return ['request_form' => 'request for activation', 'proof_of_transaction' => 'proof of transaction'];
    }
}
