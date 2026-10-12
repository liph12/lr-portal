<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Entities\Agent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_RESIGNED = 'resigned';
    public const STATUS_TERMINATED = 'terminated';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
        self::STATUS_RESIGNED,
        self::STATUS_TERMINATED,
    ];

    // Statistics only tell active from not: resigned and terminated count as inactive there (tables, filters and search
    // keep all four).
    public const STATISTIC_STATUSES = [self::STATUS_ACTIVE, self::STATUS_INACTIVE];

    public static function statisticStatus(?string $status): string
    {
        return $status === self::STATUS_ACTIVE ? self::STATUS_ACTIVE : self::STATUS_INACTIVE;
    }

    /**
     * Folds per-status counts into STATISTIC_STATUSES.
     *
     * @param  iterable<string, int>  $counts
     * @return array<string, int>
     */
    public static function statisticCounts(iterable $counts): array
    {
        $folded = array_fill_keys(self::STATISTIC_STATUSES, 0);
        foreach ($counts as $status => $n) {
            $folded[self::statisticStatus($status)] += (int) $n;
        }

        return $folded;
    }

    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    // Matches the column default so freshly created models report a status before being reloaded.
    protected $attributes = [
        'status' => self::STATUS_ACTIVE,
    ];

    // Settings › Preferences: where a link opens (same tab = single-page, or a new tab), colour scheme and text size.
    public const LINK_MODES = ['spa', 'tab'];

    public const THEMES = ['light', 'dark', 'system'];

    public const FONT_SIZES = ['small', 'default', 'large', 'xlarge'];

    public const PREFERENCES_PERMISSION = 'use_preferences';

    // Genealogy: how many recruits an opened card shows at a time (best downlines first).
    public const GENEALOGY_SIZES = [5, 10, 20, 30, 50];

    // Genealogy: top-down (each level a row) or left-to-right (each level a column).
    public const GENEALOGY_LAYOUTS = ['vertical', 'horizontal'];

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Settings › Preferences with defaults filled in. `links.sections` maps a top-level menu path to a link mode.
     *
     * @return array{theme: ?string, font_size: string, genealogy_per_branch: int, genealogy_layout: string, links: array{default: string, sections: array<string, string>}}
     */
    public function preferences(): array
    {
        $saved = $this->preferences ?? [];
        $links = (array) ($saved['links'] ?? []);

        return [
            // Null = not chosen yet: the device's own light/dark choice stays.
            'theme' => in_array($saved['theme'] ?? null, self::THEMES, true) ? $saved['theme'] : null,
            'font_size' => in_array($saved['font_size'] ?? null, self::FONT_SIZES, true) ? $saved['font_size'] : 'default',
            'genealogy_per_branch' => in_array($saved['genealogy_per_branch'] ?? null, self::GENEALOGY_SIZES, true) ? $saved['genealogy_per_branch'] : self::GENEALOGY_SIZES[0],
            'genealogy_layout' => in_array($saved['genealogy_layout'] ?? null, self::GENEALOGY_LAYOUTS, true) ? $saved['genealogy_layout'] : self::GENEALOGY_LAYOUTS[0],
            'links' => [
                'default' => in_array($links['default'] ?? null, self::LINK_MODES, true) ? $links['default'] : 'spa',
                'sections' => array_filter((array) ($links['sections'] ?? []), fn ($mode) => in_array($mode, self::LINK_MODES, true)),
            ],
        ];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'status_changed_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
        ];
    }

    // Roles that have their own portal (/superadmin, /admin, /staff); everyone else lives on /profile.
    public const PORTALS = [Role::SUPERADMIN, 'admin', 'staff'];

    // Set by ApplyViewAsRole when a superadmin previews the portal as another role; never saved.
    private ?Role $viewingAs = null;

    public function viewAs(?Role $role): void
    {
        $this->viewingAs = $role;
        // permissions() reads the loaded relation, so it follows the previewed role too.
        $role ? $this->setRelation('roles', collect([$role->loadMissing('permissions')])) : $this->unsetRelation('roles');
    }

    public function viewingAs(): ?Role
    {
        return $this->viewingAs;
    }

    // The role the app should act on: the previewed one, else the user's own.
    public function actingRole(): ?Role
    {
        return $this->viewingAs ?? $this->roles()->first();
    }

    // The account's real role, ignoring any preview — for who may start or stop one.
    public function reallyHasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function portal(): ?string
    {
        $role = $this->actingRole()?->name;

        return in_array($role, self::PORTALS, true) ? $role : null;
    }

    // Every role starts on the shared dashboard; portals (/superadmin, /admin, /staff) hold the rest.
    public function homeUrl(): string
    {
        return route('dashboard.index');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function agent(): HasOne
    {
        return $this->hasOne(Agent::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function permissions()
    {
        return $this->roles->flatMap->permissions->unique('id');
    }

    public function hasRole($role)
    {
        if ($this->viewingAs) {
            return $this->viewingAs->name === $role;
        }

        return $this->reallyHasRole($role);
    }

    /**
     * @param  string[]  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        if ($this->viewingAs) {
            return in_array($this->viewingAs->name, $roles, true);
        }

        return $this->roles()->whereIn('name', $roles)->exists();
    }

    public function hasPermission($permission)
    {
        return $this->permissions()->contains('name', $permission);
    }
}
