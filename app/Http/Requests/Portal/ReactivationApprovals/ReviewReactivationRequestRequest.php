<?php

namespace App\Http\Requests\Portal\ReactivationApprovals;

use App\Models\Entities\Agent;
use App\Services\ReactivationRequestService;
use Illuminate\Foundation\Http\FormRequest;

// Approving or disapproving a reactivation request: only one within the reviewer's reach
// (ReactivationRequestService::reach). A disapproval needs a reason — the agent sees it.
class ReviewReactivationRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        $agent = $this->route('agent');

        return $agent instanceof Agent && app(ReactivationRequestService::class)->canReview($this->user(), $agent);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return $this->routeIs('reactivation-approvals.disapprove') ? ['reason' => ['required', 'string', 'max:500']] : [];
    }

    public function messages(): array
    {
        return ['reason.required' => "Say why it isn't approved — the agent sees it."];
    }
}
