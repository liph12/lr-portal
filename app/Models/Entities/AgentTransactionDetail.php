<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentTransactionDetail extends Model
{
    protected $fillable = [
        'agent_transaction_id',
        'client_first_name',
        'client_middle_name',
        'client_last_name',
        'client_email',
        'client_mobile',
        'client_birthdate',
        // Age on the reservation date (SaleRecord), or legacy salesreport.clientAge.
        'client_age',
        'client_gender',
        'client_country',
        'client_address',
    ];

    protected function casts(): array
    {
        return [
            'client_birthdate' => 'date',
            'client_age' => 'integer',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AgentTransaction::class, 'agent_transaction_id');
    }
}
