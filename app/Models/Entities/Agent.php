<?php

namespace App\Models\Entities;

use App\Support\Areas;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agent extends Model
{
    public const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];

    // Re-derive the area whenever where the agent is based changes (profile edits, Management, imports via the model).
    protected static function booted(): void
    {
        static::saving(function (Agent $agent) {
            if (! $agent->exists || $agent->isDirty(['state', 'city', 'country_code'])) {
                $agent->area = Areas::forAgent($agent->state, $agent->city, $agent->country_code);
            }
        });
    }

    public const TYPE_LOCAL = 'local';
    public const TYPE_GLOBAL_PARTNER = 'global_partner';

    // Not mass-assignable: set by Management or the legacy import, never from the agent's own profile form.
    public const TYPES = [self::TYPE_LOCAL, self::TYPE_GLOBAL_PARTNER];

    // Global partners recruited from this date on are the ones selling from abroad.
    public const GLOBAL_PARTNER_SINCE = '2024-02-01';

    /**
     * Legacy rule: marked "international" (or a typo of it), joined on/after GLOBAL_PARTNER_SINCE, and
     * based in a recorded country other than the Philippines. Everyone else is local.
     */
    public static function typeFromLegacy(?string $nationalIntern, ?string $joinedOn, ?string $country, ?string $countryCode): string
    {
        $international = str_starts_with(strtolower(trim((string) $nationalIntern)), 'internation');
        $joinedSince = $joinedOn !== null && substr($joinedOn, 0, 10) >= self::GLOBAL_PARTNER_SINCE;
        $abroad = $country !== null && $countryCode !== 'PH';

        return $international && $joinedSince && $abroad ? self::TYPE_GLOBAL_PARTNER : self::TYPE_LOCAL;
    }

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
