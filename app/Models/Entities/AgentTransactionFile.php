<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentTransactionFile extends Model
{
    public const CATEGORY_PROOF_OF_TRANSACTION = 'proof_of_transaction';

    protected $fillable = [
        'agent_transaction_id',
        'category',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'content_encoding',
        'original_size',
        'stored_size',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AgentTransaction::class, 'agent_transaction_id');
    }
}
