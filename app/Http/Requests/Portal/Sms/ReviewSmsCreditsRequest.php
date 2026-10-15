<?php

namespace App\Http\Requests\Portal\Sms;

use Illuminate\Foundation\Http\FormRequest;

// Approving a credit request (the credits to give, normally the ones asked for) or disapproving it (a reason, shown to them).
class ReviewSmsCreditsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('manage_sms');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return $this->routeIs('sms.credits.approve')
            ? ['credits' => ['required', 'integer', 'min:1', 'max:1000000']]
            : ['reason' => ['required', 'string', 'max:1000']];
    }
}
