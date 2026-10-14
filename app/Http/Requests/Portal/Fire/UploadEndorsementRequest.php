<?php

namespace App\Http\Requests\Portal\Fire;

use Illuminate\Foundation\Http\FormRequest;

// The signed FIRE endorsement letter: a scan or photo (PDF / image) or a Word file, up to 20MB.
class UploadEndorsementRequest extends FormRequest
{
    public const MAX_FILE_KB = 20480;

    public function authorize(): bool
    {
        return $this->user()?->agent !== null;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['endorsementLetter' => ['required', 'file', 'max:'.self::MAX_FILE_KB, 'mimes:pdf,jpg,jpeg,png,webp,doc,docx']];
    }

    public function messages(): array
    {
        return [
            'endorsementLetter.required' => 'Choose your signed endorsement letter.',
            'endorsementLetter.mimes' => 'Use a PDF, an image (JPG, PNG, WEBP) or a Word file.',
        ];
    }
}
