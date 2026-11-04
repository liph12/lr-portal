<?php

namespace App\Http\Requests\Portal\Reports;

use App\Services\RecruitAnalysisService;
use Illuminate\Foundation\Http\FormRequest;

// Recruits Progress › Send report: the team / sub-team and range on the page; the analysis itself is the one cached for them.
class SendRecruitAnalysisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(RecruitAnalysisService::SEND_PERMISSION);
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id', 'required_without:sub_team_id'],
            'sub_team_id' => ['nullable', 'integer', 'exists:sub_teams,id'],
            'audience' => ['required', 'in:'.implode(',', RecruitAnalysisService::AUDIENCES)],
        ];
    }
}
