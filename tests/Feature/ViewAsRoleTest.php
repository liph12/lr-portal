<?php

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['name' => 'Super Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    Role::create(['name' => 'admin', 'label' => 'Admin']);
    Role::create(['name' => 'agent', 'label' => 'Agent']);
});

test('a superadmin previews the staff portal and returns', function () {
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'staff'])
        ->assertRedirect(route('dashboard.index'));

    $this->actingAs($this->superadmin)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.role', 'Staff')
            ->where('auth.portal', 'staff')
            ->where('auth.viewing_as', 'Staff')
            ->where('auth.can.access_superadmin', false)
            ->where('auth.can.view_as', true)
            ->where('auth.can.manage_teams', false));

    $this->actingAs($this->superadmin)->get('/superadmin/settings')->assertForbidden();
    $this->actingAs($this->superadmin)->get('/superadmin/management')->assertForbidden();
    $this->actingAs($this->superadmin)->get('/dashboard/record-sale')->assertForbidden();

    $this->actingAs($this->superadmin)->delete('/view-as')->assertRedirect(route('dashboard.index'));
    $this->actingAs($this->superadmin)->get('/dashboard/main')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.viewing_as', null)->where('auth.role', 'Superadmin'));

    expect(ActivityLog::whereIn('action', ['auth.view_as_started', 'auth.view_as_stopped'])->count())->toBe(2);
});

test('the previewed role gets only its own permissions, and the account is untouched', function () {
    $this->staffRole->permissions()->attach(Permission::create(['name' => 'view_reports', 'label' => 'View Reports']));

    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'staff']);

    $this->actingAs($this->superadmin)->get('/staff/statistics')->assertOk();
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'agent']);
    $this->actingAs($this->superadmin)->get('/staff/statistics')->assertForbidden();
    // An agent has no portal, so the preview lands on the profile page, from where you can still return.
    $this->actingAs($this->superadmin)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.viewing_as', 'Agent')->where('auth.portal', null));
    $this->actingAs($this->superadmin)->delete('/view-as')->assertRedirect(route('dashboard.index'));

    expect($this->superadmin->fresh()->roles()->pluck('name')->all())->toBe(['superadmin']);
});

test('only real superadmins can preview, and never as superadmin', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('name', 'admin')->first());

    $this->actingAs($admin)->post('/view-as', ['role' => 'staff'])->assertForbidden();
    $this->actingAs($admin)->delete('/view-as')->assertForbidden();
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'superadmin'])->assertSessionHasErrors('role');
    $this->actingAs($this->superadmin)->post('/view-as', ['role' => 'nope'])->assertSessionHasErrors('role');
});
