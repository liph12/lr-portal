<?php

use App\Models\AppSetting;
use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 09:00:00');

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $this->agent = function (string $name) {
        $user = User::factory()->create(['name' => $name]);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email]);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'registration_status' => 4]);

        return $id;
    };
    $this->ana = ($this->agent)('Ana Reyes');
    $this->ben = ($this->agent)('Ben Cruz');
    $this->cara = ($this->agent)('Cara Lim');

    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    DB::table('brokerage_areas')->insert(['id' => 14, 'name' => 'Cebu Brokerage', 'status' => 'active']);
    $this->alpha = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->ana, 'status' => 'active']);
    $this->bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $this->ben, 'status' => 'active']);
    DB::table('team_agents')->insert([
        ['team_id' => $this->alpha, 'agent_id' => $this->ana, 'joined_at' => '2020-01-01', 'status' => 'active'],
        ['team_id' => $this->bravo, 'agent_id' => $this->ben, 'joined_at' => '2020-01-01', 'status' => 'active'],
        ['team_id' => $this->bravo, 'agent_id' => $this->cara, 'joined_at' => '2020-01-01', 'status' => 'active'],
    ]);
    DB::table('sales_cutoffs')->insert(['month' => '2026-07', 'cutoff_at' => '2026-08-12 17:00:00']);

    $this->sale = function (string $type, int $agentId, float $price, string $date, string $encoded = '2026-08-01 10:00:00', string $status = 'valid') {
        $t = AgentTransaction::create(['agent_id' => $agentId, 'sale_type' => $type, 'commission_status' => 'Unclaimed', 'sale_status' => $status]);
        DB::table('agent_transactions')->where('id', $t->id)->update(['created_at' => $encoded]);
        $row = ['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => $date];
        match ($type) {
            'project' => DB::table('agent_project_transactions')->insert($row + ['developer_id' => 10, 'project_name' => 'Mivela']),
            'rental' => DB::table('agent_rental_transactions')->insert($row + ['commission_received' => 0]),
            'brokerage' => DB::table('agent_brokerage_transactions')->insert($row + ['commission_received' => 0, 'brokerage_area_id' => 14]),
        };
    };

    // Ana: 40M project + 5M brokerage = 45M, qualifies. Ben: 30M + a 20M sale encoded after the cutoff = 30M, doesn't.
    ($this->sale)('project', $this->ana, 40_000_000, '2025-09-10');
    ($this->sale)('brokerage', $this->ana, 5_000_000, '2026-07-30', '2026-08-12 16:59:00');
    ($this->sale)('project', $this->ben, 30_000_000, '2026-02-01');
    ($this->sale)('project', $this->ben, 20_000_000, '2026-07-31', '2026-08-12 17:01:00');
    ($this->sale)('brokerage', $this->cara, 8_000_000, '2026-03-03');
    ($this->sale)('rental', $this->cara, 400_000, '2026-04-04');
    // Outside the period, and not valid.
    ($this->sale)('project', $this->ben, 90_000_000, '2025-07-31');
    ($this->sale)('project', $this->cara, 90_000_000, '2026-01-15', '2026-01-16 09:00:00', 'pending');

    $this->natcon = fn (User $user, string $board = 'qualifiers', array $query = []) => $this->actingAs($user)->get("/natcon/{$board}?".http_build_query($query));
});

afterEach(fn () => Carbon::setTestNow());

test('the NATCON page is a card per board, with how many each ranks', function () {
    $this->actingAs($this->superadmin)->get('/natcon')
        ->assertInertia(fn ($page) => $page->component('Portal/Natcon/Index')
            ->where('settings.cutoff_at', '2026-08-12 17:00:00')
            ->has('boards', 6)
            ->where('boards.1.slug', 'top-teams')
            ->where('counts', fn ($c) => $c['qualifiers'] === 1 && $c['top-teams'] === 2 && $c['top-brokerage-sales'] === 2 && $c['top-rent-managers'] === 1 && $c['top-brokerage-teams'] === 2));

    $this->actingAs($this->superadmin)->get('/natcon/nope')->assertNotFound();
});

test('qualifiers are agents whose valid sales in the period, encoded by the July cutoff, reach the amount', function () {
    ($this->natcon)($this->superadmin)
        ->assertInertia(fn ($page) => $page->component('Portal/Natcon/Show')
            ->where('settings.from', '2025-08-01')
            ->where('settings.to', '2026-07-31')
            ->where('board.slug', 'qualifiers')
            ->where('rows.total', 1)
            ->where('rows.data.0', fn ($r) => $r['name'] === 'Ana Reyes' && $r['rank'] === 1 && (float) $r['value'] === 45_000_000.0));
});

