<?php

namespace App\Http\Requests\Portal\Management;

// Team / sub-team photos and agent photos; agents additionally pass UserPolicy::updatePhoto.
class UploadPhotoRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        $agent = $this->route('agent');

        // An agent's photo goes with changing the agent's account; a team or sub-team logo is editing the team.
        return $agent
            ? $this->allows('change_agent_status') && $agent->user && $this->user()->can('updatePhoto', $agent->user)
            : $this->allows('edit_teams');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:20480']];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.image' => 'Choose a JPG, PNG or WEBP photo.',
            'photo.mimes' => 'Choose a JPG, PNG or WEBP photo.',
            'photo.max' => 'The photo must be 20MB or smaller.',
        ];
    }
}
