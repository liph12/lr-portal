<?php

namespace App\Http\Requests\Portal\Documentation;

use App\Models\Entities\AgentDocument;
use Illuminate\Foundation\Http\FormRequest;

class CommentDocumentRequest extends FormRequest
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
        return ['body' => ['required', 'string', 'max:2000']];
    }
}
