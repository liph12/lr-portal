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
    Carbon::setTestNow('2026-10-11 09:00:00');

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

    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    DB::table('brokerage_areas')->insert(['id' => 14, 'name' => 'Cebu Brokerage', 'status' => 'active']);
    $this->alpha = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->ana, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $this->alpha, 'agent_id' => $this->ana, 'joined_at' => '2020-01-01', 'status' => 'active']);

    $this->sale = function (string $type, int $agentId, float $price, string $date, string $status = 'valid') {
        $t = AgentTransaction::create(['agent_id' => $agentId, 'sale_type' => $type, 'commission_status' => 'Unclaimed', 'sale_status' => $status]);
        $row = ['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => $date];
        match ($type) {
            'project' => DB::table('agent_project_transactions')->insert($row + ['developer_id' => 10, 'project_name' => 'Mivela']),
            'rental' => DB::table('agent_rental_transactions')->insert($row + ['commission_received' => 0]),
            'brokerage' => DB::table('agent_brokerage_transactions')->insert($row + ['commission_received' => 0, 'brokerage_area_id' => 14]),
        };
    };

    ($this->sale)('project', $this->ana, 10_000_000, '2026-03-10');
    ($this->sale)('project', $this->ben, 4_000_000, '2026-04-02');
    ($this->sale)('rental', $this->ben, 300_000, '2026-04-15');
    ($this->sale)('brokerage', $this->ana, 6_000_000, '2026-05-20');
    ($this->sale)('project', $this->ana, 99_000_000, '2026-05-21', 'pending');
    ($this->sale)('project', $this->ana, 1_000_000, '2025-12-31');
    DB::table('international_sales')->insert(['agent_id' => $this->ben, 'unit_number' => '5A', 'total_contract_price' => 2_000_000, 'reservation_date' => '2026-06-01', 'sale_status' => 'valid']);

    $this->report = fn (array $query = []) => $this->actingAs($this->superadmin)->get('/dashboard/view-sales?'.http_build_query($query));
});

afterEach(fn () => Carbon::setTestNow());

test('the report totals valid local sales of every category in the date range, with a monthly trend', function () {
    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11'])
        ->assertInertia(fn ($page) => $page->component('Portal/Dashboard/Reports/Index')
            ->where('filters.view', 'agents')
            ->where('summary.kpis.sales.value', 4)
            ->where('summary.kpis.value.value', 20_300_000)
            ->where('summary.kpis.agents.value', 2)
            ->where('summary.bucket', 'month')
            ->has('summary.trend', 10)
            ->where('summary.trend.2', ['month' => '2026-03', 'sales' => 1, 'value' => 10_000_000])
            ->where('summary.categories', fn ($c) => collect($c)->pluck('sales', 'category')->all() == ['project' => 2, 'brokerage' => 1, 'rental' => 1])
            ->where('breakdown.total', 2)
            // Only the name, where they belong and the total: no count, average or share.
            ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Ana Reyes' && (float) $r['value'] === 16_000_000.0 && $r['team'] === 'Alpha'
                && ! $r->has('sales') && ! $r->has('average') && ! $r->has('share')));
});

test('global partners and international sales are left out: they get statistics of their own', function () {
    $gp = ($this->agent)('Gina Partner');
    DB::table('agents')->where('id', $gp)->update(['agent_type' => 'global_partner']);
    ($this->sale)('project', $gp, 50_000_000, '2026-06-10');

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11', 'category' => 'international'])
        ->assertInertia(fn ($page) => $page
            ->where('options.categories', ['project', 'rental', 'brokerage'])
            ->where('filters.category', null)
            ->where('summary.kpis.sales.value', 4)
            ->where('summary.kpis.value.value', 20_300_000)
            ->where('breakdown.total', 2));
});

test('category, status and date filters narrow the report', function () {
    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11', 'category' => 'project'])
        ->assertInertia(fn ($page) => $page->where('summary.kpis.sales.value', 2)->where('summary.kpis.value.value', 14_000_000));

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11', 'status' => 'all'])
        ->assertInertia(fn ($page) => $page->where('summary.kpis.sales.value', 5));

    ($this->report)(['from' => '2026-04-01', 'to' => '2026-04-30'])
        ->assertInertia(fn ($page) => $page->where('summary.kpis.sales.value', 2)
            ->where('summary.comparison', ['from' => '2026-03-02', 'to' => '2026-03-31'])
            ->where('summary.kpis.sales.previous', 1));
});

