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

test('every role lands on the shared dashboard after signing in', function (string $role) {
    ($this->make)($role, "{$role}@example.com");

    $this->post('/login-attempt', ['email' => "{$role}@example.com", 'password' => 'Secret123'])
        ->assertRedirect('/dashboard/main');
})->with(['superadmin', 'admin', 'staff', 'role without a portal' => 'secretary']);

test('the dashboard is the same page for every role, and old portal dashboard links redirect to it', function () {
    foreach (['superadmin', 'admin', 'staff', 'secretary'] as $role) {
        $this->actingAs(($this->make)($role, "{$role}-dash@example.com"))->get('/dashboard/main')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Portal/Dashboard/Index'));
    }

    $superadmin = User::whereHas('roles', fn ($q) => $q->where('name', 'superadmin'))->first();
    $this->actingAs($superadmin)->get('/superadmin/dashboard/main')->assertRedirect('/dashboard/main');
    $this->actingAs($superadmin)->get('/superadmin/dashboard/record-sale/project')->assertRedirect('/dashboard/record-sale/project');
});

test('recording sales follows the record_sales permission', function () {
    $staff = ($this->make)('staff', 'staff-sales@example.com');
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $agentRole->permissions()->attach(Permission::where('name', 'record_sales')->value('id'));
    $agent = User::factory()->create();
    $agent->roles()->attach($agentRole);

    $this->actingAs($staff)->get('/dashboard/record-sale')->assertForbidden();
    $this->actingAs($staff)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.permissions', []));
    $this->actingAs($agent)->get('/dashboard/record-sale')->assertOk()->assertInertia(fn ($page) => $page->component('Portal/Dashboard/RecordSale/Index'));
});

test('a remembered page is only used when it is inside the user\'s own portal', function () {
    ($this->make)('staff', 'staff@example.com');

    $this->get('/superadmin/settings')->assertRedirect('/login');
    $this->post('/login-attempt', ['email' => 'staff@example.com', 'password' => 'Secret123'])
        ->assertRedirect('/dashboard/main');

    auth()->logout();
    $this->roles['staff']->permissions()->attach($this->viewReports);
    $this->get('/staff/statistics')->assertRedirect('/login');
    $this->post('/login-attempt', ['email' => 'staff@example.com', 'password' => 'Secret123'])
        ->assertRedirect('/staff/statistics');
});

test('portals are private to their role and show a forbidden page otherwise', function () {
    $admin = ($this->make)('admin', 'admin@example.com');

    $this->actingAs($admin)->get('/admin/management')->assertOk();

    foreach (['/superadmin/settings', '/staff/statistics'] as $url) {
        $this->actingAs($admin)->get($url)
            ->assertForbidden()
            ->assertInertia(fn ($page) => $page->component('Error')->where('status', 403));
    }
});

test('statistics follow their own view_statistics permission, not view_reports', function () {
    $staff = ($this->make)('staff', 'staff@example.com');

    expect($staff->can('view_statistics'))->toBeFalse();
    $this->actingAs($staff)->get('/staff/statistics')->assertForbidden();

    // Reports access alone isn't enough any more.
    $this->roles['staff']->permissions()->attach($this->viewReports);
    $this->actingAs($staff->fresh())->get('/staff/statistics')->assertForbidden();

    $this->roles['staff']->permissions()->attach(Permission::firstOrCreate(['name' => 'view_statistics'], ['label' => 'View Statistics']));

    // A real request loads the user fresh; the test's model still caches the old role permissions.
    $staff = $staff->fresh();
    expect($staff->can('view_statistics'))->toBeTrue();
    $this->actingAs($staff)->get('/staff/statistics')->assertOk()->assertInertia(fn ($page) => $page->component('Portal/Statistics'));
});

test('the shared auth props describe the user\'s portal and permissions', function () {
    $staff = ($this->make)('staff', 'staff@example.com');
    $this->roles['staff']->permissions()->attach($this->viewReports);

    $this->actingAs($staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.portal', 'staff')
            ->where('auth.home', route('dashboard.index'))
            ->where('auth.permissions', ['view_reports']));
});

test('signed-in users opening the sign-in page or the root go to their portal', function () {
    $admin = ($this->make)('admin', 'admin@example.com');

    $this->actingAs($admin)->get('/login')->assertRedirect(route('home'));
    $this->actingAs($admin)->get('/home')->assertRedirect('/dashboard/main');
    $this->actingAs($admin)->get('/')->assertRedirect(route('home'));

    auth()->logout();
    $this->get('/')->assertRedirect(route('login'));
});

test('unknown pages render the not found page, and JSON callers still get JSON', function () {
    $this->get('/no-such-page')->assertNotFound()->assertInertia(fn ($page) => $page->component('Error')->where('status', 404));

    $staff = ($this->make)('staff', 'staff@example.com');
    $this->actingAs($staff)->getJson('/superadmin/settings')->assertForbidden()->assertJsonStructure(['message']);
});

test('sections not built yet show the shared under-construction page with their own title', function (string $path, string $title) {
    $superadmin = ($this->make)('superadmin', 'boss@example.com');

    $this->actingAs($superadmin)->get($path)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Portal/UnderConstruction')->where('title', $title)->missing('user'));
})->with([
    ['/superadmin/accounting', 'Accounting'],
    ['/superadmin/human-resource', 'Human Resource'],
    ['/superadmin/inbox', 'Inbox'],
]);
