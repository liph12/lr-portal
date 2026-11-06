<?php

namespace App\Http\Requests\Portal\Journey;

use App\Http\Requests\Portal\Sales\SaleRequest;
use Illuminate\Foundation\Http\FormRequest;

// A dormant agent's request for reactivation: a supporting file and optional notes; only someone with an agent record sends one.
class StoreReactivationRequestRequest extends FormRequest
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
        return [
            'file' => ['required', 'file', 'max:'.SaleRequest::MAX_FILE_KB, 'mimes:jpg,jpeg,png,webp,pdf,doc,docx'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Add a supporting file for the office to review.',
            'file.mimes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
        ];
    }
}
