<?php

namespace App\Http\Requests\Portal\SuperAdmin;

use App\Services\ReportBuilderAiService;
use Illuminate\Foundation\Http\FormRequest;

// Report Builder › Ask AI: a free-text request, translated into filters by ReportBuilderAiService.
class AskReportBuilderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(ReportBuilderAiService::PERMISSION);
    }

    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
