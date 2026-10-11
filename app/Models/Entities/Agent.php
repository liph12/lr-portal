<?php

namespace App\Models\Entities;

use App\Support\Areas;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

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

    // Activity (AgentActivityService): dormant after DORMANT_AFTER_MONTHS without a sale since activation. Unlike the
    // account status it never blocks sign-in. Leaders and back-office roles are always active.
    public const ACTIVITY_ACTIVE = 'active';
    public const ACTIVITY_DORMANT = 'dormant';
    public const ACTIVITIES = [self::ACTIVITY_ACTIVE, self::ACTIVITY_DORMANT];
    public const DORMANT_AFTER_MONTHS = 6;
    public const ACTIVITY_EXEMPT_ROLES = ['superadmin', 'admin', 'staff', 'secretary', 'team_leader', 'unit_manager'];

    // Last step of the registration stepper (agent_attributes.registration_status 1–4). Below it the agent never
    // finished signing up (mostly no team yet), so member and recruit statistics leave them out.
    public const FULLY_REGISTERED = 4;

    public static function fullyRegisteredIds(): Builder
    {
        return DB::table('agent_attributes')->where('registration_status', self::FULLY_REGISTERED)->select('agent_id');
    }

    // Global partners get statistics of their own; every shared sales / recruit statistic is local agents only.
    // Sales with no agent at all are kept. $agentId is an SQL expression for the sale's agent id.
    public static function withoutGlobalPartners(Builder $sales, string $agentId): Builder
    {
        return $sales->whereNotExists(fn ($q) => $q->from('agents as gp')
            ->whereRaw("gp.id = {$agentId}")
            ->where('gp.agent_type', self::TYPE_GLOBAL_PARTNER));
    }

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
            'activated_at' => 'datetime',
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
