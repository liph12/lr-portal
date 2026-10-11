<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    $roles = collect(['team_leader' => 'Team Leader', 'unit_manager' => 'Unit Manager', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));

    $this->person = function (string $name, string $role) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);

        return [$user, DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email])];
    };
    [$this->leaderUser, $this->leader] = ($this->person)('Tina Leader', 'team_leader');
    [$this->umUser, $this->um] = ($this->person)('Uma Manager', 'unit_manager');
    [, $this->member] = ($this->person)('Mark Member', 'agent');
    [, $this->free] = ($this->person)('Fred Free', 'agent');
    [, $this->outsider] = ($this->person)('Olga Outside', 'agent');

    $this->team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->leader, 'status' => 'active']);
    $this->other = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $this->outsider, 'status' => 'active']);
    $this->unit = DB::table('sub_teams')->insertGetId(['team_id' => $this->team, 'name' => 'Alpha Unit', 'agent_id' => $this->um, 'status' => 'active']);
    $this->otherUnit = DB::table('sub_teams')->insertGetId(['team_id' => $this->other, 'name' => 'Bravo Unit', 'agent_id' => $this->outsider, 'status' => 'active']);
    foreach ([$this->leader, $this->um, $this->member] as $id) {
        DB::table('team_agents')->insert(['team_id' => $this->team, 'agent_id' => $id, 'joined_at' => '2025-01-01', 'status' => 'active']);
    }
    DB::table('team_agents')->insert(['team_id' => $this->other, 'agent_id' => $this->outsider, 'joined_at' => '2025-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $this->unit, 'agent_id' => $this->member, 'joined_at' => '2025-01-01', 'status' => 'active']);

    foreach ([[$this->member, 7_000_000], [$this->outsider, 50_000_000]] as [$agent, $price]) {
        $t = AgentTransaction::create(['agent_id' => $agent, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => '2026-09-15', 'project_name' => 'X']);
    }
});

afterEach(fn () => Carbon::setTestNow());

test('a team leader sees only their team: last month\'s top agents and totals', function () {
    $this->actingAs($this->leaderUser)->get('/my-team')
        ->assertInertia(fn ($page) => $page->component('Portal/MyTeam/Index')
            ->where('group.name', 'Alpha')
            ->where('canManage', true)
            ->where('filters.from', '2026-09-01')
            ->where('filters.to', '2026-09-30')
            ->where('summary.kpis.value.value', 7_000_000)
            ->where('breakdown.total', 1)
            ->where('breakdown.data.0.name', 'Mark Member')
            ->where('auth.leads.teams.0.name', 'Alpha'));

    // The team can't be swapped for someone else's through the query string.
    $this->actingAs($this->leaderUser)->get("/my-team?team={$this->other}&team_id={$this->other}")
        ->assertInertia(fn ($page) => $page->where('group.name', 'Alpha')->where('summary.kpis.value.value', 7_000_000));
});

test('a unit manager monitors their sub-team but cannot change anything', function () {
    $this->actingAs($this->umUser)->get('/my-team')
        ->assertInertia(fn ($page) => $page->where('group.type', 'sub_team')->where('canManage', false)->where('breakdown.data.0.name', 'Mark Member'));
    $this->actingAs($this->umUser)->get('/my-team/members')->assertInertia(fn ($page) => $page->where('members.total', 1)->where('memberCount', 1)->where('members.data.0.name', 'Mark Member'));
    $this->actingAs($this->leaderUser)->get('/my-team/members?q=mark')->assertInertia(fn ($page) => $page->where('members.total', 1)->where('memberCount', 3));
    $this->actingAs($this->umUser)->get('/my-team/sub-teams')->assertForbidden();
    $this->actingAs($this->umUser)->patch("/my-team/teams/{$this->team}/members/{$this->member}", ['sub_team_id' => null])->assertForbidden();

    [$nobody] = ($this->person)('No Body', 'agent');
    $this->actingAs($nobody)->get('/my-team')->assertForbidden();
});

