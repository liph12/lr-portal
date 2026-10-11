<?php

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadminRole = Role::create(['name' => 'superadmin', 'label' => 'Superadmin']);
    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach($this->superadminRole);

    $this->juan = User::factory()->create(['name' => 'Juan Dela Cruz', 'email' => 'juan@example.com', 'password' => 'Secret123']);
    $this->juan->roles()->attach($this->staffRole);
});

test('new and existing users are active by default', function () {
    expect($this->juan->fresh()->status)->toBe('active')
        ->and($this->juan->isActive())->toBeTrue();
});

test('a superadmin can set active, inactive, resigned and terminated', function () {
    foreach (['inactive', 'resigned', 'terminated', 'active'] as $status) {
        $this->actingAs($this->superadmin)
            ->put("/superadmin/settings/users/{$this->juan->id}/status", ['status' => $status])
            ->assertSessionHasNoErrors();

        expect($this->juan->fresh()->status)->toBe($status);
    }

    expect($this->juan->fresh()->status_changed_at)->not->toBeNull();

    $log = ActivityLog::where('action', 'user.status_changed')->orderBy('id')->first();
    expect($log->description)->toBe("Changed Juan Dela Cruz's status from active to inactive");
});

test('unknown statuses are rejected', function () {
    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/users/{$this->juan->id}/status", ['status' => 'suspended'])
        ->assertSessionHasErrors('status');

    expect($this->juan->fresh()->status)->toBe('active');
});

test('non-active users cannot sign in and see why', function (string $status) {
    $this->juan->forceFill(['status' => $status])->save();

    $this->post('/login-attempt', ['email' => 'juan@example.com', 'password' => 'Secret123'])
        ->assertSessionHasErrors(['email' => "This account is {$status}. Contact your administrator if this is a mistake."]);

    $this->assertGuest();
    expect(ActivityLog::where('action', 'auth.login_blocked')->exists())->toBeTrue();
})->with(['inactive', 'resigned', 'terminated']);

test('a wrong password still gets the generic message', function () {
    $this->post('/login-attempt', ['email' => 'juan@example.com', 'password' => 'nope'])
        ->assertSessionHasErrors(['email' => 'Invalid email or password.']);
});

test('a signed-in user is signed out on their next request once deactivated', function () {
    $this->actingAs($this->juan)->get('/profile')->assertOk();

    $this->juan->forceFill(['status' => 'terminated'])->save();

    $this->actingAs($this->juan)
        ->get('/profile')
        ->assertRedirect('/login')
        ->assertSessionHasErrors(['email' => 'Your account is terminated. Contact your administrator if this is a mistake.']);

    $this->assertGuest();
});

test('you cannot change your own status, and the last active superadmin stays active', function () {
    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/users/{$this->superadmin->id}/status", ['status' => 'resigned'])
        ->assertSessionHasErrors(['status' => "You can't change your own status. Ask another superadmin."]);

    $other = User::factory()->create(['name' => 'Ana Reyes']);
    $other->roles()->attach($this->superadminRole);
    $this->superadmin->forceFill(['status' => 'inactive'])->save();

    expect(fn () => app(App\Services\UserAccountService::class)->changeStatus($this->superadmin, $other, 'terminated'))
        ->toThrow(Illuminate\Validation\ValidationException::class, 'Ana Reyes is the only active Superadmin. Activate or assign another Superadmin first.');

    expect($other->fresh()->status)->toBe('active');
});

test('only superadmins can change status', function () {
    $this->actingAs($this->juan)
        ->put("/superadmin/settings/users/{$this->superadmin->id}/status", ['status' => 'terminated'])
        ->assertForbidden();

    expect($this->superadmin->fresh()->status)->toBe('active');
});

test('the roles page includes each user\'s status', function () {
    $this->juan->forceFill(['status' => 'resigned'])->save();

    $this->actingAs($this->superadmin)
        ->get("/superadmin/settings/roles?role={$this->staffRole->id}")
        ->assertInertia(fn ($page) => $page
            ->where('statuses', ['active', 'inactive', 'resigned', 'terminated'])
            ->where('members.data', fn ($members) => collect($members)->firstWhere('name', 'Juan Dela Cruz')['status'] === 'resigned'));
});
