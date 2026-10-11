<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// One stint of an agent on a sub-team; a transfer closes it (transferred_at) and opens a new one.
class SubTeamAgent extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = ['sub_team_id', 'agent_id', 'joined_at', 'transferred_at', 'status'];

    // joined_at / transferred_at stay plain 'Y-m-d' strings: a date cast would write a time onto DATE columns.

    public function subTeam(): BelongsTo
    {
        return $this->belongsTo(SubTeam::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
