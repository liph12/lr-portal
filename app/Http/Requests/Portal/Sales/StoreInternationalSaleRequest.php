<?php

namespace App\Http\Requests\Portal\Sales;

use App\Models\Entities\InternationalSale;

// A global partner's sale: no developer, payment terms or commission; the cutoff/recording rules still apply.
class StoreInternationalSaleRequest extends SaleRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', InternationalSale::class);
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->clientRules(),
            'client_age' => ['nullable', 'integer', 'min:18', 'max:120'],
            ...$this->unitRules(),
            'unit_quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'total_contract_price' => ['required', 'numeric', 'gt:0'],
            'reservation_date' => ['required', 'date'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'proof_of_transaction' => $this->fileRule(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [...parent::messages(), ...$this->fileMessages('proof_of_transaction', 'proof of transaction')];
    }
}
