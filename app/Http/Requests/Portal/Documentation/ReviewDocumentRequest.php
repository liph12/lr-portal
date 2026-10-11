<?php

namespace App\Http\Requests\Portal\Documentation;

use App\Models\Entities\AgentDocument;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', AgentDocument::class);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(AgentDocument::STATUSES)],
            // The agent needs to know what to fix when a document is sent back.
            'remarks' => ['nullable', 'string', 'max:2000', Rule::requiredIf($this->input('status') === AgentDocument::STATUS_FOR_REUPLOAD)],
            'is_current' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['remarks.required' => 'Tell the agent what to fix before sending it back for re-upload.'];
    }
}
