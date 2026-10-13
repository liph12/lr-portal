<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentProfile extends Model
{
    protected $fillable = [
        'agent_id',
        'about',
        'facebook',
        'linkedin',
        'whatsapp',
        'work_experience',
        'skills',
        'education',
        'professions',
        'hobbies',
    ];

    protected function casts(): array
    {
        return ['education' => 'array', 'professions' => 'array', 'hobbies' => 'array'];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
