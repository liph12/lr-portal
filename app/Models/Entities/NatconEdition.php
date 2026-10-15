<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;

// One NATCON (NATCON 2026, 2027…): its period, cutoff, qualifier amount and Top Rent Managers period (NatconService).
class NatconEdition extends Model
{
    protected $fillable = ['year', 'name', 'from', 'to', 'cutoff_at', 'qualifier_amount', 'rental_from', 'rental_to', 'rental_cutoff', 'is_default', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return [
            'year' => 'integer', 'from' => 'date:Y-m-d', 'to' => 'date:Y-m-d', 'cutoff_at' => 'datetime', 'qualifier_amount' => 'float',
            'rental_from' => 'date:Y-m-d', 'rental_to' => 'date:Y-m-d', 'rental_cutoff' => 'date:Y-m-d', 'is_default' => 'boolean',
        ];
    }
}
