<?php

namespace App\Http\Requests\Portal\Management;

// Team / sub-team photos and agent photos; agents additionally pass UserPolicy::updatePhoto.
class UploadPhotoRequest extends ManagementRequest
{
    public function authorize(): bool
    {
        $agent = $this->route('agent');

        return parent::authorize() && (! $agent || ($agent->user && $this->user()->can('updatePhoto', $agent->user)));
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
