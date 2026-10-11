<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

// A global partner's sale (legacy international_sales_report); separate from agent_transactions.
class InternationalSale extends Model
{
    protected $fillable = [
        'agent_id',
        'recorded_by',
        'project_property_type_id',
        'unit_number',
        'unit_quantity',
        'unit_type',
        'floor_area',
        'lot_area',
        'total_contract_price',
        'reservation_date',
        'proof_of_transaction',
        'sale_status',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'reservation_date' => 'date',
            'floor_area' => 'decimal:2',
            'lot_area' => 'decimal:2',
            'total_contract_price' => 'decimal:2',
            'update_logs' => 'array',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(ProjectPropertyType::class, 'project_property_type_id');
    }

    public function client(): HasOne
    {
        return $this->hasOne(InternationalSaleClient::class);
    }
}
