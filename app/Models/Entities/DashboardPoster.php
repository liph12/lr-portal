<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// A poster / announcement in the dashboard's carousel (DashboardPosterService).
class DashboardPoster extends Model
{
    protected $fillable = ['title', 'image_url', 'link_url', 'starts_on', 'ends_on', 'is_active', 'sort_order', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date', 'is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    // Switched on and within its dates today (Philippine time).
    public function scopeShowing(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $today))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $today));
    }
}
