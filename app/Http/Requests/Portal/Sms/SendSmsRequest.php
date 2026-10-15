<?php

namespace App\Http\Requests\Portal\Sms;

use App\Services\SmsCreditService;
use App\Services\SmsService;
use App\Support\SmsText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

// A text message to people picked in reach (whole groups by role, then added / removed one by one) and / or typed-in numbers.
class SendSmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('send_sms');
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:1000'],
            'groups' => ['array'],
            'groups.*' => ['string', 'distinct'],
            'people' => ['array', 'max:100000'],
            'people.*' => ['integer'],
            'numbers' => ['nullable', 'string', 'max:20000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            if (SmsText::parts((string) $this->input('message')) > SmsText::MAX_PARTS) {
                $validator->errors()->add('message', 'Keep the message within '.SmsText::MAX_PARTS.' SMS parts.');
            }
            $sms = app(SmsService::class);
            $allowed = array_column($sms->groups($this->user()), 'role');
            if ($outside = array_diff($this->groups(), $allowed)) {
                $validator->errors()->add('groups', 'You can\'t send to: '.implode(', ', $outside).'.');
            }
            if (count($sms->reachable($this->user(), $this->people())) < count($this->people())) {
                $validator->errors()->add('people', 'Some of the people picked can\'t be texted by you (outside your reach, inactive or without a mobile number). Reload the page and pick again.');
            }
            $numbers = SmsText::numbers($this->input('numbers'));
            if ($numbers['invalid']) {
                $validator->errors()->add('numbers', 'Not Philippine mobile numbers: '.implode(', ', array_slice($numbers['invalid'], 0, 10)).(count($numbers['invalid']) > 10 ? '…' : '').'.');
            }
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $count = count($sms->recipients($this->user(), $this->people(), $numbers['valid']));
            if ($count === 0) {
                $validator->errors()->add('groups', 'Add at least one person or mobile number.');
            } elseif (! $sms->manages($this->user())) {
                $needed = $count * SmsText::parts((string) $this->input('message'));
                $balance = app(SmsCreditService::class)->balance($this->user());
                if ($needed > $balance) {
                    $validator->errors()->add('message', "This needs {$needed} credits; you have {$balance}. Request more credits first.");
                }
            }
        }];
    }

    /**
     * @return string[]
     */
    public function groups(): array
    {
        return array_values(array_filter((array) $this->input('groups', []), 'is_string'));
    }

    /**
     * @return int[]
     */
    public function people(): array
    {
        return array_values(array_unique(array_map('intval', array_filter((array) $this->input('people', []), 'is_numeric'))));
    }

    /**
     * @return string[]
     */
    public function numbers(): array
    {
        return SmsText::numbers($this->input('numbers'))['valid'];
    }
}