test('the other boards rank without a threshold', function () {
    ($this->natcon)($this->superadmin, 'top-teams')
        ->assertInertia(fn ($page) => $page
            ->where('rows.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 45_000_000.0)
            ->where('rows.data.1', fn ($r) => $r['name'] === 'Bravo' && (float) $r['value'] === 38_400_000.0));

    ($this->natcon)($this->superadmin, 'top-brokerage-teams')
        ->assertInertia(fn ($page) => $page
            ->where('rows.data.0', fn ($r) => $r['name'] === 'Bravo' && (float) $r['value'] === 8_000_000.0)
            ->where('rows.data.1', fn ($r) => $r['name'] === 'Alpha' && $r['rank'] === 2));

    ($this->natcon)($this->superadmin, 'top-rent-managers')
        ->assertInertia(fn ($page) => $page->where('rows.total', 1)->where('rows.data.0.name', 'Cara Lim'));
});

test('Top Rent Managers counts rentals reserved Sep 1 – Aug 31 and encoded by the end of Sep 5', function () {
    $dan = ($this->agent)('Dan Uy');
    ($this->sale)('rental', $dan, 100_000, '2026-08-20', '2026-09-05 22:00:00');   // in: August reservation, encoded on the cutoff day
    ($this->sale)('rental', $dan, 200_000, '2026-08-25', '2026-09-06 08:00:00');   // out: encoded after the cutoff
    ($this->sale)('rental', $dan, 300_000, '2025-08-20', '2025-08-21 08:00:00');   // out: before the rental period
    ($this->sale)('project', $dan, 50_000_000, '2026-08-20', '2026-09-01 08:00:00'); // out of the main boards: after July

    ($this->natcon)($this->superadmin, 'top-rent-managers')
        ->assertInertia(fn ($page) => $page
            ->where('period', ['from' => '2025-09-01', 'to' => '2026-08-31', 'cutoff_at' => '2026-09-05 23:59:59', 'cutoff_month' => null])
            ->where('rows.total', 2)
            ->where('rows.data.0', fn ($r) => $r['name'] === 'Cara Lim' && (float) $r['value'] === 400_000.0)
            ->where('rows.data.1', fn ($r) => $r['name'] === 'Dan Uy' && (float) $r['value'] === 100_000.0));

    ($this->natcon)($this->superadmin)->assertInertia(fn ($page) => $page->where('period.cutoff_month', '2026-07')->where('rows.total', 1));
});

test('admin and staff see every board with amounts, like the superadmin', function () {
    foreach (['admin', 'staff'] as $name) {
        $user = User::factory()->create();
        $role = Role::create(['name' => $name, 'label' => ucfirst($name)]);
        $role->permissions()->attach(Permission::where('name', 'view_natcon')->value('id'));
        $user->roles()->attach($role);

        $this->actingAs($user)->get('/natcon')->assertInertia(fn ($page) => $page->has('boards', 6)->where('group', null));
        ($this->natcon)($user, 'top-teams')->assertInertia(fn ($page) => $page->where('rows.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 45_000_000.0));
    }
});

test('a team leader sees only who qualified on their team; a unit manager on their sub-team', function () {
    $permission = Permission::where('name', 'view_natcon')->value('id');
    $leaderRole = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    $leaderRole->permissions()->attach($permission);
    $ana = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $ana->roles()->attach($leaderRole);

    $this->actingAs($ana)->get('/natcon')
        ->assertInertia(fn ($page) => $page->has('boards', 1)->where('boards.0.slug', 'qualifiers')->where('group', ['name' => 'Alpha', 'type' => 'team'])->where('counts', ['qualifiers' => 1]));
    ($this->natcon)($ana)
        ->assertInertia(fn ($page) => $page->where('rows.total', 1)->where('rows.data.0', fn ($r) => $r['name'] === 'Ana Reyes' && (float) $r['value'] === 45_000_000.0)->where('canOpen', true));
    ($this->natcon)($ana, 'top-teams')->assertForbidden();

    // Ben leads Bravo: Ana (Alpha) isn't his to see, and nobody on Bravo reaches 43M.
    $ben = User::find(DB::table('agents')->where('id', $this->ben)->value('user_id'));
    $ben->roles()->attach($leaderRole);
    ($this->natcon)($ben)->assertInertia(fn ($page) => $page->where('rows.total', 0));

    // A unit manager: their sub-team only (Cara leads one with Ben in it; qualifier lowered to 30M).
    AppSetting::create(['key' => 'natcon', 'value' => ['qualifier_amount' => 30_000_000]]);
    $sub = DB::table('sub_teams')->insertGetId(['name' => 'Bravo One', 'team_id' => $this->bravo, 'agent_id' => $this->cara, 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $sub, 'agent_id' => $this->ben, 'joined_at' => '2020-01-01', 'status' => 'active']);
    $umRole = Role::create(['name' => 'unit_manager', 'label' => 'Unit Manager']);
    $umRole->permissions()->attach($permission);
    $cara = User::find(DB::table('agents')->where('id', $this->cara)->value('user_id'));
    $cara->roles()->attach($umRole);

    ($this->natcon)($cara)
        ->assertInertia(fn ($page) => $page->where('group', ['name' => 'Bravo One', 'type' => 'sub_team'])->where('rows.total', 1)->where('rows.data.0.name', 'Ben Cruz'));
});

test('anyone else is refused, even with the permission', function () {
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $user = User::factory()->create();
    $user->roles()->attach($agentRole);

    $this->actingAs($user)->get('/natcon')->assertForbidden();

    $agentRole->permissions()->attach(Permission::where('name', 'view_natcon')->value('id'));
    $this->actingAs($user)->get('/natcon')->assertForbidden();
    ($this->natcon)($user)->assertForbidden();
});

test('a superadmin sets the period, cutoff month and qualifier amount; nobody else can', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/settings/natcon')
        ->assertInertia(fn ($page) => $page->component('SuperAdmin/Settings/Natcon/Index')->where('settings.qualifier_amount', 43000000));

    $this->actingAs($this->superadmin)
        ->put('/superadmin/settings/natcon', ['from' => '2025-08-01', 'to' => '2026-07-31', 'cutoff_month' => '2026-07', 'qualifier_amount' => '30000000', 'rental_from' => '2025-09-01', 'rental_to' => '2026-08-31', 'rental_cutoff' => '2026-09-05'])
        ->assertSessionHasNoErrors();
    expect(AppSetting::find('natcon')->value['qualifier_amount'])->toEqual(30_000_000);

    // Ben's 30M now qualifies too.
    ($this->natcon)($this->superadmin)->assertInertia(fn ($page) => $page->where('rows.total', 2));

    $this->actingAs($this->superadmin)
        ->put('/superadmin/settings/natcon', ['from' => '2026-08-01', 'to' => '2026-07-31', 'cutoff_month' => 'July', 'qualifier_amount' => '0', 'rental_from' => '2026-09-01', 'rental_to' => '2026-08-31', 'rental_cutoff' => '2026-08-01'])
        ->assertSessionHasErrors(['to', 'cutoff_month', 'qualifier_amount', 'rental_to', 'rental_cutoff']);

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));
    $this->actingAs($admin)->put('/superadmin/settings/natcon', ['from' => '2025-08-01', 'to' => '2026-07-31', 'cutoff_month' => '2026-07', 'qualifier_amount' => '1', 'rental_from' => '2025-09-01', 'rental_to' => '2026-08-31', 'rental_cutoff' => '2026-09-05'])
        ->assertForbidden();
});

