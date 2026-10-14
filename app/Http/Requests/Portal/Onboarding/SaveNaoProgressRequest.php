<?php

namespace App\Http\Requests\Portal\Onboarding;

// The webinar player's periodic save: how far in (seconds) they've watched.
class SaveNaoProgressRequest extends OnboardingStepRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return ['seconds' => ['required', 'integer', 'min:0', 'max:86400']];
    }
}
