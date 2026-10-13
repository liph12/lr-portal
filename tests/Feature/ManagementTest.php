<?php

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    Storage::fake('s3');
    config(['filesystems.profile_photos_disk' => 's3']);

    $role = fn (string $name) => Role::firstOrCreate(['name' => $name], ['label' => ucfirst($name)]);
    $this->person = function (string $name, ?string $roleName = 'agent', string $status = 'active') use ($role) {
        $user = User::factory()->create(['name' => $name, 'status' => $status]);
        if ($roleName) {
            $user->roles()->attach($role($roleName));
        }
        $agentId = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email]);
        DB::table('agent_attributes')->insert(['agent_id' => $agentId, 'registration_status' => 4]);

        return [$user, $agentId];
    };

    // Admins hold every Management permission, as migration 000040 gives them.
    Role::firstOrCreate(['name' => 'admin'], ['label' => 'Admin'])->permissions()->sync(\App\Models\Permission::whereIn('name', array_keys(\App\Models\Permission::MANAGEMENT))->pluck('id'));

    [$this->superadmin] = ($this->person)('Super Admin', 'superadmin');
    [$this->admin] = ($this->person)('Ada Admin', 'admin');
    [$this->staff] = ($this->person)('Sam Staff', 'staff');
    [$this->leaderUser, $this->leader] = ($this->person)('Lea Leader');
    [$this->anaUser, $this->ana] = ($this->person)('Ana Reyes');

    $this->alpha = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->leader, 'status' => 'active']);
    $this->bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $this->leader, 'status' => 'active']);
    $this->unit = DB::table('sub_teams')->insertGetId(['team_id' => $this->bravo, 'name' => 'Bravo Unit 1', 'agent_id' => $this->leader, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $this->alpha, 'agent_id' => $this->ana, 'joined_at' => '2025-01-10', 'status' => 'active']);
});

afterEach(fn () => Carbon::setTestNow());

test('superadmins and admins can open management; staff and agents cannot', function () {
    // Management opens on its cards, with what each section holds; Teams has its own tab.
    $this->actingAs($this->superadmin)->get('/superadmin/management')
        ->assertInertia(fn ($page) => $page->component('Portal/Management/Index')->where('counts.teams', 2)->has('counts.agents')->has('counts.transfers'));
    $this->actingAs($this->superadmin)->get('/superadmin/management/teams')
        ->assertInertia(fn ($page) => $page->component('Portal/Management/Teams')
            ->has('teams', 2)
            ->where('teams.0', fn ($t) => $t['name'] === 'Alpha' && $t['members_count'] === 1 && $t['leader_name'] === 'Lea Leader'));

    $this->actingAs($this->admin)->get('/admin/management/agents?q=ana')
        ->assertInertia(fn ($page) => $page->component('Portal/Management/Agents')
            ->where('agents.total', 1)
            ->where('agents.data.0.name', 'Ana Reyes')
            ->where('agents.data.0.team_name', 'Alpha'));

    $this->actingAs($this->staff)->get('/dashboard/main')->assertOk();
    $this->actingAs($this->staff)->get('/admin/management')->assertForbidden();
    $this->actingAs($this->anaUser)->post('/superadmin/management/teams', [])->assertForbidden();
});

