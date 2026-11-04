<?php

namespace App\Http\Requests\Portal\QrMaker;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

// Dashboard › QR Code Maker: removing one of your own short links (its QR codes stop working).
class DeleteShortLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('delete', $this->route('link'));
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [];
    }
}
