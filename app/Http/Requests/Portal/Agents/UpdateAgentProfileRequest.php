<?php

namespace App\Http\Requests\Portal\Agents;

use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Validation\Rule;

// An agent's profile edited from their profile page: the same fields as "my profile", for the agent in the URL.
class UpdateAgentProfileRequest extends UpdateProfileRequest
{
    public function authorize(): bool
    {
        $target = $this->route('agent')->user;

        return $target !== null && $this->user()->can('updateProfile', $target);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $agent = $this->route('agent');

        return [
            ...parent::rules(),
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($agent->user_id),
                Rule::unique('agents', 'email')->ignore($agent->id),
            ],
        ];
    }
}
