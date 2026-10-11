<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    use MassPrunable;

    public const OUTCOME_SUCCESS = 'success';
    public const OUTCOME_VALIDATION_FAILED = 'validation_failed';
    public const OUTCOME_UNAUTHENTICATED = 'unauthenticated';
    public const OUTCOME_FORBIDDEN = 'forbidden';
    public const OUTCOME_NOT_FOUND = 'not_found';
    public const OUTCOME_ERROR = 'error';

    // Append-only: rows are written once by ActivityLogger and never edited.
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'action',
        'description',
        'subject_type',
        'subject_id',
        'method',
        'route_name',
        'path',
        'status_code',
        'outcome',
        'payload',
        'properties',
        'ip_address',
        'user_agent',
        'duration_ms',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'properties' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(config('activity_log.retention_days')));
    }
}
