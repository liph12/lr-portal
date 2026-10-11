<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-15 09:00:00');

    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $this->staff = User::factory()->create(['name' => 'Staff Member']);
    $this->staff->roles()->attach($this->staffRole);

    $this->ana = User::factory()->create(['name' => 'Ana Reyes']);
    $this->ben = User::factory()->create(['name' => 'Ben Cruz']);

    $this->sale = function (User $recorder, string $project, float $price, string $date, string $status = 'valid') {
        $developerId = DB::table('developers')->insertGetId(['name' => "{$project} Dev"]);
        $sale = AgentTransaction::create(['sale_type' => 'project', 'commission_status' => 'Unclaimed', 'recorded_by' => $recorder->id, 'sale_status' => $status]);
        $sale->projectTransaction()->create([
            'developer_id' => $developerId,
            'project_name' => $project,
            'total_contract_price' => $price,
            'reservation_date' => $date,
        ]);
    };
});

afterEach(fn () => Carbon::setTestNow());

test('the permission exists and is off for staff until granted', function () {
    expect(Permission::where('name', 'view_leaderboards')->value('label'))->toBe('View Sales Leaderboards');

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.view_leaderboards', false)
            ->missing('leaderboards')
            ->reloadOnly('leaderboards', fn ($reload) => $reload->where('leaderboards', null)));
});

test('once granted, staff get this and last month\'s leaderboards, ranked by contract value', function () {
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));

    ($this->sale)($this->ana, 'Mivela', 20_000_000, '2026-10-01');
    ($this->sale)($this->ben, 'Casa Mira', 30_000_000, '2026-10-07');
    ($this->sale)($this->ana, 'Mivela', 5_000_000, '2026-10-09');
    ($this->sale)($this->ana, 'Old Project', 9_000_000, '2026-09-20');
    ($this->sale)($this->ana, 'Ancient', 1_000_000, '2026-08-01'); // outside both months

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.view_leaderboards', true)
            ->missing('leaderboards')
            ->reloadOnly('leaderboards', fn ($reload) => $reload
                ->where('leaderboards.0.month', '2026-10')
                ->where('leaderboards.0.boards.agents.0.name', 'Ben Cruz')
                ->where('leaderboards.0.boards.agents.1', fn ($ana) => $ana['name'] === 'Ana Reyes' && $ana['sales'] === 2 && (float) $ana['value'] === 25_000_000.0)
                ->where('leaderboards.0.boards.projects.0.name', 'Casa Mira')
                ->where('leaderboards.0.boards.projects.1.sales', 2)
                ->has('leaderboards.0.boards.developers', 3)
                ->where('leaderboards.1.month', '2026-09')
                ->has('leaderboards.1.boards.agents', 1)
                ->where('leaderboards.1.boards.agents.0.name', 'Ana Reyes')));
});

test('a sale with an agent is credited to that agent rather than the recorder', function () {
    $agentUser = User::factory()->create(['name' => 'Agent Carla']);
    $agentId = DB::table('agents')->insertGetId(['user_id' => $agentUser->id, 'email' => 'carla@example.com', 'first_name' => 'Carla']);
    ($this->sale)($this->ana, 'Mivela', 10_000_000, '2026-10-02');
    AgentTransaction::query()->update(['agent_id' => $agentId]);

    $superadmin = User::factory()->create();
    $superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $this->actingAs($superadmin)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.view_leaderboards', true)
            ->reloadOnly('leaderboards', fn ($reload) => $reload->where('leaderboards.0.boards.agents.0.name', 'Agent Carla')));
});

test('only valid sales rank, and rental and brokerage sales count toward top agents', function () {
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));
    DB::table('brokerage_areas')->insert(['id' => 14, 'name' => 'Cebu Brokerage']);

    $other = function (string $type, User $recorder, float $price, string $status = 'valid') {
        $sale = AgentTransaction::create(['sale_type' => $type, 'commission_status' => 'Unclaimed', 'recorded_by' => $recorder->id, 'sale_status' => $status]);
        $row = ['agent_transaction_id' => $sale->id, 'total_contract_price' => $price, 'commission_received' => 0, 'reservation_date' => '2026-10-05'];
        DB::table($type === 'rental' ? 'agent_rental_transactions' : 'agent_brokerage_transactions')
            ->insert($type === 'rental' ? $row : $row + ['brokerage_area_id' => 14]);
    };

    ($this->sale)($this->ana, 'Mivela', 10_000_000, '2026-10-01');
    ($this->sale)($this->ana, 'Mivela', 90_000_000, '2026-10-02', 'pending');
    ($this->sale)($this->ana, 'Mivela', 90_000_000, '2026-10-02', 'invalid');
    ($this->sale)($this->ana, 'Mivela', 90_000_000, '2026-10-02', 'cancelled');
    $other('rental', $this->ben, 6_000_000);
    $other('brokerage', $this->ben, 7_000_000);
    $other('rental', $this->ben, 50_000_000, 'cancelled');

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->where('leaderboards.0.boards.agents.0', fn ($a) => $a['name'] === 'Ben Cruz' && $a['sales'] === 2 && (float) $a['value'] === 13_000_000.0)
            ->where('leaderboards.0.boards.agents.1', fn ($a) => $a['name'] === 'Ana Reyes' && $a['sales'] === 1 && (float) $a['value'] === 10_000_000.0)
            ->has('leaderboards.0.boards.agents', 2)
            // Rentals and brokerage have no project, so project boards stay project-only.
            ->where('leaderboards.0.boards.projects', fn ($p) => count($p) === 1 && $p[0]['name'] === 'Mivela' && $p[0]['sales'] === 1)));
});

