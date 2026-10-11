<?php

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadminRole = Role::create(['name' => 'superadmin', 'label' => 'Superadmin']);
    $this->adminRole = Role::create(['name' => 'admin', 'label' => 'Admin']);
    $this->viewDashboard = Permission::create(['name' => 'view_dashboard', 'label' => 'View Dashboard']);
    $this->viewReports = Permission::create(['name' => 'view_reports', 'label' => 'View Reports']);
    $this->superadminRole->permissions()->sync([$this->viewDashboard->id, $this->viewReports->id]);

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach($this->superadminRole);
});

test('the roles page lists roles with their permissions and user counts', function () {
    $this->actingAs($this->superadmin)
        ->get('/superadmin/settings/roles')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Settings/Roles/Index')
            ->has('roles', 2)
            ->where('roles.0.name', 'superadmin')
            ->where('roles.0.is_superadmin', true)
            ->where('roles.0.users_count', 1)
            ->where('roles.0.permission_ids', [$this->viewDashboard->id, $this->viewReports->id])
            // Migrations also seed permissions (e.g. view_leaderboards), so count what's really there.
            ->has('permissions', Permission::count()));
});

test('a superadmin creates agent, unit manager and team leader roles', function () {
    foreach (['Agent', 'Unit Manager', 'Team Leader'] as $label) {
        $this->actingAs($this->superadmin)
            ->post('/superadmin/settings/roles', ['label' => $label, 'permission_ids' => [$this->viewDashboard->id]])
            ->assertRedirect(route('superadmin.settings.roles.index'))
            ->assertSessionHasNoErrors();
    }

    expect(Role::whereIn('name', ['agent', 'unit_manager', 'team_leader'])->pluck('label', 'name')->all())
        ->toEqual(['agent' => 'Agent', 'unit_manager' => 'Unit Manager', 'team_leader' => 'Team Leader'])
        ->and(Role::where('name', 'unit_manager')->first()->permissions->pluck('name')->all())->toBe(['view_dashboard']);

    expect(ActivityLog::where('action', 'role.created')->count())->toBe(3);
});

test('duplicate or empty role names are rejected', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/roles', ['label' => '  ADMIN '])
        ->assertSessionHasErrors(['name' => 'A role with this name already exists.']);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/roles', ['label' => '!!!'])
        ->assertSessionHasErrors('label');

    expect(Role::count())->toBe(2);
});

test('editing a role renames it and syncs permissions without changing its machine name', function () {
    $role = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    $role->permissions()->attach($this->viewDashboard);

    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/roles/{$role->id}", [
            'label' => 'Team Lead',
            'permission_ids' => [$this->viewReports->id],
        ])
        ->assertSessionHasNoErrors();

    $role->refresh();
    expect($role->name)->toBe('team_leader')
        ->and($role->label)->toBe('Team Lead')
        ->and($role->permissions->pluck('name')->all())->toBe(['view_reports']);

    $log = ActivityLog::where('action', 'role.updated')->sole();
    expect($log->properties)->toBe(['granted' => ['view_reports'], 'revoked' => ['view_dashboard']]);
});

test('superadmin always keeps every permission', function () {
    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/roles/{$this->superadminRole->id}", [
            'label' => 'Superadmin',
            'permission_ids' => [],
        ]);

    expect($this->superadminRole->permissions()->count())->toBe(Permission::count());
});

test('built-in roles and roles that still have users cannot be deleted', function () {
    $this->actingAs($this->superadmin)
        ->delete("/superadmin/settings/roles/{$this->adminRole->id}")
        ->assertSessionHasErrors(['role' => "Admin is a built-in role and can't be deleted."]);

    $agent = Role::create(['name' => 'agent', 'label' => 'Agent']);
    User::factory()->count(2)->create()->each(fn ($u) => $u->roles()->attach($agent));

    $this->actingAs($this->superadmin)
        ->delete("/superadmin/settings/roles/{$agent->id}")
        ->assertSessionHasErrors(['role' => 'Agent is assigned to 2 users. Move them to another role first.']);

    expect(Role::count())->toBe(3);
});

test('an unused custom role can be deleted', function () {
    $role = Role::create(['name' => 'unit_manager', 'label' => 'Unit Manager']);
    $role->permissions()->attach($this->viewDashboard);

    $this->actingAs($this->superadmin)
        ->delete("/superadmin/settings/roles/{$role->id}")
        ->assertSessionHasNoErrors();

    expect(Role::where('name', 'unit_manager')->exists())->toBeFalse()
        ->and(DB::table('permission_role')->where('role_id', $role->id)->exists())->toBeFalse();
});

