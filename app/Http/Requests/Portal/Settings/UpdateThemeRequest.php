<?php

namespace App\Http\Requests\Portal\Settings;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// The navbar's light / dark switch, saved to the account so Preferences and every device agree.
class UpdateThemeRequest extends FormRequest
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
        return ['theme' => ['required', Rule::in(User::THEMES)]];
    }
}