test('a team is created, edited, and given a photo', function () {
    $this->actingAs($this->admin)
        ->post('/admin/management/teams', ['name' => 'Charlie', 'agent_id' => $this->leader, 'status' => 'active'])
        ->assertSessionHasNoErrors();
    $charlie = DB::table('teams')->where('name', 'Charlie')->value('id');

    $this->actingAs($this->admin)
        ->put("/admin/management/teams/{$charlie}", ['name' => 'Alpha', 'agent_id' => $this->ana, 'status' => 'inactive'])
        ->assertSessionHasErrors(['name' => 'Another team already has this name.']);

    $this->actingAs($this->admin)
        ->put("/admin/management/teams/{$charlie}", ['name' => 'Charlie Squad', 'agent_id' => $this->ana, 'status' => 'inactive'])
        ->assertSessionHasNoErrors();

    $this->actingAs($this->admin)
        ->post("/admin/management/teams/{$charlie}/photo", ['photo' => UploadedFile::fake()->image('logo.png', 900, 600)])
        ->assertSessionHasNoErrors();

    $team = DB::table('teams')->find($charlie);
    expect($team->name)->toBe('Charlie Squad')
        ->and($team->agent_id)->toBe($this->ana)
        ->and($team->status)->toBe('inactive')
        ->and($team->logo)->toContain("team-logos/team/{$charlie}/");
    Storage::disk('s3')->assertExists(ltrim(str_replace(rtrim(Storage::disk('s3')->url(''), '/'), '', $team->logo), '/'));
    expect(ActivityLog::where('action', 'team.created')->exists())->toBeTrue();
});