test('new permissions are granted to superadmin automatically and can be deleted', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/permissions', ['label' => 'Approve Sales'])
        ->assertSessionHasNoErrors();

    $permission = Permission::where('name', 'approve_sales')->sole();
    expect($this->superadminRole->permissions()->whereKey($permission->id)->exists())->toBeTrue();

    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/permissions', ['label' => 'approve sales'])
        ->assertSessionHasErrors(['name' => 'This permission already exists.']);

    $this->actingAs($this->superadmin)
        ->delete("/superadmin/settings/permissions/{$permission->id}")
        ->assertSessionHasNoErrors();

    expect(Permission::whereKey($permission->id)->exists())->toBeFalse()
        ->and(DB::table('permission_role')->where('permission_id', $permission->id)->exists())->toBeFalse();
});

test('only superadmins can manage roles', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->adminRole);

    $this->actingAs($admin)->get('/superadmin/settings/roles')->assertForbidden();
    $this->actingAs($admin)->post('/superadmin/settings/roles', ['label' => 'Agent'])->assertForbidden();

    expect(Role::count())->toBe(2);
});

test('assigning a role replaces the user\'s current role', function () {
    $staff = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $unitManager = Role::create(['name' => 'unit_manager', 'label' => 'Unit Manager']);
    $juan = User::factory()->create(['name' => 'Juan Dela Cruz']);
    $juan->roles()->attach($staff);

    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/users/{$juan->id}/role", ['role_id' => $unitManager->id])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Juan Dela Cruz is now a Unit Manager.');

    expect($juan->roles()->pluck('name')->all())->toBe(['unit_manager']);

    $log = ActivityLog::where('action', 'role.assigned')->sole();
    expect($log->description)->toBe("Changed Juan Dela Cruz's role from Staff to Unit Manager")
        ->and($log->properties)->toBe(['from' => 'staff', 'to' => 'unit_manager']);
});

test('the roles page lists users with their current role', function () {
    $this->actingAs($this->superadmin)
        ->get('/superadmin/settings/roles')
        ->assertInertia(fn ($page) => $page
            ->has('users', 1)
            ->where('users.0.id', $this->superadmin->id)
            ->where('users.0.role_id', $this->superadminRole->id));
});

test('you cannot change your own role', function () {
    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/users/{$this->superadmin->id}/role", ['role_id' => $this->adminRole->id])
        ->assertSessionHasErrors(['role' => "You can't change your own role. Ask another superadmin."]);

    expect($this->superadmin->roles()->pluck('name')->all())->toBe(['superadmin']);
});

test('a superadmin can be moved while another superadmin remains', function () {
    $other = User::factory()->create();
    $other->roles()->attach($this->superadminRole);

    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/users/{$other->id}/role", ['role_id' => $this->adminRole->id])
        ->assertSessionHasNoErrors();

    expect($other->roles()->pluck('name')->all())->toBe(['admin']);
});

test('the only superadmin cannot be moved to another role', function () {
    $onlySuper = User::factory()->create(['name' => 'Only Super']);
    $onlySuper->roles()->attach($this->superadminRole);
    $this->superadmin->roles()->sync([$this->adminRole->id]);

    // A superadmin-less actor can't reach the route, so check the service rule directly.
    $actor = User::factory()->create();
    expect(fn () => app(App\Services\RolePermissionService::class)->assignRole($actor, $onlySuper, $this->adminRole))
        ->toThrow(Illuminate\Validation\ValidationException::class, 'Only Super is the only Superadmin. Make someone else a Superadmin first.');

    expect($onlySuper->roles()->pluck('name')->all())->toBe(['superadmin']);
});

test('only superadmins can assign roles', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach($this->adminRole);
    $target = User::factory()->create();

    $this->actingAs($admin)
        ->put("/superadmin/settings/users/{$target->id}/role", ['role_id' => $this->adminRole->id])
        ->assertForbidden();

    expect($target->roles()->count())->toBe(0);
});

test('users with a role that has no dashboard yet land on their profile after sign-in', function () {
    $agent = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $user = User::factory()->create(['email' => 'agent@example.com', 'password' => 'Secret123']);
    $user->roles()->attach($agent);

    $this->post('/login-attempt', ['email' => 'agent@example.com', 'password' => 'Secret123'])
        ->assertRedirect(route('profile.edit'));
});
