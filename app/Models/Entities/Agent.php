<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agent extends Model
{
    public const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];

    protected $fillable = [
        'user_id',
        'first_name',
        'middle_name',
        'last_name',
        'state',
        'city',
        'address',
        'email',
        'phone',
        'mobile',
        'gender',
        'avatar',
        'marital_status',
    ];

    protected function casts(): array
    {
        return [
            // Legacy schema: true = male, false = female.
            'gender' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(AgentProfile::class);
    }
}
