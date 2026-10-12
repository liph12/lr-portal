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
        'remittance_date',
        'commission_rate',
        'company_share_rate',
        'company_share',
        'contract',
        'proof_of_transaction',
        'closing_agent',
        'partner_agent',
        'signing_broker_id',
    ];

    // The commission is 5% of the property (fixed), so the property's total = commission received / 5%.
    public const COMMISSION_RATE = 5;

    // The company's share of the commission received.
    public const COMPANY_SHARE_RATES = [15, 10];

    protected function casts(): array
    {
        return [
            'reservation_date' => 'date',
            'floor_area' => 'decimal:2',
            'lot_area' => 'decimal:2',
            'total_contract_price' => 'float',
            'remittance_date' => 'date',
            'received_at' => 'datetime',
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
