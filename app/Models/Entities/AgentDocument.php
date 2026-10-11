<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// One uploaded requirement document (legacy member_docs). is_current = the latest of its type for the agent.
class AgentDocument extends Model
{
    public const TYPES = ['prc', 'dhsud', 'contract', 'cpd', 'new_entry'];

    public const STATUS_PENDING = 'pending';
    public const STATUS_VALID = 'valid';
    // Sent back: the agent must upload it again (see remarks).
    public const STATUS_FOR_REUPLOAD = 'for_reupload';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_VALID, self::STATUS_FOR_REUPLOAD];

    // Set by the review (AgentDocumentService::review) or the legacy import, never mass-assigned from a form.
    protected $fillable = ['agent_id', 'type', 'file_url', 'file_name', 'is_current'];

    protected function casts(): array
    {
        return ['is_current' => 'boolean', 'reviewed_at' => 'datetime'];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(AgentDocumentComment::class);
    }
}
