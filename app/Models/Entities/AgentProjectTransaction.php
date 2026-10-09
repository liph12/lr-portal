<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentProjectTransaction extends Model
{
    protected $fillable = [
        'agent_transaction_id',
        'developer_id',
        'project_name',
        'project_property_type_id',
        'unit_type',
        'floor_area',
        'lot_area',
        'reservation_date',
        'total_contract_price',
        'developer_project_id',
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

    public function developer(): BelongsTo
    {
        return $this->belongsTo(Developer::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(DeveloperProject::class, 'developer_project_id');
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(ProjectPropertyType::class, 'project_property_type_id');
    }
}
