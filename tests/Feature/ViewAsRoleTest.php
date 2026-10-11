<?php

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ViewAsService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['name' => 'Super Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    Role::create(['name' => 'admin', 'label' => 'Admin']);
    Role::create(['name' => 'agent', 'label' => 'Agent']);

    // The preview rides on its own cookie, which the browser sends with every request.
    $this->as = fn (string $role) => $this->actingAs($this->superadmin)->withCookie(ViewAsService::COOKIE, $role);
});

test('a superadmin previews the staff portal and returns', function () {
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'staff'])
        ->assertRedirect(route('dashboard.index'))
        ->assertCookie(ViewAsService::COOKIE, 'staff');

    ($this->as)('staff')->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.role', 'Staff')
            ->where('auth.portal', 'staff')
            ->where('auth.viewing_as', 'Staff')
            ->where('auth.can.access_superadmin', false)
            ->where('auth.can.view_as', true)
            ->where('auth.can.manage_teams', false));

    ($this->as)('staff')->get('/superadmin/settings')->assertForbidden();
    ($this->as)('staff')->get('/superadmin/management')->assertForbidden();
    ($this->as)('staff')->get('/dashboard/record-sale')->assertForbidden();

    ($this->as)('staff')->delete('/view-as')
        ->assertRedirect(route('dashboard.index'))
        ->assertCookieExpired(ViewAsService::COOKIE);
    // The browser drops the expired cookie; the test client has to be told.
    $this->defaultCookies = [];
    $this->actingAs($this->superadmin)->get('/dashboard/main')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.viewing_as', null)->where('auth.role', 'Superadmin'));

    expect(ActivityLog::whereIn('action', ['auth.view_as_started', 'auth.view_as_stopped'])->count())->toBe(2);
});

test('a slow request that started before the switch can no longer undo it', function () {
    // The preview isn't in the session, so whatever session a late request writes back doesn't matter.
    $this->actingAs($this->superadmin)->withSession(['anything' => 'old'])->get('/dashboard/main?only=leaderboards');
    ($this->as)('agent')->get('/dashboard/view-sales')->assertInertia(fn ($page) => $page->where('auth.viewing_as', 'Agent'));
});

test('the previewed role gets only its own permissions, and the account is untouched', function () {
    $this->staffRole->permissions()->attach([
        Permission::create(['name' => 'view_reports', 'label' => 'View Reports'])->id,
        Permission::firstOrCreate(['name' => 'view_statistics'], ['label' => 'View Statistics'])->id,
    ]);

    ($this->as)('staff')->get('/staff/statistics')->assertOk();
    ($this->as)('agent')->get('/staff/statistics')->assertForbidden();
    ($this->as)('agent')->get('/profile')->assertInertia(fn ($page) => $page->where('auth.viewing_as', 'Agent')->where('auth.portal', null));

    expect($this->superadmin->fresh()->roles()->pluck('name')->all())->toBe(['superadmin']);
});

test('only real superadmins can preview, never as superadmin, and a forged cookie does nothing', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    $this->actingAs($admin)->post('/view-as', ['role' => 'staff'])->assertForbidden();
    $this->actingAs($admin)->delete('/view-as')->assertForbidden();
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'superadmin'])->assertSessionHasErrors('role');
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'nope'])->assertSessionHasErrors('role');

    // An admin carrying the cookie still acts as an admin.
    $this->actingAs($admin)->withCookie(ViewAsService::COOKIE, 'staff')->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->where('auth.viewing_as', null)->where('auth.role', 'Admin'));
});

test('signing out ends the preview', function () {
    ($this->as)('staff')->post('/logout')->assertCookieExpired(ViewAsService::COOKIE);
});