test('a team leader adds agents without a team and moves members between their own sub-teams', function () {
    $this->actingAs($this->leaderUser)->post("/my-team/teams/{$this->team}/members", ['agent_id' => $this->free, 'sub_team_id' => $this->unit])->assertSessionHasNoErrors();
    expect(DB::table('team_agents')->where('agent_id', $this->free)->value('team_id'))->toBe($this->team)
        ->and(DB::table('sub_team_agents')->where('agent_id', $this->free)->value('sub_team_id'))->toBe($this->unit);

    // Someone on another team needs an admin transfer.
    $this->actingAs($this->leaderUser)->post("/my-team/teams/{$this->team}/members", ['agent_id' => $this->outsider])->assertSessionHasErrors('agent_id');

    $this->actingAs($this->leaderUser)->patch("/my-team/teams/{$this->team}/members/{$this->member}", ['sub_team_id' => null])->assertSessionHasNoErrors();
    expect(DB::table('sub_team_agents')->where('agent_id', $this->member)->value('status'))->toBe('inactive');

    $this->actingAs($this->leaderUser)->patch("/my-team/teams/{$this->team}/members/{$this->member}", ['sub_team_id' => $this->otherUnit])->assertSessionHasErrors('sub_team_id');
    $this->actingAs($this->leaderUser)->patch("/my-team/teams/{$this->team}/members/{$this->outsider}", ['sub_team_id' => $this->unit])->assertSessionHasErrors('agent');
    $this->actingAs($this->leaderUser)->patch("/my-team/teams/{$this->other}/members/{$this->outsider}", ['sub_team_id' => null])->assertForbidden();
});

test('a team leader creates sub-teams led by their own members', function () {
    $this->actingAs($this->leaderUser)->post("/my-team/teams/{$this->team}/sub-teams", ['name' => 'Alpha Two', 'agent_id' => $this->member, 'status' => 'active'])->assertSessionHasNoErrors();
    expect(DB::table('sub_teams')->where('name', 'Alpha Two')->value('team_id'))->toBe($this->team);

    $this->actingAs($this->leaderUser)->post("/my-team/teams/{$this->team}/sub-teams", ['name' => 'Bad', 'agent_id' => $this->outsider, 'status' => 'active'])->assertSessionHasErrors('agent_id');
    $this->actingAs($this->leaderUser)->put("/my-team/teams/{$this->team}/sub-teams/{$this->otherUnit}", ['name' => 'Mine now', 'agent_id' => $this->member, 'status' => 'active'])->assertForbidden();
    expect(DB::table('sub_teams')->where('id', $this->otherUnit)->value('name'))->toBe('Bravo Unit');
});

test('leaders can open their members\' profiles, not other people\'s', function () {
    $this->actingAs($this->leaderUser)->get("/agents/{$this->member}")->assertOk();
    $this->actingAs($this->umUser)->get("/agents/{$this->member}")->assertOk();
    $this->actingAs($this->leaderUser)->get("/agents/{$this->outsider}")->assertForbidden();
});

test('a team leader opens one of their sub-teams to see its network and sales, but not another team\'s', function () {
    $this->actingAs($this->leaderUser)->get("/my-team?sub_team={$this->unit}")
        ->assertInertia(fn ($page) => $page
            ->where('group.type', 'sub_team')
            ->where('group.name', 'Alpha Unit')
            ->where('group.parent', ['id' => $this->team, 'name' => 'Alpha'])
            ->where('canManage', false)
            ->where('summary.kpis.value.value', 7_000_000)
            ->where('breakdown.data.0.name', 'Mark Member'));

    $this->actingAs($this->leaderUser)->get("/my-team/members?sub_team={$this->unit}")
        ->assertInertia(fn ($page) => $page->where('members.total', 1)->where('canManage', false));

    // Another team's sub-team falls back to the leader's own team.
    $this->actingAs($this->leaderUser)->get("/my-team?sub_team={$this->otherUnit}")
        ->assertInertia(fn ($page) => $page->where('group.name', 'Alpha')->where('group.parent', null));
});

