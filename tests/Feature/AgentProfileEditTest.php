<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 09:00:00');
    $this->permission = Permission::where('name', 'edit_agent_profile')->value('id');

    $this->role = fn (string $name, bool $grant = false) => tap(Role::firstOrCreate(['name' => $name], ['label' => ucfirst($name)]), fn ($r) => $grant ? $r->permissions()->syncWithoutDetaching([$this->permission]) : null);
    $this->user = function (string $name, string $role, bool $grant = false) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach(($this->role)($role, $grant));
        $agent = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'first_name' => explode(' ', $name)[0], 'last_name' => explode(' ', $name)[1] ?? '']);

        return [$user, $agent];
    };

    [$this->superadmin] = ($this->user)('Sue Admin', 'superadmin');
    [$this->admin] = ($this->user)('Adam Min', 'admin', true);
    [$this->agentUser, $this->agent] = ($this->user)('Ana Reyes', 'agent');
    [, $this->uplineB] = ($this->user)('Ben Cruz', 'team_leader');
    [, $this->uplineC] = ($this->user)('Cara Lim', 'agent');

    $team = fn (string $name, int $leader) => DB::table('teams')->insertGetId(['name' => $name, 'agent_id' => $leader, 'status' => 'active']);
    $this->alpha = $team('Alpha', $this->uplineC);
    $this->bravo = $team('Bravo', $this->uplineB);
    $this->alphaOne = DB::table('sub_teams')->insertGetId(['name' => 'Alpha One', 'team_id' => $this->alpha, 'agent_id' => $this->uplineC, 'status' => 'active']);
    $this->bravoOne = DB::table('sub_teams')->insertGetId(['name' => 'Bravo One', 'team_id' => $this->bravo, 'agent_id' => $this->uplineB, 'status' => 'active']);

    // Ana is on Alpha / Alpha One under Cara.
    DB::table('agent_attributes')->insert(['agent_id' => $this->agent, 'referral_id' => $this->uplineC]);
    DB::table('team_agents')->insert(['team_id' => $this->alpha, 'agent_id' => $this->agent, 'joined_at' => '2024-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $this->alphaOne, 'agent_id' => $this->agent, 'joined_at' => '2024-01-01', 'status' => 'active']);

    $this->profile = ['first_name' => 'Ana', 'middle_name' => 'M', 'last_name' => 'Santos', 'email' => 'ana.santos@example.com', 'mobile' => '09171234567', 'gender' => 'Female', 'city' => 'Cebu City', 'state' => 'Cebu'];
    $this->active = fn (string $table, string $column) => DB::table($table)->where('agent_id', $this->agent)->where('status', 'active')->pluck($column)->all();
});

afterEach(fn () => Carbon::setTestNow());

test('superadmin and admin edit an agent\'s profile; the account follows', function () {
    $this->actingAs($this->admin)->get("/agents/{$this->agent}")
        ->assertInertia(fn ($page) => $page->where('editable.last_name', 'Reyes')->has('maritalStatuses'));

    $this->actingAs($this->admin)->put("/agents/{$this->agent}", $this->profile)->assertSessionHasNoErrors();

    expect(DB::table('agents')->where('id', $this->agent)->first())->last_name->toBe('Santos')->city->toBe('Cebu City')
        ->and($this->agentUser->fresh())->name->toBe('Ana Santos')->email->toBe('ana.santos@example.com');
});

test('only edit_agent_profile holders edit, and only a superadmin edits admins', function () {
    [$staff] = ($this->user)('Sam Staff', 'staff');
    $this->actingAs($staff)->put("/agents/{$this->agent}", $this->profile)->assertForbidden();
    $this->actingAs($staff)->get("/agents/{$this->agent}")->assertInertia(fn ($page) => $page->where('editable', null));

    [, $otherAdmin] = ($this->user)('Ada Two', 'admin', true);
    $this->actingAs($this->admin)->put("/agents/{$otherAdmin}", [...$this->profile, 'email' => 'x@example.com'])->assertForbidden();
    $this->actingAs($this->superadmin)->put("/agents/{$otherAdmin}", [...$this->profile, 'email' => 'x@example.com'])->assertSessionHasNoErrors();
});

test('a new upline moves the agent to the upline\'s team and sub-team, keeping the history', function () {
    DB::table('sub_team_agents')->insert(['sub_team_id' => $this->bravoOne, 'agent_id' => $this->uplineB, 'joined_at' => '2023-01-01', 'status' => 'active']);

    $this->actingAs($this->admin)->get("/agents/{$this->agent}?upline_preview={$this->uplineB}")
        ->assertInertia(fn ($page) => $page->missing('uplinePlacement')
            ->reloadOnly('uplinePlacement', fn ($reload) => $reload->where('uplinePlacement', ['upline_id' => $this->uplineB, 'team' => 'Bravo', 'sub_team' => 'Bravo One'])));

    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $this->uplineB, 'date' => '2026-10-01'])
        ->assertSessionHasNoErrors()->assertSessionHas('success', 'Upline changed and moved to Bravo / Bravo One.');

    expect(DB::table('agent_attributes')->where('agent_id', $this->agent)->value('referral_id'))->toBe($this->uplineB)
        ->and(($this->active)('team_agents', 'team_id'))->toBe([$this->bravo])
        ->and(($this->active)('sub_team_agents', 'sub_team_id'))->toBe([$this->bravoOne])
        ->and(DB::table('team_agents')->where('agent_id', $this->agent)->where('team_id', $this->alpha)->first())->status->toBe('inactive')->transferred_at->toStartWith('2026-10-01');
});

test('an upline on a team without a sub-team there moves the agent to the team only', function () {
    // Ben leads Bravo; Bravo One is someone else's, so Ben has no sub-team.
    DB::table('sub_teams')->where('id', $this->bravoOne)->update(['agent_id' => $this->uplineC]);

    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $this->uplineB, 'date' => '2026-10-01'])
        ->assertSessionHas('success', 'Upline changed and moved to Bravo.');

    expect(($this->active)('team_agents', 'team_id'))->toBe([$this->bravo])
        ->and(($this->active)('sub_team_agents', 'sub_team_id'))->toBe([]);
});

test('an upline with no team changes only the upline', function () {
    [, $loner] = ($this->user)('Lou Free', 'agent');

    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $loner, 'date' => '2026-10-01'])->assertSessionHas('warning');

    expect(DB::table('agent_attributes')->where('agent_id', $this->agent)->value('referral_id'))->toBe($loner)
        ->and(($this->active)('team_agents', 'team_id'))->toBe([$this->alpha]);
});

test('the agent themself or someone in their downline can\'t become the upline', function () {
    [, $recruit] = ($this->user)('Rex Down', 'agent');
    DB::table('agent_attributes')->insert(['agent_id' => $recruit, 'referral_id' => $this->agent]);

    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $recruit, 'date' => '2026-10-01'])->assertSessionHasErrors('upline_id');
    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $this->agent, 'date' => '2026-10-01'])->assertSessionHasErrors('upline_id');
    $this->actingAs($this->admin)->put("/agents/{$this->agent}/upline", ['upline_id' => $this->uplineB, 'date' => '2026-12-01'])->assertSessionHasErrors('date');

    expect(DB::table('agent_attributes')->where('agent_id', $this->agent)->value('referral_id'))->toBe($this->uplineC);
});
