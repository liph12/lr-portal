<?php

namespace App\Http\Requests\Portal\Onboarding;

use App\Http\Requests\Portal\Sales\SaleRequest;

// "Yes, I attended the NAO": a proof (photo, selfie or screenshot — or a PDF / Word certificate) and the date it was held.
class StoreNaoAttendanceRequest extends OnboardingStepRequest
{
    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'proof' => ['required', 'file', 'max:'.SaleRequest::MAX_FILE_KB, 'mimes:jpg,jpeg,png,webp,pdf,doc,docx'],
            'attended_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'proof.required' => 'Add a photo, selfie or screenshot of your NAO attendance.',
            'proof.mimes' => 'Only images (JPG, PNG, WEBP), PDF or Word (DOC, DOCX) files are allowed.',
            'attended_on.before_or_equal' => "The NAO date can't be in the future.",
        ];
    }

    public function attributes(): array
    {
        return ['attended_on' => 'NAO date', 'proof' => 'proof of attendance'];
    }
}
