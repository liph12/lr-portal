<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Legacy\LegacyOfficeImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-09-20 09:00:00');
    $roles = collect(['superadmin' => 'Superadmin', 'secretary' => 'Secretary', 'team_leader' => 'Team Leader', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));
    grantReports($roles['secretary']);
    grantReports($roles['agent']);
    $validation = Permission::firstOrCreate(['name' => 'sales_validation'], ['label' => 'Sales Validation']);
    $roles['secretary']->permissions()->attach($validation);
    $roles['agent']->permissions()->attach($validation);

    $this->person = function (string $name, string $role, ?string $area) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);

        return [$user, DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'area' => $area])];
    };
    [$this->superadmin] = ($this->person)('Sam Admin', 'superadmin', null);
    [$this->secretaryUser, $this->secretary] = ($this->person)('Sela Secretary', 'secretary', 'davao');
    [$this->otherUser] = ($this->person)('Oscar Agent', 'agent', 'davao');
    [, $this->leader] = ($this->person)('Tina Leader', 'team_leader', 'cebu');
    [, $this->davaoMember] = ($this->person)('Dave Davao', 'agent', 'davao');
    [, $this->cebuMember] = ($this->person)('Carl Cebu', 'agent', 'cebu');

    // Team A is led from Cebu but has a member in Davao.
    $this->teamA = DB::table('teams')->insertGetId(['name' => 'Team A', 'agent_id' => $this->leader, 'status' => 'active']);
    foreach ([$this->leader, $this->davaoMember, $this->cebuMember] as $id) {
        DB::table('team_agents')->insert(['team_id' => $this->teamA, 'agent_id' => $id, 'joined_at' => '2025-01-01', 'status' => 'active']);
    }
    DB::table('offices')->insert(['id' => 5, 'name' => 'Davao', 'province' => 'Davao Del Sur', 'area' => 'davao', 'secretary_agent_id' => $this->secretary]);

    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    $this->sale = function (int $agentId, float $price) {
        $t = AgentTransaction::create(['agent_id' => $agentId, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'pending']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => '2026-09-05', 'developer_id' => 10, 'project_name' => 'Mivela']);

        return $t;
    };
    $this->davaoSale = ($this->sale)($this->davaoMember, 3_000_000);
    $this->cebuSale = ($this->sale)($this->cebuMember, 5_000_000);
});

afterEach(fn () => Carbon::setTestNow());

test('an office secretary validates only their area, which opens straight away', function () {
    $this->actingAs($this->secretaryUser)->get('/sales-validation')
        ->assertInertia(fn ($page) => $page->where('filters.area', 'davao')->where('singleArea', true)->where('filters', fn ($f) => ! isset($f['allowed']))
            ->where('counts.project.pending', 1)
            ->where('auth.office_areas', ['Davao']));

    // Another area in the URL isn't theirs: back to their own.
    $this->actingAs($this->secretaryUser)->get('/sales-validation?area=cebu&category=project')
        ->assertInertia(fn ($page) => $page->where('filters.area', 'davao')->where('sales.total', 1)->where('sales.data.0.id', $this->davaoSale->id));

    $this->actingAs($this->secretaryUser)->get("/sales-validation?area=davao&category=project&sale={$this->cebuSale->id}")
        ->assertInertia(fn ($page) => $page->where('saleDetail', null));
    $this->actingAs($this->secretaryUser)->patch("/sales-validation/{$this->cebuSale->id}", ['status' => 'valid'])->assertForbidden();
    $this->actingAs($this->secretaryUser)->patch("/sales-validation/{$this->davaoSale->id}", ['status' => 'valid'])->assertRedirect();
    expect($this->davaoSale->fresh()->sale_status)->toBe('valid');

    // The permission alone isn't enough without an office; the back office still sees every area.
    $this->actingAs($this->otherUser)->get('/sales-validation')->assertForbidden();
    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation')->assertInertia(fn ($page) => $page->where('areas.0.key', 'all'));
});

