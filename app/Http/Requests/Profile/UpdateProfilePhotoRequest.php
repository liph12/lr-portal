<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfilePhotoRequest extends FormRequest
{
    public const MAX_FILE_KB = 20480;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'photo' => [
                'required',
                'file',
                'max:'.self::MAX_FILE_KB,
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'dimensions:min_width=96,min_height=96',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Choose a photo to upload.',
            'photo.max' => 'The photo must be 20MB or smaller.',
            'photo.mimes' => 'Use a JPG, PNG or WEBP photo.',
            'photo.mimetypes' => 'Use a JPG, PNG or WEBP photo.',
            'photo.dimensions' => 'The photo must be at least 96 × 96 pixels.',
            'photo.uploaded' => 'The photo failed to upload. It may be larger than the server allows.',
        ];
    }
}
