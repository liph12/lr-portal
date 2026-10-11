<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubTeam extends Model
{
    protected $fillable = ['team_id', 'name', 'logo', 'status', 'agent_id'];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'agent_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(SubTeamAgent::class);
    }
}