test('a secretary\'s reports cover their area: its agents, and teams counted only by members there', function () {
    $range = 'from=2026-09-01&to=2026-09-30&status=all';

    $this->actingAs($this->secretaryUser)->get("/reports/top-agents?{$range}")
        ->assertInertia(fn ($page) => $page->where('scopeLocked', true)->where('summary.kpis.value.value', 3_000_000)
            ->where('breakdown.data', fn ($rows) => collect($rows)->pluck('name')->all() === ['Dave Davao']));

    // Team A is a Cebu team, but its Davao member's sale puts it on the Davao list (Cebu sales don't count).
    $this->actingAs($this->secretaryUser)->get("/reports/top-teams?{$range}")
        ->assertInertia(fn ($page) => $page->where('breakdown.data', fn ($rows) => collect($rows)->pluck('value', 'name')->map(fn ($v) => (float) $v)->all() === ['Team A' => 3_000_000.0]));

    // Ranking areas would only show their own.
    $this->actingAs($this->secretaryUser)->get('/reports')->assertInertia(fn ($page) => $page->where('available', fn ($a) => ! collect($a)->contains('area-sales')));

    $this->actingAs($this->secretaryUser)->get("/agents/{$this->davaoMember}")->assertOk();
    $this->actingAs($this->secretaryUser)->get("/agents/{$this->cebuMember}")->assertForbidden();
});

test('legacy offices import with their area and secretary (members.id = agents.id; 0 = none)', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('offices', function (Blueprint $t) {
        $t->id();
        foreach (['secretary', 'address', 'prov_name', 'branch', 'email', 'mobile', 'telephone'] as $c) {
            $t->string($c)->default('');
        }
        $t->integer('member_id')->default(0);
    });
    DB::table('offices')->delete();
    DB::connection('legacy')->table('offices')->insert([
        ['id' => 29, 'branch' => 'Butuan', 'prov_name' => 'Agusan Del Norte', 'member_id' => $this->secretary],
        ['id' => 46, 'branch' => '', 'prov_name' => 'Cavite', 'member_id' => 0],
    ]);

    $result = (new LegacyOfficeImporter)->run();

    expect($result['stats'])->toMatchArray(['imported' => 2, 'with_secretary' => 1])
        ->and(DB::table('offices')->where('id', 29)->first())->area->toBe('cagayan')->secretary_agent_id->toBe($this->secretary)->name->toBe('Butuan')
        ->and(DB::table('offices')->where('id', 46)->first())->area->toBe('metro-manila')->secretary_agent_id->toBeNull()->name->toBe('Cavite');
});

test('the Sales validation badge counts pending sales: all for the back office, the area\'s for a secretary', function () {
    // Pending: one Davao sale, one Cebu sale (any date).
    $this->actingAs($this->superadmin)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.sales_validation', ['pending' => 2]));
    $this->actingAs($this->secretaryUser)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.sales_validation', ['pending' => 1]));
    // Has the permission but no office: no badge (and no page).
    $this->actingAs($this->otherUser)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.sales_validation', null));

    // Validating one takes it off the count.
    $this->actingAs($this->secretaryUser)->patch("/sales-validation/{$this->davaoSale->id}", ['status' => 'valid']);
    $this->actingAs($this->secretaryUser)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.sales_validation', ['pending' => 0]));
});

test('a secretary searches the agents of their office\'s area, and only those', function () {
    $this->actingAs($this->secretaryUser)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.can.search_users', true));

    $this->actingAs($this->secretaryUser)->getJson('/search/users?q=Dave')
        ->assertOk()->assertJsonCount(1, 'users')->assertJsonPath('users.0.name', 'Dave Davao')->assertJsonPath('users.0.agent_id', $this->davaoMember);
    // Cebu's agents aren't theirs to find.
    $this->actingAs($this->secretaryUser)->getJson('/search/users?q=Carl')->assertOk()->assertJsonCount(0, 'users');
    $this->actingAs($this->secretaryUser)->get("/agents/{$this->davaoMember}")->assertOk();

    // An agent who is neither a secretary nor a leader can't search people.
    $this->actingAs($this->otherUser)->getJson('/search/users?q=Dave')->assertForbidden();
});

test('a secretary\'s Recruits and Recruits Progress stay within their area', function () {
    DB::table('agents')->update(['created_at' => '2026-09-01 10:00:00']);
    $range = 'from=2026-09-01&to=2026-09-20';

    $this->actingAs($this->secretaryUser)->get("/reports/recruits-progress?{$range}")
        ->assertInertia(fn ($page) => $page->where('scope.type', 'area')->where('scope.name', 'Davao'));
    $this->actingAs($this->secretaryUser)->get("/reports/recruits?{$range}")
        ->assertInertia(fn ($page) => $page->where('filters.area', 'davao')
            // Named on the page: the area header (and the cards say "· Davao").
            ->where('scope.type', 'area')->where('scope.name', 'Davao')
            ->where('trainees.data', fn ($rows) => collect($rows)->pluck('id')->diff([$this->secretary, $this->otherUser->agent()->value('id'), $this->davaoMember])->isEmpty()));
});
