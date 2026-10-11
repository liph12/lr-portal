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
