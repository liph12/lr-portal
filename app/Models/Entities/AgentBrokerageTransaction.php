<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentBrokerageTransaction extends Model
{
    protected $fillable = [
        'agent_transaction_id',
        'brokerage_area_id',
        'project_property_type_id',
        'reservation_date',
        'unit_type',
        'floor_area',
        'lot_area',
        'deposit_slip',
        'remittance_slip',
        'commission_received',
        'total_contract_price',
    ];

    protected function casts(): array
    {
        return [
            'reservation_date' => 'date',
            'floor_area' => 'decimal:2',
            'lot_area' => 'decimal:2',
            'total_contract_price' => 'float',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(AgentTransaction::class, 'agent_transaction_id');
    }

    public function brokerageArea(): BelongsTo
    {
        return $this->belongsTo(BrokerageArea::class);
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(ProjectPropertyType::class, 'project_property_type_id');
    }
}
