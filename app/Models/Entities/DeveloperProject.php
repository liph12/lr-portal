<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperProject extends Model
{
    protected $fillable = [
        'id',
        'developer_id',
        'name',
        'address',
        'latitude',
        'longitude',
        'status',
        'update_logs',
        'project_property_type_id'
    ];

    public function developer(): BelongsTo
    {
        return $this->belongsTo(Developer::class);
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(ProjectPropertyType::class, 'project_property_type_id');
    }
}