test('each view groups the same sales differently', function () {
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    ($this->report)($range + ['view' => 'developers'])->assertInertia(fn ($page) => $page
        ->where('filters.category', 'project')
        ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Cebu Landmasters' && (float) $r['value'] === 14_000_000.0));

    // Brokerage ranks the agents who made brokerage sales, and only those sales.
    ($this->report)($range + ['view' => 'brokerage'])->assertInertia(fn ($page) => $page
        ->where('filters.category', 'brokerage')
        ->where('breakdown.total', 1)
        ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Ana Reyes' && (float) $r['value'] === 6_000_000.0));

    ($this->report)($range + ['view' => 'rental'])->assertInertia(fn ($page) => $page
        ->where('breakdown.total', 1)->where('breakdown.data.0.name', 'Ben Cruz'));

    // Only Ana is on a team, so Alpha gets her project and brokerage sales.
    ($this->report)($range + ['view' => 'teams'])->assertInertia(fn ($page) => $page
        ->where('breakdown.total', 1)
        ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 16_000_000.0));
});

test('the report needs view_reports', function () {
    $viewReports = Permission::create(['name' => 'view_reports', 'label' => 'View Reports']);
    $staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $staff = User::factory()->create();
    $staff->roles()->attach($staffRole);

    $this->actingAs($staff)->get('/dashboard/view-sales')->assertForbidden();

    $staffRole->permissions()->attach($viewReports);
    $this->actingAs($staff->fresh())->get('/dashboard/view-sales')->assertOk();
    $this->actingAs($staff->fresh())->get('/dashboard/view-sales/developer')->assertRedirect(route('dashboard.view-sales', ['view' => 'developers']));
});

test('clicking a team shows its top agents, counting each sale for the team the agent was on that day', function () {
    // Ben was on Alpha until 10 Apr, then moved to Bravo.
    $bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $this->ben, 'status' => 'active']);
    DB::table('team_agents')->insert([
        ['team_id' => $this->alpha, 'agent_id' => $this->ben, 'joined_at' => '2026-01-01', 'transferred_at' => '2026-04-10', 'status' => 'inactive'],
        ['team_id' => $bravo, 'agent_id' => $this->ben, 'joined_at' => '2026-04-10', 'transferred_at' => null, 'status' => 'active'],
    ]);
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    // Alpha: Ana's 10M project + 6M brokerage, and Ben's 4M project from 2 Apr (before he moved).
    ($this->report)($range + ['view' => 'agents', 'team_id' => $this->alpha])
        ->assertInertia(fn ($page) => $page
            ->where('scope.type', 'team')
            ->where('scope.name', 'Alpha')
            ->where('scope.facts', fn ($facts) => collect($facts)->pluck('value', 'label')->get('Team leader') === 'Ana Reyes')
            ->where('summary.kpis.value.value', 20_000_000)
            ->where('breakdown.total', 2)
            ->where('breakdown.data', fn ($rows) => collect($rows)->pluck('value', 'name')->map(fn ($v) => (float) $v)->all() == ['Ana Reyes' => 16_000_000.0, 'Ben Cruz' => 4_000_000.0]));

    // Bravo: only Ben's sales after the move (rental on 15 Apr; his international sale isn't counted here).
    ($this->report)($range + ['view' => 'agents', 'team_id' => $bravo])
        ->assertInertia(fn ($page) => $page->where('summary.kpis.sales.value', 1)->where('summary.kpis.value.value', 300_000));

    // The teams table and the drill-down agree.
    ($this->report)($range + ['view' => 'teams'])
        ->assertInertia(fn ($page) => $page->where('breakdown.data', fn ($rows) => collect($rows)->pluck('value', 'name')->map(fn ($v) => (float) $v)->all() == ['Alpha' => 20_000_000.0, 'Bravo' => 300_000.0]));
});

