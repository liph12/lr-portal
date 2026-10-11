<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    public const STATUS_ACTIVE = 'active';
    // Paused for now; members keep their place.
    public const STATUS_INACTIVE = 'inactive';
    // Closed for good; nobody stays on it.
    public const STATUS_DEACTIVATED = 'deactivated';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_DEACTIVATED];

    protected $fillable = ['name', 'logo', 'status', 'agent_id'];

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'agent_id');
    }

    public function subTeams(): HasMany
    {
        return $this->hasMany(SubTeam::class);
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(TeamAgent::class);
    }
}
