<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;

// When a month's sales close: sales reserved in `month` (YYYY-MM) can't be recorded from `cutoff_at` on,
// and leaderboards only count those encoded before it.
class SalesCutoff extends Model
{
    protected $fillable = ['month', 'cutoff_at'];

    protected function casts(): array
    {
        return ['cutoff_at' => 'datetime'];
    }
}
