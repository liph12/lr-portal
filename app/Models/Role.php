<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    public const SUPERADMIN = 'superadmin';

    // Route groups are guarded by these names (`role:superadmin`, `role:admin`), so they can't be removed.
    public const SYSTEM_ROLES = [self::SUPERADMIN, 'admin'];

    protected $fillable = ['name', 'label'];

    public function users()
    {
        return $this->belongsToMany(User::class);
    }

    public function permissions()
    {
        return $this->belongsToMany(Permission::class);
    }

    public function isSystem(): bool
    {
        return in_array($this->name, self::SYSTEM_ROLES, true);
    }

    public function isSuperadmin(): bool
    {
        return $this->name === self::SUPERADMIN;
    }
}
