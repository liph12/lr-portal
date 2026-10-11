<?php

use App\Models\Role;
use App\Models\User;
use App\Services\OnlineUsersService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadminRole = Role::create(['name' => 'superadmin', 'label' => 'Superadmin']);
    $this->agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
});

function signIn(User $user, int $minutesAgo): void
{
    DB::table('sessions')->insert([
        'id' => Str::random(40),
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => '',
        'last_activity' => now()->subMinutes($minutesAgo)->getTimestamp(),
    ]);
}

test('greetings use the signed-in user\'s own first name', function () {
    $ana = User::factory()->create(['name' => 'Ana Marie Reyes']);
    $ana->roles()->attach($this->agentRole);

    $this->actingAs($ana)->get('/profile')
        ->assertInertia(fn ($page) => $page->where('auth.first_name', 'Ana')->where('auth.name', 'Ana Marie Reyes'));

    $ana->agent()->create(['first_name' => 'Ana Marie', 'last_name' => 'Reyes', 'email' => $ana->email]);

    $this->actingAs($ana)->get('/profile')
        ->assertInertia(fn ($page) => $page->where('auth.first_name', 'Ana Marie'));
});

test('online users come from recent sessions, newest first, excluding the viewer and inactive accounts', function () {
    config(['session.driver' => 'database', 'session.lifetime' => 120]);

    $me = User::factory()->create(['name' => 'Philip Libres']);
    $juan = User::factory()->create(['name' => 'Juan Dela Cruz']);
    $maria = User::factory()->create(['name' => 'Maria Clara']);
    $gone = User::factory()->create(['name' => 'Old Session']);
    $resigned = User::factory()->create(['name' => 'Resigned Person', 'status' => 'resigned']);
    $juan->roles()->attach($this->agentRole);

    signIn($me, 0);
    signIn($juan, 1);
    signIn($maria, 30);
    signIn($maria, 90);
    signIn($gone, 200);
    signIn($resigned, 1);

    $online = app(OnlineUsersService::class)->recentlyActive($me->id);

    expect(array_column($online, 'name'))->toBe(['Juan Dela Cruz', 'Maria Clara'])
        ->and($online[0])->toMatchArray(['online' => true, 'role' => 'Agent', 'last_seen' => '1m'])
        ->and($online[1])->toMatchArray(['online' => false, 'last_seen' => '30m', 'role' => null]);
});

test('every signed-in user receives the online users list', function () {
    $agent = User::factory()->create();
    $agent->roles()->attach($this->agentRole);

    $this->actingAs($agent)->get('/profile')
        ->assertInertia(fn ($page) => $page->has('online_users'));
});

test('active users join the presence channel with display fields only', function () {
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);
    // phpunit boots with the null broadcaster, so register the channel rules on the reverb driver too.
    require base_path('routes/channels.php');

    $juan = User::factory()->create(['name' => 'Juan Dela Cruz', 'email' => 'juan@example.com']);
    $juan->roles()->attach($this->agentRole);

    $response = $this->actingAs($juan)
        ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'presence-portal.online'])
        ->assertOk()
        ->assertJsonStructure(['auth', 'channel_data']);

    $member = json_decode($response->json('channel_data'), true);
    expect((int) $member['user_id'])->toBe($juan->id)
        ->and($member['user_info'])->toBe(['id' => $juan->id, 'name' => 'Juan Dela Cruz', 'avatar' => null, 'role' => 'Agent']);

    $juan->forceFill(['status' => 'terminated'])->save();
    $this->actingAs($juan->fresh())
        ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'presence-portal.online'])
        ->assertForbidden();

    auth()->logout();
    $this->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'presence-portal.online'])
        ->assertForbidden();
});
