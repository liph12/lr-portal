<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AgentTransaction extends Model
{
    public const TYPE_PROJECT = 'project';

    protected $fillable = [
        'agent_id',
        'recorded_by',
        'sale_type',
        'unit_number',
        'commission_status',
        'term_of_payment',
        'remarks',
        'sale_status',
    ];

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function projectTransaction(): HasOne
    {
        return $this->hasOne(AgentProjectTransaction::class);
    }

    public function detail(): HasOne
    {
        return $this->hasOne(AgentTransactionDetail::class);
    }
}