test('view sales shows a team leader only their team, and can\'t be widened', function () {
    $this->actingAs($this->leaderUser)->get('/dashboard/view-sales?from=2026-09-01&to=2026-09-30')
        ->assertInertia(fn ($page) => $page->component('Portal/Dashboard/Reports/Index')
            ->where('scopeLocked', true)
            ->where('scope.name', 'Alpha')
            ->where('summary.kpis.value.value', 7_000_000));

    $this->actingAs($this->leaderUser)->get("/dashboard/view-sales?from=2026-09-01&to=2026-09-30&team_id={$this->other}&area=cebu")
        ->assertInertia(fn ($page) => $page->where('scope.name', 'Alpha')->where('summary.kpis.value.value', 7_000_000));

    // A unit manager gets their sub-team; someone who leads nothing (and can't read reports) gets nothing.
    $this->actingAs($this->umUser)->get('/dashboard/view-sales?from=2026-09-01&to=2026-09-30')
        ->assertInertia(fn ($page) => $page->where('scope.name', 'Alpha Unit'));
    [$nobody] = ($this->person)('No Body', 'agent');
    $this->actingAs($nobody)->get('/dashboard/view-sales')->assertForbidden();
});

test('report reach follows who you are, even when your role has view_reports', function () {
    $viewReports = \App\Models\Permission::firstOrCreate(['name' => 'view_reports'], ['label' => 'View Reports']);
    Role::whereIn('name', ['team_leader', 'agent'])->get()->each(fn ($r) => $r->permissions()->attach($viewReports));
    $range = '?from=2026-09-01&to=2026-09-30';

    // Team leader: their team only, on View Sales and on every report.
    $this->actingAs($this->leaderUser->fresh())->get("/dashboard/view-sales{$range}")
        ->assertInertia(fn ($page) => $page->where('scopeLocked', true)->where('scope.name', 'Alpha')->where('summary.kpis.value.value', 7_000_000));
    $this->actingAs($this->leaderUser->fresh())->get("/reports/top-agents{$range}&team_id={$this->other}")
        ->assertInertia(fn ($page) => $page->where('scopeLocked', true)->where('summary.kpis.value.value', 7_000_000));

    // A plain agent: only their own sales.
    $memberUser = User::find(DB::table('agents')->where('id', $this->member)->value('user_id'));
    $this->actingAs($memberUser->fresh())->get("/dashboard/view-sales{$range}")
        ->assertInertia(fn ($page) => $page->where('scope.type', 'agent')->where('summary.kpis.value.value', 7_000_000)->where('breakdown.total', 1));
    $this->actingAs($memberUser->fresh())->get("/agents/{$this->outsider}")->assertForbidden();
    $this->actingAs($memberUser->fresh())->get("/agents/{$this->member}")->assertOk();

    // Back office still sees the whole system.
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));
    Role::where('name', 'admin')->first()->permissions()->attach($viewReports);
    $this->actingAs($admin->fresh())->get("/dashboard/view-sales{$range}")
        ->assertInertia(fn ($page) => $page->where('scopeLocked', false)->where('summary.kpis.value.value', 57_000_000));
});