test('clicking a developer shows the agents who sold its projects', function () {
    DB::table('developers')->insert(['id' => 11, 'name' => 'Other Dev']);
    $t = AgentTransaction::create(['agent_id' => $this->ben, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 50_000_000, 'reservation_date' => '2026-07-01', 'developer_id' => 11, 'project_name' => 'X']);

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11', 'view' => 'agents', 'developer_id' => 10])
        ->assertInertia(fn ($page) => $page
            ->where('filters.category', 'project')
            ->where('scope.name', 'Cebu Landmasters')
            ->where('summary.kpis.value.value', 14_000_000)
            ->where('breakdown.data.0.name', 'Ana Reyes'));
});

test('sales by area, and clicking an area shows its top agents', function () {
    DB::table('agents')->where('id', $this->ana)->update(['state' => 'Cebu', 'area' => 'cebu']);
    DB::table('agents')->where('id', $this->ben)->update(['state' => 'Bulacan', 'area' => 'metro-manila']);
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    ($this->report)($range + ['view' => 'areas'])
        ->assertInertia(fn ($page) => $page
            ->where('breakdown.data.0', fn ($r) => $r['id'] === 'cebu' && $r['name'] === 'Cebu' && (float) $r['value'] === 16_000_000.0 && $r['detail'] === '1 agent in this area')
            ->where('breakdown.data.1.name', 'Metro Manila'));

    ($this->report)($range + ['view' => 'agents', 'area' => 'metro-manila'])
        ->assertInertia(fn ($page) => $page
            ->where('scope.name', 'Metro Manila')
            ->where('scope.facts.0', ['label' => 'Agents in this area', 'value' => '1'])
            ->where('breakdown.total', 1)
            ->where('breakdown.data.0.name', 'Ben Cruz'));
});

test('an agent\'s area follows their address', function () {
    $agent = \App\Models\Entities\Agent::find($this->ana);
    $agent->update(['state' => 'Negros Oriental']);
    expect($agent->fresh()->area)->toBe('dumaguete');

    $agent->update(['city' => 'Somewhere']);
    expect($agent->fresh()->area)->toBe('dumaguete');
});

test('rows show where they belong, and the statistics include sales by area', function () {
    DB::table('agents')->where('id', $this->ana)->update(['area' => 'cebu']);
    DB::table('teams')->where('id', $this->alpha)->update(['agent_id' => $this->ana]);

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11'])
        ->assertInertia(fn ($page) => $page
            ->where('breakdown.data.0.area', 'Cebu')
            ->where('breakdown.data.0.team', 'Alpha')
            ->where('summary.areas.0', ['area' => 'cebu', 'name' => 'Cebu', 'sales' => 2, 'value' => 16_000_000]));

    // A team sits in its leader's area.
    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11', 'view' => 'teams'])
        ->assertInertia(fn ($page) => $page->where('breakdown.data.0.area', 'Cebu'));
});

test('an agent\'s profile shows where they belong and their own sales', function () {
    DB::table('agents')->where('id', $this->ana)->update(['area' => 'cebu', 'city' => 'Mandaue', 'state' => 'Cebu']);

    $this->actingAs($this->superadmin)->get("/agents/{$this->ana}?from=2026-01-01&to=2026-10-11")
        ->assertInertia(fn ($page) => $page->component('Portal/Agents/Show')
            ->where('agent.name', 'Ana Reyes')
            ->where('agent.area', 'Cebu')
            ->where('teams.0.name', 'Alpha')
            ->where('summary.kpis.value.value', 16_000_000)
            ->where('summary.kpis.sales.value', 2));

    $outsider = User::factory()->create();
    $this->actingAs($outsider)->get("/agents/{$this->ana}")->assertForbidden();
});

