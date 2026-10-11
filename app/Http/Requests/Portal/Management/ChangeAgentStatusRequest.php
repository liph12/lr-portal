<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\User;
use Illuminate\Validation\Rule;

class ChangeAgentStatusRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        $user = $this->route('agent')->user;

        return parent::authorize() && $user && $this->user()->can('updateStatus', $user);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in(User::STATUSES)]];
    }
}
