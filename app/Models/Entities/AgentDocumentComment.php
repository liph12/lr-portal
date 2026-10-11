<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentDocumentComment extends Model
{
    protected $fillable = ['agent_document_id', 'user_id', 'body'];

    public function document(): BelongsTo
    {
        return $this->belongsTo(AgentDocument::class, 'agent_document_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
