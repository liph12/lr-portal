<?php

namespace App\Http\Requests\Portal\Settings;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// The genealogy canvas's "recruits per card" and layout controls, saved to the account like the rest of Preferences.
class UpdateGenealogyPreferenceRequest extends FormRequest
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
        // The canvas sends whichever of its two controls changed.
        return [
            'genealogy_per_branch' => ['required_without:genealogy_layout', 'integer', Rule::in(User::GENEALOGY_SIZES)],
            'genealogy_layout' => ['required_without:genealogy_per_branch', Rule::in(User::GENEALOGY_LAYOUTS)],
        ];
    }
}