test('My NATCON sales: an agent\'s own valid sales in the period, encoded by the cutoff, shown like My Sales', function () {
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $agentRole->permissions()->attach(Permission::where('name', 'view_natcon')->value('id'));
    $ben = User::find(DB::table('agents')->where('id', $this->ben)->value('user_id'));
    $ben->roles()->attach($agentRole);

    // Ben: 30M counts; 20M was encoded after the July cutoff; 90M was reserved before the period.
    $this->actingAs($ben)->get('/natcon/my-sales')
        ->assertInertia(fn ($page) => $page->component('Portal/Natcon/MySales')
            ->where('filters.from', '2025-08-01')->where('filters.to', '2026-07-31')->where('filters.status', 'valid')
            ->where('filters.agent_id', $this->ben)
            ->missing('filters.encoded_by')
            ->where('saleList.total', 1)
            ->where('totals', fn ($t) => collect($t)->sum('value') == 30_000_000)
            ->where('settings.qualifier_amount', 43000000));

    // The URL can't widen it: other dates, statuses or agents are ignored.
    $this->actingAs($ben)->get("/natcon/my-sales?from=2020-01-01&to=2030-01-01&status=all&agent_id={$this->ana}")
        ->assertInertia(fn ($page) => $page->where('saleList.total', 1)->where('filters.agent_id', $this->ben));

    // Ben leads Bravo: his own sales plus the Qualifiers on his team. Cara leads nothing: just her own card.
    $this->actingAs($ben)->get('/natcon')->assertInertia(fn ($page) => $page->where('hasMine', true)->has('boards', 1));
    $cara = User::find(DB::table('agents')->where('id', $this->cara)->value('user_id'));
    $cara->roles()->attach($agentRole);
    $this->actingAs($cara)->get('/natcon')->assertInertia(fn ($page) => $page->where('hasMine', true)->has('boards', 0));
    ($this->natcon)($cara)->assertForbidden();
    // Cara's brokerage (8M) and rental (400k) both count: every category, the qualifier rule.
    $this->actingAs($cara)->get('/natcon/my-sales')->assertInertia(fn ($page) => $page->where('totals', fn ($t) => collect($t)->sum('value') == 8_400_000));
});
