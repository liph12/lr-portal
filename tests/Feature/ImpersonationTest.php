<?php

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Services\ImpersonationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['name' => 'Super Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->agent = User::factory()->create(['name' => 'Ana Agent']);
    $this->agent->roles()->attach(Role::create(['name' => 'agent', 'label' => 'Agent']));
});

test('a superadmin signs in as an agent, sees what they see, and returns', function () {
    $this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}")->assertRedirect(route('dashboard.index'));

    $this->assertAuthenticatedAs($this->agent);
    expect(session(ImpersonationService::SESSION_KEY))->toBe($this->superadmin->id);

    $this->get('/dashboard/main')->assertInertia(fn ($page) => $page
        ->where('auth.name', 'Ana Agent')
        ->where('auth.role', 'Agent')
        ->where('auth.impersonator', ['id' => $this->superadmin->id, 'name' => 'Super Admin'])
        ->where('auth.can.impersonate', false));
    $this->get('/superadmin/settings')->assertForbidden();

    $this->delete('/impersonate')->assertRedirect(route('dashboard.index'));
    $this->assertAuthenticatedAs($this->superadmin);
    expect(session()->has(ImpersonationService::SESSION_KEY))->toBeFalse();

    expect(ActivityLog::where('action', 'auth.impersonation_started')->value('properties'))->toMatchArray(['impersonator_id' => $this->superadmin->id])
        ->and(ActivityLog::where('action', 'auth.impersonation_stopped')->exists())->toBeTrue();
});

test('actions taken while signed in as someone record who really did them', function () {
    $this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}");
    $this->post('/view-as', ['role' => 'agent']);

    expect(ActivityLog::latest('id')->first()->properties)->toMatchArray(['impersonated_by' => $this->superadmin->id]);
});

test('only superadmins can do it, never on superadmins or inactive users, and not from inside another account', function () {
    $other = User::factory()->create();
    $other->roles()->attach(Role::where('name', 'superadmin')->first());
    $inactive = User::factory()->create(['status' => 'inactive']);
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));

    $this->actingAs($admin)->post("/impersonate/{$this->agent->id}")->assertForbidden();
    $this->actingAs($this->superadmin)->post("/impersonate/{$other->id}")->assertSessionHasErrors('user');
    $this->actingAs($this->superadmin)->post("/impersonate/{$inactive->id}")->assertSessionHasErrors('user');
    $this->assertAuthenticatedAs($this->superadmin);

    $this->actingAs($this->agent)->delete('/impersonate')->assertForbidden();
});
