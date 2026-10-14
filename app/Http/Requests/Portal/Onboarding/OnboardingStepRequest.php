<?php

namespace App\Http\Requests\Portal\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

// Finishing or skipping an onboarding step: only someone with an agent record has one.
class OnboardingStepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->agent !== null;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
