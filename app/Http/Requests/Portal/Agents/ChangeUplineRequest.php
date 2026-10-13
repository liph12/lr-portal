<?php

namespace App\Http\Requests\Portal\Agents;

use Illuminate\Foundation\Http\FormRequest;

class ChangeUplineRequest extends FormRequest
{
    public function authorize(): bool
    {
        $target = $this->route('agent')->user;

        return $target !== null && $this->user()->can('updateProfile', $target);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'upline_id' => ['required', 'integer', 'exists:agents,id'],
            // The day the agent moves to the upline's team (the transfer date).
            'date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['upline_id.required' => 'Pick the new upline.', 'date.before_or_equal' => 'The date can\'t be in the future.'];
    }
}
