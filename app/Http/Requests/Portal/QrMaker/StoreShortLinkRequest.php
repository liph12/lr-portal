<?php

namespace App\Http\Requests\Portal\QrMaker;

use App\Models\Entities\ShortLink;
use App\Services\ShortLinkService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

// Dashboard › QR Code Maker: shortening a link — the address (https is assumed when none is typed), an optional readable alias
// for the short link and an optional title to tell it apart in the list.
class StoreShortLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', ShortLink::class);
    }

    protected function prepareForValidation(): void
    {
        $alias = strtolower(trim((string) $this->input('alias', '')));
        $this->merge([
            'url' => $this->filled('url') ? ShortLinkService::normalize((string) $this->input('url')) : $this->input('url'),
            'alias' => $alias === '' ? null : $alias,
            'title' => trim((string) $this->input('title', '')) ?: null,
        ]);
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'url' => [
                'required', 'string', 'max:2048', 'url:http,https',
                fn (string $attribute, mixed $value, \Closure $fail) => ShortLinkService::isOwnShortLink((string) $value) && $fail('That is already a short link.'),
            ],
            'alias' => [
                'nullable', 'string', 'min:3', 'max:40', 'regex:~^[a-z0-9]+(-[a-z0-9]+)*$~',
                Rule::notIn(ShortLinkService::RESERVED),
                Rule::unique('short_links', 'code'),
            ],
            'title' => ['nullable', 'string', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'url.url' => 'Enter a full web address, like https://example.com/page.',
            'alias.regex' => 'An alias uses lowercase letters, numbers and single hyphens, like open-house-cebu.',
            'alias.not_in' => 'That alias is kept for the portal; choose another.',
            'alias.unique' => 'That alias is taken; choose another.',
        ];
    }
}
