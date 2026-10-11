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

test('superadmins find users by name or email and get the controls to manage them', function () {
    $this->actingAs($this->superadmin)
        ->getJson('/search/users?q=juan')
        ->assertOk()
        ->assertJsonCount(2, 'users')
        ->assertJsonPath('users.0.name', 'Juan Dela Cruz')
        ->assertJsonPath('users.0.role_label', 'Agent')
        ->assertJsonPath('users.1.status', 'resigned')
        ->assertJsonPath('statuses', ['active', 'inactive', 'resigned', 'terminated'])
        ->assertJsonCount(4, 'roles');

    $this->actingAs($this->superadmin)
        ->getJson('/search/users?q=maria@')
        ->assertJsonCount(1, 'users')
        ->assertJsonPath('users.0.email', 'maria@example.com');
});

test('admins and staff can search but get no management options', function (string $role) {
    $this->actingAs(($this->userWith)($role))
        ->getJson('/search/users?q=juan')
        ->assertOk()
        ->assertJsonCount(2, 'users')
        ->assertJsonPath('roles', [])
        ->assertJsonPath('statuses', []);
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