test('a month with a cutoff only counts sales encoded by then; an open month counts everything', function () {
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));
    DB::table('sales_cutoffs')->insert(['month' => '2026-09', 'cutoff_at' => '2026-10-02 17:00:00']);

    ($this->sale)($this->ana, 'On Time', 5_000_000, '2026-09-28');
    ($this->sale)($this->ben, 'Late', 50_000_000, '2026-09-29');
    ($this->sale)($this->ben, 'October', 1_000_000, '2026-10-03');
    AgentTransaction::whereHas('projectTransaction', fn ($q) => $q->where('project_name', 'On Time'))->update(['created_at' => '2026-10-02 16:59:00']);
    AgentTransaction::whereHas('projectTransaction', fn ($q) => $q->where('project_name', 'Late'))->update(['created_at' => '2026-10-02 17:30:00']);

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->where('leaderboards.0.cutoff_at', null)
            ->where('leaderboards.0.boards.agents.0.name', 'Ben Cruz')
            ->where('leaderboards.1.cutoff_at', '2026-10-02 17:00:00')
            ->has('leaderboards.1.boards.agents', 1)
            ->where('leaderboards.1.boards.agents.0.name', 'Ana Reyes')
            ->where('leaderboards.1.boards.projects', fn ($p) => count($p) === 1 && $p[0]['name'] === 'On Time')));
});

test('top teams credit each sale to the team its agent was on at the reservation date', function () {
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));
    $agent = fn (User $user) => DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email]);
    $ana = $agent($this->ana);
    $ben = $agent($this->ben);
    $alpha = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $ana]);
    $bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $ben]);
    DB::table('team_agents')->insert([
        // Ana moved from Alpha to Bravo on 10 October.
        ['team_id' => $alpha, 'agent_id' => $ana, 'joined_at' => '2024-01-01', 'transferred_at' => '2026-10-10', 'status' => 'inactive'],
        ['team_id' => $bravo, 'agent_id' => $ana, 'joined_at' => '2026-10-10', 'transferred_at' => null, 'status' => 'active'],
        ['team_id' => $bravo, 'agent_id' => $ben, 'joined_at' => '2025-01-01', 'transferred_at' => null, 'status' => 'active'],
    ]);

    ($this->sale)($this->ana, 'Mivela', 8_000_000, '2026-10-05');
    ($this->sale)($this->ana, 'Mivela', 3_000_000, '2026-10-12');
    ($this->sale)($this->ben, 'Casa Mira', 2_000_000, '2026-10-06');

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->has('leaderboards.0.boards.teams', 2)
            ->where('leaderboards.0.boards.teams.0', fn ($t) => $t['name'] === 'Alpha' && $t['sales'] === 1 && (float) $t['value'] === 8_000_000.0)
            ->where('leaderboards.0.boards.teams.1', fn ($t) => $t['name'] === 'Bravo' && $t['sales'] === 2 && (float) $t['value'] === 5_000_000.0)));
});

test('top brokerage ranks agents by their brokerage sales only', function () {
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));
    DB::table('brokerage_areas')->insert(['id' => 14, 'name' => 'Cebu Brokerage']);
    $brokerage = function (User $recorder, float $price, string $date) {
        $sale = AgentTransaction::create(['sale_type' => 'brokerage', 'commission_status' => 'Unclaimed', 'recorded_by' => $recorder->id, 'sale_status' => 'valid']);
        DB::table('agent_brokerage_transactions')->insert(['agent_transaction_id' => $sale->id, 'total_contract_price' => $price, 'commission_received' => 0, 'reservation_date' => $date, 'brokerage_area_id' => 14]);
    };

    ($this->sale)($this->ana, 'Mivela', 90_000_000, '2026-09-10');
    $brokerage($this->ben, 4_000_000, '2026-09-11');
    $brokerage($this->ana, 3_000_000, '2026-09-12');

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->has('leaderboards.1.boards.brokerage', 2)
            ->where('leaderboards.1.boards.brokerage.0', fn ($a) => $a['name'] === 'Ben Cruz' && (float) $a['value'] === 4_000_000.0)
            ->where('leaderboards.1.boards.brokerage.1', fn ($a) => $a['name'] === 'Ana Reyes' && (float) $a['value'] === 3_000_000.0)
            ->where('leaderboards.1.boards.agents.0.name', 'Ana Reyes')));
});

test('field roles see the leaderboard ranking without any sales figures', function () {
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $agentRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));
    $agent = User::factory()->create();
    $agent->roles()->attach($agentRole);
    $this->staffRole->permissions()->attach(Permission::where('name', 'view_leaderboards')->value('id'));

    ($this->sale)($this->ben, 'Casa Mira', 30_000_000, '2026-10-07');
    ($this->sale)($this->ana, 'Mivela', 20_000_000, '2026-10-01');

    $this->actingAs($agent)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->where('leaderboards.0.boards.agents', fn ($rows) => collect($rows)->pluck('name')->all() === ['Ben Cruz', 'Ana Reyes']
                && collect($rows)->every(fn ($r) => ! array_key_exists('value', (array) $r) && ! array_key_exists('sales', (array) $r)))
            ->where('leaderboards.0.boards.projects.0', fn ($p) => ! array_key_exists('value', (array) $p))));

    $this->actingAs($this->staff)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->reloadOnly('leaderboards', fn ($reload) => $reload
            ->where('leaderboards.0.boards.agents.0.value', 30_000_000)));
});