test('deactivating a team closes its memberships and sub-teams; inactive only pauses it', function () {
    DB::table('team_agents')->insert(['team_id' => $this->bravo, 'agent_id' => $this->leader, 'joined_at' => '2024-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $this->unit, 'agent_id' => $this->leader, 'joined_at' => '2024-01-01', 'status' => 'active']);

    $this->actingAs($this->superadmin)->patch("/superadmin/management/teams/{$this->bravo}/status", ['status' => 'inactive'])->assertSessionHasNoErrors();
    expect(DB::table('team_agents')->where('team_id', $this->bravo)->value('status'))->toBe('active');

    $this->actingAs($this->superadmin)->patch("/superadmin/management/teams/{$this->bravo}/status", ['status' => 'deactivated'])->assertSessionHasNoErrors();

    $membership = DB::table('team_agents')->where('team_id', $this->bravo)->first();
    expect($membership->status)->toBe('inactive')
        ->and($membership->transferred_at)->toBe('2026-10-11')
        ->and(DB::table('sub_teams')->where('id', $this->unit)->value('status'))->toBe('deactivated')
        ->and(DB::table('sub_team_agents')->where('sub_team_id', $this->unit)->value('status'))->toBe('inactive');
});

test('a transfer closes the current stint and opens the new one, including the sub-team', function () {
    $this->actingAs($this->admin)
        ->post("/admin/management/agents/{$this->ana}/transfer", ['team_id' => $this->bravo, 'sub_team_id' => $this->unit, 'date' => '2026-10-01'])
        ->assertSessionHasNoErrors();

    $history = DB::table('team_agents')->where('agent_id', $this->ana)->orderBy('joined_at')->get();
    expect($history)->toHaveCount(2)
        ->and($history[0]->status)->toBe('inactive')
        ->and($history[0]->transferred_at)->toBe('2026-10-01')
        ->and($history[1]->team_id)->toBe($this->bravo)
        ->and($history[1]->status)->toBe('active')
        ->and(DB::table('sub_team_agents')->where('agent_id', $this->ana)->value('sub_team_id'))->toBe($this->unit);

    $this->actingAs($this->admin)->get('/admin/management/transfers')
        ->assertInertia(fn ($page) => $page->where('transfers.total', 2)->where('transfers.data.0.team_name', 'Bravo'));
});

test('transfers are refused into the same team, a closed team, a foreign sub-team, or before the current stint', function () {
    $post = fn (array $data) => $this->actingAs($this->admin)->post("/admin/management/agents/{$this->ana}/transfer", $data + ['date' => '2026-10-01']);

    $post(['team_id' => $this->alpha])->assertSessionHasErrors(['team_id' => 'The agent is already on this team.']);
    $post(['team_id' => $this->alpha, 'sub_team_id' => $this->unit])->assertSessionHasErrors('sub_team_id');
    $post(['team_id' => $this->bravo, 'date' => '2024-12-31'])->assertSessionHasErrors('date');
    $post(['team_id' => $this->bravo, 'date' => '2026-12-31'])->assertSessionHasErrors('date');

    DB::table('teams')->where('id', $this->bravo)->update(['status' => 'deactivated']);
    $post(['team_id' => $this->bravo])->assertSessionHasErrors('team_id');

    expect(DB::table('team_agents')->count())->toBe(1);
});

test('admins change agent status and photos, but not those of admins or superadmins', function () {
    $this->actingAs($this->admin)->patch("/admin/management/agents/{$this->ana}/status", ['status' => 'inactive'])->assertSessionHasNoErrors();
    expect($this->anaUser->fresh()->status)->toBe('inactive');

    $this->actingAs($this->admin)
        ->post("/admin/management/agents/{$this->ana}/photo", ['photo' => UploadedFile::fake()->image('me.jpg', 600, 600)])
        ->assertSessionHasNoErrors();
    expect(DB::table('agents')->where('id', $this->ana)->value('avatar'))->toContain('avatars/');

    $superAgent = DB::table('agents')->where('user_id', $this->superadmin->id)->value('id');
    $this->actingAs($this->admin)->patch("/admin/management/agents/{$superAgent}/status", ['status' => 'inactive'])->assertForbidden();
    $this->actingAs($this->admin)->post("/admin/management/agents/{$superAgent}/photo", ['photo' => UploadedFile::fake()->image('x.jpg')])->assertForbidden();

    $adminAgent = DB::table('agents')->where('user_id', $this->admin->id)->value('id');
    $this->actingAs($this->superadmin)->patch("/superadmin/management/agents/{$adminAgent}/status", ['status' => 'inactive'])->assertSessionHasNoErrors();
});

test('sub-teams are created under a team and can be deactivated', function () {
    $this->actingAs($this->admin)
        ->post('/admin/management/sub-teams', ['team_id' => $this->alpha, 'name' => 'Alpha Unit', 'agent_id' => $this->ana, 'status' => 'active'])
        ->assertSessionHasNoErrors();
    $id = DB::table('sub_teams')->where('name', 'Alpha Unit')->value('id');

    $this->actingAs($this->admin)->patch("/admin/management/sub-teams/{$id}/status", ['status' => 'deactivated'])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->get('/admin/management/sub-teams')
        ->assertInertia(fn ($page) => $page->component('Portal/Management/SubTeams')
            ->where('subTeams', fn ($rows) => collect($rows)->firstWhere('name', 'Alpha Unit')['status'] === 'deactivated'));
});

test('admins set an agent as local or global partner and filter by it', function () {
    $this->actingAs($this->admin)->patch("/admin/management/agents/{$this->ana}/type", ['agent_type' => 'global_partner'])->assertSessionHasNoErrors();
    expect(DB::table('agents')->where('id', $this->ana)->value('agent_type'))->toBe('global_partner');

    $this->actingAs($this->admin)->patch("/admin/management/agents/{$this->ana}/type", ['agent_type' => 'alien'])->assertSessionHasErrors('agent_type');

    $this->actingAs($this->admin)->get('/admin/management/agents?agent_type=global_partner')
        ->assertInertia(fn ($page) => $page->where('agents.total', 1)->where('agents.data.0.name', 'Ana Reyes')->where('agentTypes', ['local', 'global_partner']));

    $superAgent = DB::table('agents')->where('user_id', $this->superadmin->id)->value('id');
    $this->actingAs($this->admin)->patch("/admin/management/agents/{$superAgent}/type", ['agent_type' => 'global_partner'])->assertForbidden();
});

test('designation: promote to unit manager by dashboard (the role) or by rate (designation only), and mark brokers, each from a date', function () {
    Role::firstOrCreate(['name' => 'unit_manager'], ['label' => 'Unit Manager']);
    $url = "/admin/management/agents/{$this->ana}/designation";
    $agent = fn () => DB::table('agents')->where('id', $this->ana)->first();
    $role = fn () => $this->anaUser->roles()->pluck('name')->all();

    // By dashboard: the Unit Manager role, from the date given.
    $this->actingAs($this->admin)->put($url, ['unit_manager_by' => 'dashboard', 'unit_manager_since' => '2026-09-01', 'is_broker' => false])->assertRedirect()->assertSessionHasNoErrors();
    expect($role())->toBe(['unit_manager'])->and($agent()->unit_manager_by)->toBe('dashboard')->and(substr($agent()->unit_manager_since, 0, 10))->toBe('2026-09-01')
        ->and(ActivityLog::where('action', 'agent.designation_changed')->exists())->toBeTrue();

    // By rate: back to the Agent role (and dashboard), still a unit manager by rate; plus broker since a date.
    $this->actingAs($this->admin)->put($url, ['unit_manager_by' => 'rate', 'unit_manager_since' => '2026-09-15', 'is_broker' => true, 'broker_since' => '2024-03-01'])->assertSessionHasNoErrors();
    expect($role())->toBe(['agent'])->and($agent()->unit_manager_by)->toBe('rate')->and((bool) $agent()->is_broker)->toBeTrue()->and(substr($agent()->broker_since, 0, 10))->toBe('2024-03-01');

    $this->actingAs($this->admin)->get('/admin/management/agents?designation=um_rate')->assertInertia(fn ($page) => $page->where('agents.total', 1)->where('agents.data.0.id', $this->ana));
    $this->actingAs($this->admin)->get('/admin/management/agents?designation=broker')->assertInertia(fn ($page) => $page->where('agents.total', 1));
    $this->actingAs($this->superadmin)->get("/agents/{$this->ana}")->assertInertia(fn ($page) => $page->where('agent.unit_manager_by', 'rate')->where('agent.broker_since', '2024-03-01'));
    $this->actingAs($this->superadmin)->getJson('/search/users?q=Ana')->assertJsonPath('users.0.is_broker', true)->assertJsonPath('users.0.unit_manager_since', '2026-09-15');

    // Dates are required with a designation, and can't be in the future.
    $this->actingAs($this->admin)->put($url, ['unit_manager_by' => 'rate', 'is_broker' => true])->assertSessionHasErrors(['unit_manager_since', 'broker_since']);
    $this->actingAs($this->admin)->put($url, ['unit_manager_by' => 'rate', 'unit_manager_since' => '2026-12-01', 'is_broker' => false])->assertSessionHasErrors('unit_manager_since');

    // None: everything cleared.
    $this->actingAs($this->admin)->put($url, ['unit_manager_by' => 'none', 'is_broker' => false])->assertSessionHasNoErrors();
    expect($agent()->unit_manager_by)->toBeNull()->and($agent()->unit_manager_since)->toBeNull()->and((bool) $agent()->is_broker)->toBeFalse()->and($agent()->broker_since)->toBeNull();

    // A team leader can be a unit manager by rate or a broker, but not take the Unit Manager role.
    [$tlUser, $tl] = ($this->person)('Tom Leader', 'team_leader');
    $this->actingAs($this->admin)->put("/admin/management/agents/{$tl}/designation", ['unit_manager_by' => 'dashboard', 'unit_manager_since' => '2026-09-01', 'is_broker' => false])->assertSessionHasErrors('unit_manager_by');
    $this->actingAs($this->admin)->put("/admin/management/agents/{$tl}/designation", ['unit_manager_by' => 'rate', 'unit_manager_since' => '2026-09-01', 'is_broker' => true, 'broker_since' => '2025-01-01'])->assertSessionHasNoErrors();
    expect($tlUser->roles()->pluck('name')->all())->toBe(['team_leader']);

    // Same reach as the agent's type: admins can't change an admin; nor can staff.
    [, $otherAdmin] = ($this->person)('Other Admin', 'admin');
    $this->actingAs($this->admin)->put("/admin/management/agents/{$otherAdmin}/designation", ['unit_manager_by' => 'none', 'is_broker' => true, 'broker_since' => '2025-01-01'])->assertForbidden();
    $this->actingAs($this->staff)->put($url, ['unit_manager_by' => 'none', 'is_broker' => false])->assertForbidden();
});

test('the agents list shows agents on a team who finished signing up, unless asked otherwise', function () {
    // Ana is on Alpha; Lea leads teams but isn't a member of one; Nico never finished signing up (step 2).
    [, $nico] = ($this->person)('Nico New');
    DB::table('agent_attributes')->where('agent_id', $nico)->update(['registration_status' => 2]);
    DB::table('team_agents')->insert(['team_id' => $this->alpha, 'agent_id' => $nico, 'joined_at' => '2026-01-01', 'status' => 'active']);
    $names = fn (string $query) => collect($this->actingAs($this->admin)->get("/admin/management/agents?{$query}&per_page=100")->viewData('page')['props']['agents']['data'])->pluck('name')->sort()->values()->all();

    expect($names('q='))->toBe(['Ana Reyes'])
        ->and($names('membership=no_team'))->toContain('Lea Leader')->not->toContain('Ana Reyes')
        ->and($names('registration=incomplete'))->toBe(['Nico New'])
        ->and($names('membership=any&registration=any'))->toContain('Ana Reyes', 'Lea Leader', 'Nico New');
});

test('clicking an agent loads the same details the search shows, only when asked for', function () {
    DB::table('agents')->where('id', $this->ana)->update(['mobile' => '09171234567', 'city' => 'Cebu City']);
    $headers = [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'Portal/Management/Agents',
        'X-Inertia-Partial-Data' => 'agentDetail',
    ];

    // Not sent with the page itself.
    $this->actingAs($this->admin)->get('/admin/management/agents')->assertInertia(fn ($page) => $page->missing('agentDetail'));

    $this->actingAs($this->admin)->get("/admin/management/agents?agent={$this->ana}", $headers)
        ->assertJsonPath('props.agentDetail.agent_id', $this->ana)
        ->assertJsonPath('props.agentDetail.details.team', 'Alpha')
        ->assertJsonPath('props.agentDetail.details.mobile', '09171234567');
    $this->actingAs($this->admin)->get('/admin/management/agents?agent=999999', $headers)->assertNotFound();
    $this->actingAs($this->staff)->get("/admin/management/agents?agent={$this->ana}", $headers)->assertForbidden();
});

test('each kind of change in Management needs its own permission', function () {
    $admin = Role::where('name', 'admin')->first();
    $without = function (string $permission) use ($admin) {
        $admin->permissions()->sync(\App\Models\Permission::whereIn('name', array_diff(array_keys(\App\Models\Permission::MANAGEMENT), [$permission]))->pluck('id'));
    };

    $without('change_agent_status');
    $this->actingAs($this->admin)->patch("/admin/management/agents/{$this->ana}/status", ['status' => 'inactive'])->assertForbidden();
    $this->actingAs($this->admin)->get('/admin/management/agents')->assertOk();

    $without('edit_designation');
    $this->actingAs($this->admin)->put("/admin/management/agents/{$this->ana}/designation", ['unit_manager_by' => 'none', 'is_broker' => false])->assertForbidden();

    $without('transfer_agents');
    $this->actingAs($this->admin)->post("/admin/management/agents/{$this->ana}/transfer", ['team_id' => $this->bravo, 'date' => '2026-10-01'])->assertForbidden();

    $without('edit_teams');
    $this->actingAs($this->admin)->post('/admin/management/teams', ['name' => 'Charlie', 'agent_id' => $this->leader])->assertForbidden();
    $this->actingAs($this->admin)->put("/admin/management/teams/{$this->alpha}", ['name' => 'Alpha 2', 'agent_id' => $this->leader])->assertForbidden();
    $this->actingAs($this->admin)->post("/admin/management/teams/{$this->alpha}/photo", ['photo' => UploadedFile::fake()->image('t.jpg')])->assertForbidden();
    $this->actingAs($this->admin)->post('/admin/management/sub-teams', ['team_id' => $this->alpha, 'name' => 'Alpha 1', 'agent_id' => $this->ana])->assertForbidden();
    // An agent's own photo isn't "editing teams".
    $this->actingAs($this->admin)->post("/admin/management/agents/{$this->ana}/photo", ['photo' => UploadedFile::fake()->image('me.jpg', 600, 600)])->assertRedirect();

    $without('change_team_status');
    $this->actingAs($this->admin)->patch("/admin/management/teams/{$this->alpha}/status", ['status' => 'inactive'])->assertForbidden();
    $this->actingAs($this->admin)->patch("/admin/management/sub-teams/{$this->unit}/status", ['status' => 'inactive'])->assertForbidden();

    // With it back, the change goes through; superadmins pass every permission anyway.
    $admin->permissions()->sync(\App\Models\Permission::whereIn('name', array_keys(\App\Models\Permission::MANAGEMENT))->pluck('id'));
    $this->actingAs($this->admin)->patch("/admin/management/teams/{$this->alpha}/status", ['status' => 'inactive'])->assertSessionHasNoErrors();
    $admin->permissions()->detach();
    $this->actingAs($this->superadmin)->patch("/superadmin/management/teams/{$this->alpha}/status", ['status' => 'active'])->assertSessionHasNoErrors();
});

test('staff get Management in their portal once a role holds any Management permission, and change only field roles', function () {
    $staffRole = Role::where('name', 'staff')->first();
    $this->actingAs($this->staff)->get('/staff/management/agents')->assertForbidden();

    $staffRole->permissions()->sync(\App\Models\Permission::where('name', 'edit_designation')->pluck('id'));
    $this->actingAs($this->staff)->get('/staff/management')->assertInertia(fn ($page) => $page->component('Portal/Management/Index')->has('counts'));
    $this->actingAs($this->staff)->get('/staff/management/agents')->assertOk();
    $this->actingAs($this->staff)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.can.manage_teams', true));

    // Designation (and the agent's type) yes; everything else needs its own permission.
    $this->actingAs($this->staff)->put("/staff/management/agents/{$this->ana}/designation", ['unit_manager_by' => 'rate', 'unit_manager_since' => '2026-09-01', 'is_broker' => false])->assertSessionHasNoErrors();
    $this->actingAs($this->staff)->patch("/staff/management/agents/{$this->ana}/type", ['agent_type' => 'global_partner'])->assertSessionHasNoErrors();
    $this->actingAs($this->staff)->patch("/staff/management/agents/{$this->ana}/status", ['status' => 'inactive'])->assertForbidden();
    $this->actingAs($this->staff)->post("/staff/management/agents/{$this->ana}/transfer", ['team_id' => $this->bravo, 'date' => '2026-10-01'])->assertForbidden();
    $this->actingAs($this->staff)->patch("/staff/management/teams/{$this->alpha}/status", ['status' => 'inactive'])->assertForbidden();

    // Field roles only: not admins, other staff or superadmins.
    [, $otherStaff] = ($this->person)('Other Staff', 'staff');
    [, $adminAgent] = ($this->person)('Another Admin', 'admin');
    foreach ([$otherStaff, $adminAgent] as $id) {
        $this->actingAs($this->staff)->put("/staff/management/agents/{$id}/designation", ['unit_manager_by' => 'none', 'is_broker' => false])->assertForbidden();
    }
});

test('the receivings are Management cards: a role with only a receiving permission gets Management with just that', function () {
    $staffRole = Role::where('name', 'staff')->first();
    $staffRole->permissions()->sync(\App\Models\Permission::where('name', 'receive_rental_sales')->pluck('id'));

    $this->actingAs($this->staff)->get('/staff/management')
        ->assertInertia(fn ($page) => $page->component('Portal/Management/Index')->where('counts', null)->where('auth.commission_receiving.rental', 0));
    $this->actingAs($this->staff)->get('/rental-receiving')->assertOk();
    $this->actingAs($this->staff)->get('/staff/management/agents')->assertForbidden();
    $this->actingAs($this->staff)->get('/brokerage-receiving')->assertForbidden();

    // Neither Management nor receiving: no Management at all.
    $staffRole->permissions()->detach();
    $this->actingAs($this->staff)->get('/staff/management')->assertForbidden();
});
