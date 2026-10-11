<?php

namespace App\Http\Requests\Profile;

use App\Models\Entities\Agent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    // Any signed-in user edits only their own profile; the route is behind `auth`.
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();

        return [
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
                Rule::unique('agents', 'email')->ignore($user->id, 'user_id'),
            ],
            'mobile' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'gender' => ['nullable', Rule::in(['Male', 'Female'])],
            'marital_status' => ['nullable', Rule::in(Agent::MARITAL_STATUSES)],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'about' => ['nullable', 'string', 'max:255'],
            'facebook' => ['nullable', 'url', 'max:255'],
            'linkedin' => ['nullable', 'url', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'state' => 'province',
            'facebook' => 'Facebook link',
            'linkedin' => 'LinkedIn link',
        ];
    }
}
