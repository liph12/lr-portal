<?php

namespace App\Models\Entities;

use App\Services\UnregisteredAgentLinker;
use App\Support\Areas;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class Agent extends Model
{
    public const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];

    public const DEFAULT_COUNTRY_CODE = 'PH';
    public const DEFAULT_COUNTRY = 'Philippines';

    // Re-derive the area whenever where the agent is based changes (profile edits, Management, imports via the model).
    protected static function booted(): void
    {
        // A rental may have been credited to this person before they had an account.
        static::created(fn (Agent $agent) => app(UnregisteredAgentLinker::class)->link($agent));

        static::saving(function (Agent $agent) {
            // No country recorded means the Philippines.
            if (blank($agent->country_code) && blank($agent->country)) {
                $agent->country_code = self::DEFAULT_COUNTRY_CODE;
                $agent->country = self::DEFAULT_COUNTRY;
            }
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
    // Unit manager by rate: a designation only (keeps their role and dashboard); by dashboard: the Unit Manager role.
    public const UM_BY_RATE = 'rate';

    public const UM_BY_DASHBOARD = 'dashboard';

    public const UM_BASES = [self::UM_BY_RATE, self::UM_BY_DASHBOARD];

    /**
     * What every place that shows a person sends for their designation badges (an Agent or a raw query row).
     *
     * @return array{is_broker: bool, broker_since: ?string, unit_manager_by: ?string, unit_manager_since: ?string}
     */
    public static function designationsOf(?object $agent): array
    {
        $date = fn ($value) => $value ? substr((string) ($value instanceof \DateTimeInterface ? $value->format('Y-m-d') : $value), 0, 10) : null;

        return [
            'is_broker' => (bool) ($agent->is_broker ?? false),
            'broker_since' => $date($agent->broker_since ?? null),
            'unit_manager_by' => $agent->unit_manager_by ?? null,
            'unit_manager_since' => $date($agent->unit_manager_since ?? null),
        ];
    }

    public const ACTIVITY_EXEMPT_ROLES = ['superadmin', 'admin', 'staff', 'secretary', 'team_leader', 'unit_manager'];

    // The status people see, filter and count by: an active account whose agent is dormant reads "inactive". Only the
    // account status (users.status) controls sign-in, so a dormant agent can still sign in and record the sale that
    // makes them active again.
    public static function displayStatus(?string $accountStatus, ?string $activity): ?string
    {
        return $accountStatus === User::STATUS_ACTIVE && $activity === self::ACTIVITY_DORMANT ? User::STATUS_INACTIVE : $accountStatus;
    }

    public static function statusSql(string $accountStatus = 'u.status', string $activity = 'a.activity'): string
    {
        return "CASE WHEN {$accountStatus} = '".User::STATUS_ACTIVE."' AND {$activity} = '".self::ACTIVITY_DORMANT."' THEN '".User::STATUS_INACTIVE."' ELSE {$accountStatus} END";
    }

    // Last step of the registration stepper (agent_attributes.registration_status 1–4). Below it the agent never
    // finished signing up (mostly no team yet), so member and recruit statistics leave them out.
    public const FULLY_REGISTERED = 4;

    // An agent's referral link: new agents register under them from it (RegistrationController). Made of a random code,
    // not the agent id, so nobody can walk through the ids and see every agent on the registration page.
    public static function referralLink(Agent $agent): string
    {
        return url('/register?ref='.$agent->referralCode());
    }

    // The agent's referral code, made the first time it's needed. Lowercase letters and digits without look-alikes (0/o,
    // 1/l), so it reads aloud and types cleanly.
    public function referralCode(): string
    {
        if ($this->referral_code) {
            return $this->referral_code;
        }
        do {
            $code = collect(range(1, 8))->map(fn () => 'abcdefghjkmnpqrstuvwxyz23456789'[random_int(0, 30)])->implode('');
        } while (static::where('referral_code', $code)->exists());

        $this->forceFill(['referral_code' => $code])->saveQuietly();

        return $code;
    }

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
        'birthdate',
        'citizenship',
        'barangay',
        'postal_code',
    ];

    protected function casts(): array
    {
        return [
            // Legacy schema: true = male, false = female.
            'gender' => 'boolean',
            'activated_at' => 'datetime',
            'is_broker' => 'boolean',
            'broker_since' => 'date:Y-m-d',
            'unit_manager_since' => 'date:Y-m-d',
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

    // Messages from the public contact page (/contact/{slug}).
    public function inquiries(): HasMany
    {
        return $this->hasMany(ContactInquiry::class);
    }
}
