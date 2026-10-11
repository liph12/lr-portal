<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One stint of an agent on a team; a transfer closes it (transferred_at) and opens a new one.
class TeamAgent extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = ['team_id', 'agent_id', 'joined_at', 'transferred_at', 'status'];

    // joined_at / transferred_at stay plain 'Y-m-d' strings: a date cast would write a time onto DATE columns.

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
