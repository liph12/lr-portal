<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->roles = collect(['superadmin' => 'Superadmin', 'admin' => 'Admin', 'staff' => 'Staff', 'secretary' => 'Secretary'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));
    $this->viewReports = Permission::create(['name' => 'view_reports', 'label' => 'View Reports']);
    $this->roles['superadmin']->permissions()->attach($this->viewReports);

    $this->make = function (string $role, string $email) {
        $user = User::factory()->create(['email' => $email, 'password' => 'Secret123']);
        $user->roles()->attach($this->roles[$role]);

        return $user;
    };
});

test('each role lands on its own portal after signing in', function (string $role, string $expected) {
    ($this->make)($role, "{$role}@example.com");

    $this->post('/login-attempt', ['email' => "{$role}@example.com", 'password' => 'Secret123'])
        ->assertRedirect($expected);
})->with([
    'superadmin' => ['superadmin', '/superadmin/dashboard/main'],
    'admin' => ['admin', '/admin/dashboard'],
    'staff' => ['staff', '/staff/dashboard'],
    'role without a portal' => ['secretary', '/profile'],
]);

test('a remembered page is only used when it is inside the user\'s own portal', function () {
    ($this->make)('staff', 'staff@example.com');

    $this->get('/superadmin/settings')->assertRedirect('/login');
    $this->post('/login-attempt', ['email' => 'staff@example.com', 'password' => 'Secret123'])
        ->assertRedirect('/staff/dashboard');

    auth()->logout();
    $this->roles['staff']->permissions()->attach($this->viewReports);
    $this->get('/staff/statistics')->assertRedirect('/login');
    $this->post('/login-attempt', ['email' => 'staff@example.com', 'password' => 'Secret123'])
        ->assertRedirect('/staff/statistics');
});

test('portals are private to their role and show a forbidden page otherwise', function () {
    $admin = ($this->make)('admin', 'admin@example.com');

    $this->actingAs($admin)->get('/admin/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Portal/Dashboard')->where('kpis', null));

    foreach (['/superadmin/settings', '/staff/dashboard'] as $url) {
        $this->actingAs($admin)->get($url)
            ->assertForbidden()
            ->assertInertia(fn ($page) => $page->component('Error')->where('status', 403));
    }
});

test('statistics follow the view_reports permission through the gate', function () {
    $staff = ($this->make)('staff', 'staff@example.com');

    expect($staff->can('view_reports'))->toBeFalse();
    $this->actingAs($staff)->get('/staff/statistics')->assertForbidden();
    $this->actingAs($staff)->get('/staff/dashboard')->assertInertia(fn ($page) => $page->where('kpis', null));

    $this->roles['staff']->permissions()->attach($this->viewReports);

    // A real request loads the user fresh; the test's model still caches the old role permissions.
    $staff = $staff->fresh();
    expect($staff->can('view_reports'))->toBeTrue();
    $this->actingAs($staff)->get('/staff/statistics')->assertOk()->assertInertia(fn ($page) => $page->component('Portal/Statistics'));
    $this->actingAs($staff)->get('/staff/dashboard')->assertInertia(fn ($page) => $page->has('kpis.sales'));
});

test('the shared auth props describe the user\'s portal and permissions', function () {
    $staff = ($this->make)('staff', 'staff@example.com');
    $this->roles['staff']->permissions()->attach($this->viewReports);

    $this->actingAs($staff)->get('/staff/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('auth.portal', 'staff')
            ->where('auth.home', route('staff.index'))
            ->where('auth.permissions', ['view_reports']));
});

test('signed-in users opening the sign-in page or the root go to their portal', function () {
    $admin = ($this->make)('admin', 'admin@example.com');

    $this->actingAs($admin)->get('/login')->assertRedirect(route('home'));
    $this->actingAs($admin)->get('/home')->assertRedirect('/admin/dashboard');
    $this->actingAs($admin)->get('/')->assertRedirect(route('home'));

    auth()->logout();
    $this->get('/')->assertRedirect(route('login'));
});

test('unknown pages render the not found page, and JSON callers still get JSON', function () {
    $this->get('/no-such-page')->assertNotFound()->assertInertia(fn ($page) => $page->component('Error')->where('status', 404));

    $staff = ($this->make)('staff', 'staff@example.com');
    $this->actingAs($staff)->getJson('/superadmin/settings')->assertForbidden()->assertJsonStructure(['message']);
});
