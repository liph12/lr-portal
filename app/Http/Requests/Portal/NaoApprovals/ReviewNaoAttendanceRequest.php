<?php

namespace App\Http\Requests\Portal\NaoApprovals;

use App\Models\Entities\Agent;
use App\Services\NaoApprovalService;
use Illuminate\Foundation\Http\FormRequest;

// Approving or disapproving a NAO attendance: only one within the reviewer's reach (NaoApprovalService::reach). A
// disapproval needs a reason — the agent sees it.
class ReviewNaoAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $agent = $this->route('agent');

        return $agent instanceof Agent && app(NaoApprovalService::class)->canReview($this->user(), $agent);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return $this->routeIs('nao-approvals.disapprove') ? ['reason' => ['required', 'string', 'max:500']] : [];
    }

    public function messages(): array
    {
        return ['reason.required' => "Say why it isn't approved — the agent sees it."];
    }
}