test('statistics split sales by client country, client gender and property type', function () {
    $ids = AgentTransaction::orderBy('id')->pluck('id');
    DB::table('agent_transaction_details')->insert([
        ['agent_transaction_id' => $ids[0], 'client_first_name' => 'A', 'client_last_name' => 'A', 'client_mobile' => '1', 'client_country' => 'PH', 'client_gender' => 'Female'],
        ['agent_transaction_id' => $ids[1], 'client_first_name' => 'B', 'client_last_name' => 'B', 'client_mobile' => '1', 'client_country' => 'United States of America', 'client_gender' => 'Male'],
        ['agent_transaction_id' => $ids[2], 'client_first_name' => 'C', 'client_last_name' => 'C', 'client_mobile' => '1', 'client_country' => 'Philippines', 'client_gender' => ''],
    ]);
    DB::table('project_property_types')->insert(['id' => 1, 'name' => 'Condominiums']);
    DB::table('agent_project_transactions')->update(['project_property_type_id' => 1]);

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11'])
        ->assertInertia(fn ($page) => $page
            // "PH" (new form) and "Philippines" (legacy) are one country; unset ones are "Not specified".
            ->where('summary.client_countries', fn ($rows) => collect($rows)->pluck('sales', 'name')->all() == ['Philippines' => 2, 'United States' => 1, 'Not specified' => 1])
            ->where('summary.client_genders', fn ($rows) => collect($rows)->pluck('sales', 'name')->all() == ['Male' => 1, 'Female' => 1, 'Not specified' => 2])
            ->where('summary.property_types', fn ($rows) => collect($rows)->pluck('sales', 'name')->all() == ['Condominiums' => 2, 'Not specified' => 2]));
});

test('top developers show each one\'s share of project sales, also inside a team', function () {
    DB::table('developers')->insert(['id' => 11, 'name' => 'Other Dev']);
    $t = AgentTransaction::create(['agent_id' => $this->ana, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 6_000_000, 'reservation_date' => '2026-07-01', 'developer_id' => 11, 'project_name' => 'X']);
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    ($this->report)($range)->assertInertia(fn ($page) => $page
        ->where('summary.developers.total', 20_000_000)
        ->where('summary.developers.rows.0', fn ($d) => $d['name'] === 'Cebu Landmasters' && (float) $d['value'] === 14_000_000.0 && (float) $d['share'] === 70.0)
        ->where('summary.developers.rows.1', fn ($d) => $d['name'] === 'Other Dev' && (float) $d['share'] === 30.0));

    // Inside Alpha (only Ana is a member): her 10M with Cebu Landmasters and 6M with Other Dev.
    ($this->report)($range + ['view' => 'agents', 'team_id' => $this->alpha])->assertInertia(fn ($page) => $page
        ->where('summary.developers.rows', fn ($rows) => collect($rows)->pluck('share', 'name')->map(fn ($v) => (float) $v)->all() == ['Cebu Landmasters' => 62.5, 'Other Dev' => 37.5]));

    // No project sales in a rental report, so no developers.
    ($this->report)($range + ['view' => 'rental'])->assertInertia(fn ($page) => $page->where('summary.developers.rows', []));
});

test('client age bands count only believable ages (18–99) and say how many were left out', function () {
    $ids = AgentTransaction::orderBy('id')->pluck('id');
    $detail = fn (int $id, ?int $age) => ['agent_transaction_id' => $id, 'client_first_name' => 'A', 'client_last_name' => 'A', 'client_mobile' => '1', 'client_country' => 'PH', 'client_age' => $age];
    DB::table('agent_transaction_details')->insert([$detail($ids[0], 30), $detail($ids[1], 5), $detail($ids[2], 120), $detail($ids[3], 67)]);

    ($this->report)(['from' => '2026-01-01', 'to' => '2026-10-11'])
        ->assertInertia(fn ($page) => $page
            ->where('summary.client_ages.counted', 2)
            // Ages 5 and 120 are typos; the 2026 sale outside these four has no detail row at all.
            ->where('summary.client_ages.excluded', 2)
            ->where('summary.client_ages.rows', fn ($rows) => collect($rows)->pluck('sales', 'name')->all() === ['18–24' => 0, '25–34' => 1, '35–44' => 0, '45–54' => 0, '55–64' => 0, '65+' => 1]));

    // Statistics (project sales): the same split, with countries and genders.
    $this->actingAs($this->superadmin)->get('/superadmin/statistics?period=all')
        ->assertInertia(fn ($page) => $page
            ->where('stats.clients.ages.counted', 1)
            ->where('stats.clients.ages.rows.1.sales', 1)
            ->where('stats.clients.countries', fn ($c) => collect($c)->pluck('sales', 'name')->get('Philippines') === 2)
            ->has('stats.clients.genders', 3));
});
