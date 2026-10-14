<?php

namespace App\Http\Requests\SuperAdmin\Settings;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

// Adding or editing a dashboard poster (superadmin): the image (required when adding), a title, an optional link — an in-app
// path like /natcon or an https address — and optional dates it shows between.
class SavePosterRequest extends FormRequest
{
    public const MAX_IMAGE_KB = 20480;

    public function authorize(): bool
    {
        return $this->user()->hasRole(Role::SUPERADMIN);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'image' => [$this->route('poster') ? 'nullable' : 'required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.self::MAX_IMAGE_KB],
            'link_url' => ['nullable', 'string', 'max:2048', 'regex:~^(/(?!/)\S*|https?://\S+)$~'],
            'starts_on' => ['nullable', 'date_format:Y-m-d'],
            'ends_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'Choose the poster image.',
            'link_url.regex' => 'Use a page in the portal (like /natcon) or a full https:// address.',
            'ends_on.after_or_equal' => 'The last day can\'t be before the first day.',
        ];
    }
}
