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

    $this->sale = function (User $recorder, string $project, float $price, string $date) {
        $developerId = DB::table('developers')->insertGetId(['name' => "{$project} Dev"]);
        $sale = AgentTransaction::create(['sale_type' => 'project', 'commission_status' => 'Unclaimed', 'recorded_by' => $recorder->id]);
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

    $this->actingAs($this->staff)->get('/staff/dashboard')
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

    $this->actingAs($this->staff)->get('/staff/dashboard')
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

    $this->actingAs($superadmin)->get('/superadmin/dashboard/main')
        ->assertInertia(fn ($page) => $page
            ->where('auth.can.view_leaderboards', true)
            ->reloadOnly('leaderboards', fn ($reload) => $reload->where('leaderboards.0.boards.agents.0.name', 'Agent Carla')));
});
