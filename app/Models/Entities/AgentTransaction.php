<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AgentTransaction extends Model
{
    public const TYPE_PROJECT = 'project';
    public const TYPE_RENTAL = 'rental';
    public const TYPE_BROKERAGE = 'brokerage';

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

    protected function casts(): array
    {
        return [
            // Change history: [{user, updated_at, description, details?, file?, …}, …] (legacy salesreport.logs).
            'update_logs' => 'array',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function projectTransaction(): HasOne
    {
        return $this->hasOne(AgentProjectTransaction::class);
    }

    public function rentalTransaction(): HasOne
    {
        return $this->hasOne(AgentRentalTransaction::class);
    }

    public function brokerageTransaction(): HasOne
    {
        return $this->hasOne(AgentBrokerageTransaction::class);
    }

    public function detail(): HasOne
    {
        return $this->hasOne(AgentTransactionDetail::class);
    }
}
