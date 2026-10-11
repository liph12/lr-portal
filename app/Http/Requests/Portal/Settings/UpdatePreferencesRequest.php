<?php

namespace App\Http\Requests\Portal\Settings;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(User::PREFERENCES_PERMISSION);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'theme' => ['required', Rule::in(User::THEMES)],
            'font_size' => ['required', Rule::in(User::FONT_SIZES)],
            'links' => ['required', 'array'],
            'links.default' => ['required', Rule::in(User::LINK_MODES)],
            'links.sections' => ['present', 'array', 'max:50'],
            'links.sections.*' => ['required', Rule::in(User::LINK_MODES)],
        ];
    }

    // Section keys are menu paths (e.g. /reports); anything else isn't a section.
    public function after(): array
    {
        return [
            function (Validator $validator) {
                foreach (array_keys((array) $this->input('links.sections', [])) as $key) {
                    if (! is_string($key) || ! preg_match('#^/[a-z0-9\-/]{0,120}$#', $key)) {
                        $validator->errors()->add('links.sections', 'Unknown menu section.');

                        return;
                    }
                }
            },
        ];
    }
}
