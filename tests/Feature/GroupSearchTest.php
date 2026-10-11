<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $roles = collect(['superadmin' => 'Superadmin', 'team_leader' => 'Team Leader', 'unit_manager' => 'Unit Manager', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));

    $this->person = function (string $name, string $role) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);

        return [$user, DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email])];
    };
    [$this->superadmin] = ($this->person)('Sam Admin', 'superadmin');
    [$this->leaderUser, $leader] = ($this->person)('Tina Leader', 'team_leader');
    [$this->umUser, $um] = ($this->person)('Uma Manager', 'unit_manager');
    [$this->agentUser] = ($this->person)('Ada Agent', 'agent');
    [, $outsider] = ($this->person)('Olga Outside', 'team_leader');

    $this->alpha = DB::table('teams')->insertGetId(['name' => 'Alpha Stars', 'agent_id' => $leader, 'status' => 'active']);
    $this->bravo = DB::table('teams')->insertGetId(['name' => 'Bravo Stars', 'agent_id' => $outsider, 'status' => 'inactive']);
    $this->unit = DB::table('sub_teams')->insertGetId(['team_id' => $this->alpha, 'name' => 'Alpha Unit', 'agent_id' => $um, 'status' => 'active']);
    DB::table('sub_teams')->insert(['team_id' => $this->alpha, 'name' => 'Alpha Second', 'agent_id' => $leader, 'status' => 'active']);
    DB::table('sub_teams')->insert(['team_id' => $this->bravo, 'name' => 'Bravo Unit', 'agent_id' => $outsider, 'status' => 'active']);

    $this->search = fn (User $user, string $q) => $this->actingAs($user)->getJson('/search/groups?q='.urlencode($q));
});

test('the back office finds every team, sub-team and area, linked to its sales report', function () {
    $groups = collect(($this->search)($this->superadmin, 'stars')->assertOk()->json('groups'));

    expect($groups->pluck('name')->all())->toBe(['Alpha Stars', 'Bravo Stars'])
        ->and($groups[0])->toMatchArray(['type' => 'team', 'url' => "/reports/top-agents?team_id={$this->alpha}", 'detail' => 'Team · led by Tina Leader'])
        ->and($groups[1]['detail'])->toBe('Team · led by Olga Outside · Inactive');

    expect(collect(($this->search)($this->superadmin, 'unit')->json('groups'))->pluck('url')->all())
        ->toContain("/reports/top-agents?sub_team_id={$this->unit}");

    // Areas match by name or by a place listed under them.
    expect(collect(($this->search)($this->superadmin, 'cebu')->json('groups'))->firstWhere('type', 'area'))
        ->toMatchArray(['id' => 'cebu', 'name' => 'Cebu', 'url' => '/reports/top-agents?area=cebu']);
    expect(collect(($this->search)($this->superadmin, 'bulacan')->json('groups'))->firstWhere('type', 'area'))
        ->toMatchArray(['id' => 'metro-manila', 'detail' => 'Area · includes Bulacan']);
});

test('leaders find only their own groups, opened in My Team; agents can\'t search groups', function () {
    expect(($this->search)($this->leaderUser, 'alpha')->json('groups'))->toHaveCount(3)
        ->and(collect(($this->search)($this->leaderUser, 'alpha')->json('groups'))->pluck('url')->all())
        ->toContain("/my-team?team={$this->alpha}", "/my-team?sub_team={$this->unit}")
        ->and(($this->search)($this->leaderUser, 'bravo')->json('groups'))->toBe([])
        ->and(($this->search)($this->leaderUser, 'cebu')->json('groups'))->toBe([]);

    expect(collect(($this->search)($this->umUser, 'alpha')->json('groups'))->pluck('name')->all())->toBe(['Alpha Unit']);

    ($this->search)($this->agentUser, 'alpha')->assertForbidden();
    $this->actingAs($this->agentUser)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.can.search_groups', false));
    $this->actingAs($this->superadmin)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.can.search_groups', true));
});