test('the team leader\'s sub-teams show sub-team sales and the unit managers\' own sales', function () {
    $t = AgentTransaction::create(['agent_id' => $this->um, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 3_000_000, 'reservation_date' => '2026-09-20', 'project_name' => 'Y']);

    // Uma (the unit manager) isn't a member of her own sub-team here; Mark is. Sub-team sales = Mark's 7M.
    $this->actingAs($this->leaderUser)->get('/my-team/sub-teams')
        ->assertInertia(fn ($page) => $page->component('Portal/MyTeam/SubTeams')
            ->where('filters.from', '2026-09-01')
            ->where('subTeams.0', fn ($s) => $s['name'] === 'Alpha Unit' && (float) $s['sales'] === 7_000_000.0 && (float) $s['leader_sales'] === 3_000_000.0));

    $this->actingAs($this->leaderUser)->get('/my-team/sub-teams?from=2026-10-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('subTeams.0', fn ($s) => (float) $s['sales'] === 0.0));
});

test('team-locked readers don\'t get Top Teams; unit managers don\'t get Top Sub-teams either', function () {
    $viewReports = \App\Models\Permission::firstOrCreate(['name' => 'view_reports'], ['label' => 'View Reports']);

    $this->actingAs($this->leaderUser)->get('/reports')
        ->assertInertia(fn ($page) => $page->where('available', fn ($a) => ! collect($a)->contains('top-teams') && collect($a)->contains('top-sub-teams')));
    $this->actingAs($this->leaderUser)->get('/reports/top-teams')->assertNotFound();
    $this->actingAs($this->leaderUser)->get('/dashboard/view-sales?view=teams')
        ->assertInertia(fn ($page) => $page->where('filters.view', 'agents')->where('options.views', fn ($v) => ! collect($v)->contains('teams')));

    $this->actingAs($this->umUser)->get('/reports')
        ->assertInertia(fn ($page) => $page->where('available', fn ($a) => ! collect($a)->contains('top-teams') && ! collect($a)->contains('top-sub-teams')));

    $admin = User::factory()->create();
    $admin->roles()->attach($adminRole = Role::create(['name' => 'admin', 'label' => 'Admin']));
    $adminRole->permissions()->attach($viewReports);
    $this->actingAs($admin->fresh())->get('/reports')->assertInertia(fn ($page) => $page->where('available', fn ($a) => collect($a)->contains('top-teams')));
});

test('the dashboard overview shows sales for the reader\'s reach', function () {
    $range = '?from=2026-09-01&to=2026-09-30';

    $admin = User::factory()->create();
    $admin->roles()->attach($adminRole = Role::create(['name' => 'admin', 'label' => 'Admin']));
    $adminRole->permissions()->attach(\App\Models\Permission::firstOrCreate(['name' => 'view_reports'], ['label' => 'View Reports']));

    // Back office: the whole system, ranked by teams.
    $this->actingAs($admin->fresh())->get("/dashboard/overview{$range}")
        ->assertInertia(fn ($page) => $page->component('Portal/Dashboard/Overview/Index')
            ->where('scope', null)
            ->where('summary.kpis.value.value', 57_000_000)
            ->where('topAgents.0.name', 'Olga Outside')
            ->where('topGroups.view', 'teams'));

    // Team leader: only their team, ranked by sub-teams.
    $this->actingAs($this->leaderUser)->get("/dashboard/overview{$range}")
        ->assertInertia(fn ($page) => $page
            ->where('scope.name', 'Alpha')
            ->where('summary.kpis.value.value', 7_000_000)
            ->where('topAgents.0.name', 'Mark Member')
            ->where('topGroups.view', 'sub_teams')
            ->where('topGroups.rows.0.name', 'Alpha Unit'));

    // Unit manager: their sub-team, nothing below it to rank.
    $this->actingAs($this->umUser)->get("/dashboard/overview{$range}")
        ->assertInertia(fn ($page) => $page->where('scope.name', 'Alpha Unit')->where('topGroups', null));

    [$nobody] = ($this->person)('No Body', 'agent');
    $this->actingAs($nobody)->get('/dashboard/overview')->assertForbidden();
});

test('an agent\'s profile shows their sponsor and full details, with the TIN only for the back office', function () {
    DB::table('agent_attributes')->insert([
        ['agent_id' => $this->member, 'referral_id' => $this->leader, 'nao_video_tracker' => 100, 'fire_certificates' => 2],
        ['agent_id' => $this->free, 'referral_id' => $this->member, 'nao_video_tracker' => 0, 'fire_certificates' => 0],
    ]);
    DB::table('agent_credentials')->insert(['agent_id' => $this->member, 'tax_identification_no' => '123456789', 'prc_expiration' => '2025-01-31']);
    DB::table('agent_profiles')->insert(['agent_id' => $this->member, 'about' => 'Top closer', 'facebook' => 'https://facebook.com/mark']);

    $this->actingAs($this->leaderUser)->get("/agents/{$this->member}")
        ->assertInertia(fn ($page) => $page
            ->where('sponsor.name', 'Tina Leader')
            ->where('sponsor.email', $this->leaderUser->email)
            ->where('details.nao', 100)
            ->where('details.fire', 2)
            ->where('details.direct_recruits', 1)
            ->where('details.about', 'Top closer')
            ->where('details.links', ['Facebook' => 'https://facebook.com/mark'])
            ->where('details.prc_expiration', '2025-01-31')
            ->where('details.tin', null)
            ->where('details.tin_hidden', true));

    $superadmin = User::factory()->create();
    $superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->actingAs($superadmin)->get("/agents/{$this->member}")
        ->assertInertia(fn ($page) => $page->where('details.tin', '123456789')->where('details.tin_hidden', false)->where('sponsor.linkable', true));
});
