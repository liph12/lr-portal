<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentRentalTransaction extends Model
{
    protected $fillable = [
        'agent_transaction_id',
        'project_property_type_id',
        'reservation_date',
        'unit_type',
        'floor_area',
        'lot_area',
        'rental_rate',
        'closing_agent',
        'partner_agent',
        'deposit_slip',
        'remittance_slip',
        'commission_received',
        'total_contract_price',
        'property_size',
        'duration_value',
        'duration_unit',
        'remittance_date',
        'commission_rate',
        'closing_agent_id',
        'unregistered_agent_email',
        'unregistered_agent_mobile',
        'partner_agent_id',
        'contract',
        'proof_of_transaction',
    ];

    // The commission is 8.3% of the contract (fixed), so the contract's total = amount received / 8.3%.
    public const COMMISSION_RATE = 8.3;

    // Rent.ph's share of the amount received — worked out, never stored.
    public const RENT_PH_SHARE_RATE = 20;

    public const DURATION_UNITS = ['days', 'months', 'years'];

    protected function casts(): array
    {
        return [
            'reservation_date' => 'date',
            'floor_area' => 'decimal:2',
            'lot_area' => 'decimal:2',
            'rental_rate' => 'decimal:2',
            'total_contract_price' => 'float',
            'remittance_date' => 'date',
            'received_at' => 'datetime',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AgentTransaction::class, 'agent_transaction_id');
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(ProjectPropertyType::class, 'project_property_type_id');
    }
}
