<?php

namespace App\Http\Requests\Portal\Fire;

use Illuminate\Foundation\Http\FormRequest;

// A FIRE module's exam answers: every question answered with one of its choices (A–D), sent to the training site to grade.
class SubmitFireExamRequest extends FormRequest
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
        return [
            'answers' => ['required', 'array', 'min:1', 'max:100'],
            'answers.*.question' => ['required', 'integer', 'min:1', 'distinct'],
            'answers.*.answer' => ['required', 'string', 'in:A,B,C,D,E'],
        ];
    }

    public function messages(): array
    {
        return ['answers.required' => 'Answer the questions first.'];
    }
}
