<?php

namespace App\Http\Requests\Portal\GlobalPartners;

use App\Services\GlobalPartnerService;
use Illuminate\Foundation\Http\FormRequest;

// The partner's sponsor, or the back office.
class ConfirmGlobalPartnerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return app(GlobalPartnerService::class)->canManage($this->user(), $this->route('agent'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
