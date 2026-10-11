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

        return [$user, $agentId];
    };

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
    $this->actingAs($this->superadmin)->get('/superadmin/management')
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
