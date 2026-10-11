<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->roles = collect(['superadmin' => 'Superadmin', 'admin' => 'Admin', 'staff' => 'Staff', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));

    $this->userWith = function (string $role, array $attrs = []) {
        $user = User::factory()->create($attrs);
        $user->roles()->attach($this->roles[$role]);

        return $user;
    };

    $this->superadmin = ($this->userWith)('superadmin', ['name' => 'Philip Libres']);
    $this->juan = ($this->userWith)('agent', ['name' => 'Juan Dela Cruz', 'email' => 'juan@example.com']);
    ($this->userWith)('agent', ['name' => 'Juana Santos', 'email' => 'jsantos@example.com', 'status' => 'resigned']);
    ($this->userWith)('agent', ['name' => 'Maria Clara', 'email' => 'maria@example.com']);
});

test('superadmins find users by name or email, with role, status, profile link and sign-in', function () {
    $agentId = \Illuminate\Support\Facades\DB::table('agents')->insertGetId(['user_id' => $this->juan->id, 'email' => $this->juan->email]);

    $this->actingAs($this->superadmin)
        ->getJson('/search/users?q=juan')
        ->assertOk()
        ->assertJsonCount(2, 'users')
        ->assertJsonPath('users.0.name', 'Juan Dela Cruz')
        ->assertJsonPath('users.0.role_label', 'Agent')
        ->assertJsonPath('users.0.agent_id', $agentId)
        ->assertJsonPath('users.0.can_impersonate', true)
        ->assertJsonPath('users.1.status', 'resigned')
        // Resigned users can't sign in, so nobody can sign in as them; accounts without an agent have no profile.
        ->assertJsonPath('users.1.can_impersonate', false)
        ->assertJsonPath('users.1.agent_id', null)
        ->assertJsonMissingPath('roles')
        ->assertJsonMissingPath('statuses');

    $this->actingAs($this->superadmin)->getJson('/search/users?q=philip')->assertJsonPath('users.0.can_impersonate', false);

    $this->actingAs($this->superadmin)
        ->getJson('/search/users?q=maria@')
        ->assertJsonCount(1, 'users')
        ->assertJsonPath('users.0.email', 'maria@example.com');
});

test('admins and staff can search and open profiles but not sign in as anyone', function (string $role) {
    $agentId = \Illuminate\Support\Facades\DB::table('agents')->insertGetId(['user_id' => $this->juan->id, 'email' => $this->juan->email]);
    $reader = ($this->userWith)($role);

    $this->actingAs($reader)
        ->getJson('/search/users?q=juan')
        ->assertOk()
        ->assertJsonCount(2, 'users')
        ->assertJsonPath('users.0.can_impersonate', false);

    // Without view_reports the profile opens without the sales.
    $this->actingAs($reader)->get("/agents/{$agentId}")
        ->assertInertia(fn ($page) => $page->component('Portal/Agents/Show')->where('agent.name', 'Juan Dela Cruz')->where('summary', null));
})->with(['admin', 'staff']);

test('other roles and guests cannot search users', function () {
    $this->actingAs($this->juan)->getJson('/search/users?q=maria')->assertForbidden();

    auth()->logout();
    $this->getJson('/search/users?q=maria')->assertUnauthorized();
});

test('very short terms return nothing and wildcards are taken literally', function () {
    $this->actingAs($this->superadmin)->getJson('/search/users?q=j')->assertJsonCount(0, 'users');
    $this->actingAs($this->superadmin)->getJson('/search/users?q=%25%25')->assertJsonCount(0, 'users');
});

test('the shared auth props tell the UI what the user may do', function () {
    $this->actingAs($this->superadmin)
        ->get('/profile')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.access_superadmin', true)
            ->where('auth.can.search_users', true)
            ->where('auth.can.manage_users', true));

    $this->actingAs($this->juan)
        ->get('/profile')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.access_superadmin', false)
            ->where('auth.can.search_users', false)
            ->where('auth.can.manage_users', false));
});
