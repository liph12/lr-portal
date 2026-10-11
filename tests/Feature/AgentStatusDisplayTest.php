<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);

    $this->agent = function (string $name, string $activity) use ($agentRole) {
        $user = User::factory()->create(['name' => $name, 'password' => Hash::make('Secret123')]);
        $user->roles()->attach($agentRole);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'activity' => $activity, 'activated_at' => '2025-01-01 00:00:00']);

        return [$user, $id];
    };
    [$this->dormantUser, $this->dormant] = ($this->agent)('Dora Dormant', 'dormant');
    [, $this->active] = ($this->agent)('Ace Active', 'active');
});

afterEach(fn () => Carbon::setTestNow());

test('a dormant agent shows, filters and counts as inactive, but can still sign in', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/management/agents?status=inactive')
        ->assertInertia(fn ($page) => $page
            ->where('agents.total', 1)
            ->where('agents.data.0', fn ($r) => $r['name'] === 'Dora Dormant' && $r['status'] === 'inactive' && $r['account_status'] === 'active' && $r['activity'] === 'dormant'));
    $this->actingAs($this->superadmin)->get('/superadmin/management/agents?status=active')
        ->assertInertia(fn ($page) => $page->where('agents.total', 1)->where('agents.data.0.name', 'Ace Active'));

    $this->actingAs($this->superadmin)->get("/agents/{$this->dormant}")->assertInertia(fn ($page) => $page->where('agent.status', 'inactive'));
    $this->actingAs($this->superadmin)->getJson('/search/users?q=dora')->assertJsonPath('users.0.status', 'inactive');

    auth()->logout();
    $this->post('/login-attempt', ['email' => $this->dormantUser->email, 'password' => 'Secret123'])->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($this->dormantUser);
});

test('setting a dormant agent active restarts their 6 months', function () {
    $this->actingAs($this->superadmin)->patch("/superadmin/management/agents/{$this->dormant}/status", ['status' => 'active'])->assertSessionHasNoErrors();

    $agent = DB::table('agents')->where('id', $this->dormant)->first();
    expect($agent->activity)->toBe('active')
        ->and((string) $agent->activated_at)->toStartWith('2026-10-11')
        ->and(DB::table('activity_logs')->where('action', 'user.reactivated')->exists())->toBeTrue();
});
