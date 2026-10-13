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
            ->where('breakdown.data.0', fn ($r) => $r['id'] === 'cebu' && $r['name'] === 'Cebu' && (float) $r['value'] === 16_000_000.0 && $r['detail'] === '1 agent in this branch')
            ->where('breakdown.data.1.name', 'Metro Manila'));

    ($this->report)($range + ['view' => 'agents', 'area' => 'metro-manila'])
        ->assertInertia(fn ($page) => $page
            ->where('scope.name', 'Metro Manila')
            ->where('scope.facts.0', ['label' => 'Agents in this branch', 'value' => '1'])
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

test('agents without an area count in the totals but never show as an "Unassigned" area', function () {
    DB::table('agents')->where('id', $this->ana)->update(['area' => 'cebu']);
    DB::table('agents')->where('id', $this->ben)->update(['area' => null]);
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    ($this->report)($range)
        ->assertInertia(fn ($page) => $page
            ->where('summary.kpis.value.value', 20_300_000)
            ->where('summary.areas', fn ($areas) => collect($areas)->pluck('area')->all() === ['cebu']));

    ($this->report)($range + ['view' => 'areas'])
        ->assertInertia(fn ($page) => $page->where('breakdown.total', 1)->where('breakdown.data.0.name', 'Cebu'));

    // The old "unassigned" drill-down is gone: it's ignored, not a scope.
    ($this->report)($range + ['view' => 'agents', 'area' => 'unassigned'])
        ->assertInertia(fn ($page) => $page->where('scope', null)->where('breakdown.total', 2));
});

test('Top Team Leaders ranks team leaders by their own sales, like Top Unit Managers', function () {
    $role = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'))->roles()->attach($role);

    $this->actingAs($this->superadmin)->get('/reports/top-team-leaders?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('filters.view', 'team_leaders')
            // Only Ana leads; Ben's sales don't count here.
            ->where('breakdown.data', fn ($rows) => collect($rows)->pluck('name')->all() === ['Ana Reyes'])
            ->where('summary.kpis.value.value', 16_000_000));
});

test('Developers by Area: pick an area to rank its developers, then open one to see who sold it there', function () {
    DB::table('developers')->insert(['id' => 11, 'name' => 'Ayala Land']);
    DB::table('agents')->where('id', $this->ana)->update(['area' => 'cebu']);
    DB::table('agents')->where('id', $this->ben)->update(['area' => 'davao']);
    $t = AgentTransaction::create(['agent_id' => $this->ben, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 7_000_000, 'reservation_date' => '2026-06-01', 'developer_id' => 11, 'project_name' => 'Avida']);
    $range = 'from=2026-01-01&to=2026-10-11';

    $this->actingAs($this->superadmin)->get("/reports/area-developers?{$range}")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'developers')->where('areaOptions.cebu', 'Cebu')
            ->where('breakdown.data', fn ($rows) => collect($rows)->pluck('name')->sort()->values()->all() === ['Ayala Land', 'Cebu Landmasters']));

    // Davao: only Ben's sales — Cebu Landmasters (4M) and Ayala Land (7M).
    $this->actingAs($this->superadmin)->get("/reports/area-developers?{$range}&area=davao")
        ->assertInertia(fn ($page) => $page->where('breakdown.data', fn ($rows) => collect($rows)->pluck('value', 'name')->map(fn ($v) => (float) $v)->all() == ['Ayala Land' => 7_000_000.0, 'Cebu Landmasters' => 4_000_000.0]));

    // Opening Cebu Landmasters from Cebu: the agents who sold it in Cebu, named in the header with the area.
    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&area=cebu&developer_id=10")
        ->assertInertia(fn ($page) => $page->where('scope.type', 'developer')
            ->where('scope.facts', fn ($facts) => collect($facts)->pluck('value', 'label')->get('Branch') === 'Cebu')
            ->where('breakdown.data', fn ($rows) => collect($rows)->pluck('name')->all() === ['Ana Reyes'])
            ->where('summary.kpis.value.value', 10_000_000));
});

test('a locked reader may still open a developer within their reach, and both new reports are permissions', function () {
    $staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    grantReports($staffRole);
    $staffRole->permissions()->detach(Permission::whereIn('name', ['report_top_team_leaders', 'report_area_developers'])->pluck('id'));
    $staff = User::factory()->create();
    $staff->roles()->attach($staffRole);

    $this->actingAs($staff)->get('/reports')->assertInertia(fn ($page) => $page->where('available', fn ($a) => ! collect($a)->contains('top-team-leaders') && ! collect($a)->contains('area-developers')));
    $this->actingAs($staff)->get('/reports/area-developers')->assertForbidden();

    // A team leader (locked to Alpha) opening a developer: Alpha's sales of that developer only.
    $tl = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    grantReports($tl);
    $leader = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $leader->roles()->attach($tl);
    $this->actingAs($leader)->get('/reports/top-agents?from=2026-01-01&to=2026-10-11&developer_id=10')
        ->assertInertia(fn ($page) => $page->where('scopeLocked', true)->where('filters.team_id', $this->alpha)->where('filters.developer_id', 10));
});

test('inside a developer, the Sales tab lists its sales one by one for the same filters (read-only)', function () {
    DB::table('agent_transaction_details')->insert(['agent_transaction_id' => AgentTransaction::where('agent_id', $this->ana)->where('sale_type', 'project')->orderBy('id')->value('id'), 'client_first_name' => 'Juan Dela Cruz', 'client_mobile' => '1', 'client_country' => 'PH']);
    $base = '/reports/top-agents?from=2026-01-01&to=2026-10-11&developer_id=10';

    // Top agents by default: no list sent.
    $this->actingAs($this->superadmin)->get($base)->assertInertia(fn ($page) => $page->where('saleList', null)->where('scope.type', 'developer'));

    // Valid project sales of Cebu Landmasters in range: Ana's 10M (Mar 10) and Ben's 4M (Apr 2) — newest first.
    $this->actingAs($this->superadmin)->get("{$base}&list=sales")
        ->assertInertia(fn ($page) => $page->where('filters.list', 'sales')
            ->where('saleList.total', 2)
            ->where('saleList.data.0', fn ($r) => $r['agent_name'] === 'Ben Cruz' && $r['project_name'] === 'Mivela' && $r['reservation_date'] === '2026-04-02' && $r['sale_status'] === 'valid' && $r['created_at'] !== null)
            ->where('saleList.data.1', fn ($r) => $r['agent_name'] === 'Ana Reyes' && $r['client_first_name'] === 'Juan Dela Cruz' && (float) $r['value'] === 10_000_000.0));

    // The date range and status follow: all statuses adds Ana's pending 99M (May 21); April only keeps Ben's.
    $this->actingAs($this->superadmin)->get("{$base}&list=sales&status=all")->assertInertia(fn ($page) => $page->where('saleList.total', 3));
    $this->actingAs($this->superadmin)->get('/reports/top-agents?from=2026-04-01&to=2026-04-30&developer_id=10&list=sales')
        ->assertInertia(fn ($page) => $page->where('saleList.total', 1)->where('saleList.data.0.agent_name', 'Ben Cruz'));

    // Without a developer there's no list (it's only offered inside one).
    $this->actingAs($this->superadmin)->get('/reports/top-agents?from=2026-01-01&to=2026-10-11&list=sales')->assertInertia(fn ($page) => $page->where('saleList', null));
});

test('the Sales tab searches by agent, client, project or unit', function () {
    $ana = AgentTransaction::where('agent_id', $this->ana)->where('sale_type', 'project')->orderBy('id')->value('id');
    DB::table('agent_transaction_details')->insert(['agent_transaction_id' => $ana, 'client_first_name' => 'Maria Santos', 'client_mobile' => '1', 'client_country' => 'PH']);
    DB::table('agent_transactions')->where('id', $ana)->update(['unit_number' => 'T7-1203']);
    $count = fn (string $q) => $this->actingAs($this->superadmin)
        ->get('/reports/top-agents?from=2026-01-01&to=2026-10-11&developer_id=10&list=sales&q='.urlencode($q))->viewData('page')['props']['saleList']['total'];

    expect($count('ben'))->toBe(1)        // agent
        ->and($count('santos'))->toBe(1)  // client
        ->and($count('t7-12'))->toBe(1)   // unit
        ->and($count('mivela'))->toBe(2)  // project
        ->and($count('nobody'))->toBe(0);
});

test('a sale in the Sales tab opens read-only with its details and proof of transaction, only if it\'s in the report', function () {
    $anaSale = AgentTransaction::where('agent_id', $this->ana)->where('sale_type', 'project')->orderBy('id')->first();
    DB::table('agent_project_transactions')->where('agent_transaction_id', $anaSale->id)->update(['proof_of_transaction' => 'https://files.test/pot.jpg']);
    DB::table('agent_transaction_details')->insert(['agent_transaction_id' => $anaSale->id, 'client_first_name' => 'Juan Dela Cruz', 'client_mobile' => '0917', 'client_country' => 'PH']);
    $base = '/reports/top-agents?from=2026-01-01&to=2026-10-11&developer_id=10&list=sales';

    $this->actingAs($this->superadmin)->get("{$base}&sale={$anaSale->id}")
        ->assertInertia(fn ($page) => $page
            ->where('saleDetail.id', $anaSale->id)
            ->where('saleDetail.property.proof_of_transaction', 'https://files.test/pot.jpg')
            ->where('saleDetail.client.client_first_name', 'Juan Dela Cruz')
            ->where('saleDetail.agent.name', 'Ana Reyes')
            ->where('saleDetail.names.developer', 'Cebu Landmasters'));

    // Outside the report's dates (the Dec 2025 sale) — not opened.
    $old = AgentTransaction::where('agent_id', $this->ana)->whereHas('projectTransaction', fn ($q) => $q->where('reservation_date', '2025-12-31'))->value('id');
    $this->actingAs($this->superadmin)->get("{$base}&sale={$old}")->assertInertia(fn ($page) => $page->where('saleDetail', null));

    // A team leader locked to Alpha can't open Ben's sale (he's on Bravo, not Alpha)...
    $bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $this->ben, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $bravo, 'agent_id' => $this->ben, 'joined_at' => '2026-01-01', 'status' => 'active']);
    $tl = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    grantReports($tl);
    $leader = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $leader->roles()->attach($tl);
    $benSale = AgentTransaction::where('agent_id', $this->ben)->where('sale_type', 'project')->value('id');
    $this->actingAs($leader)->get("{$base}&sale={$benSale}")->assertInertia(fn ($page) => $page->where('saleDetail', null));
    // ...but can open their own team's.
    $this->actingAs($leader)->get("{$base}&sale={$anaSale->id}")->assertInertia(fn ($page) => $page->where('saleDetail.id', $anaSale->id));
});

test('My Sales lists the signed-in agent\'s own sales one by one, with statistics, and opens only their own', function () {
    $ana = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $range = 'from=2026-01-01&to=2026-10-11&status=all';

    // Ana: two project sales in range (10M Mar 10, pending 99M May 21) and a brokerage sale (6M May 20); Ben's aren't hers.
    $this->actingAs($ana)->get("/dashboard/my-sales?{$range}&agent_id={$this->ben}")
        ->assertInertia(fn ($page) => $page->component('Portal/Dashboard/MySales/Index')
            ->where('filters.agent_id', $this->ana)
            ->where('saleList.total', 3)
            ->where('saleList.data', fn ($rows) => collect($rows)->pluck('category')->all() === ['project', 'brokerage', 'project'])
            ->where('saleList.data.1.brokerage_area', 'Cebu Brokerage')
            ->where('summary.kpis.value.value', 115_000_000));

    $benSale = AgentTransaction::where('agent_id', $this->ben)->value('id');
    $anaSale = AgentTransaction::where('agent_id', $this->ana)->where('sale_type', 'brokerage')->value('id');
    $this->actingAs($ana)->get("/dashboard/my-sales?{$range}&sale={$benSale}")->assertInertia(fn ($page) => $page->where('saleDetail', null));
    $this->actingAs($ana)->get("/dashboard/my-sales?{$range}&sale={$anaSale}")->assertInertia(fn ($page) => $page->where('saleDetail.category', 'brokerage'));

    // No agent record: nothing to show.
    $this->actingAs($this->superadmin)->get('/dashboard/my-sales')->assertForbidden();
});

test('an agent\'s sales page lists their sales with statistics, for whoever may open their profile', function () {
    $range = 'from=2026-01-01&to=2026-10-11&status=all';

    // Back office with reports: Ana's three sales, locked to her whatever the URL says.
    $this->actingAs($this->superadmin)->get("/agents/{$this->ana}/sales?{$range}&agent_id={$this->ben}")
        ->assertInertia(fn ($page) => $page->component('Portal/Agents/Sales')
            ->where('agent.name', 'Ana Reyes')
            ->where('filters.agent_id', $this->ana)
            ->where('saleList.total', 3)
            ->where('summary.kpis.value.value', 115_000_000));

    // Picking a category narrows the list, but the totals keep every category.
    $this->actingAs($this->superadmin)->get("/agents/{$this->ana}/sales?{$range}&category=brokerage")
        ->assertInertia(fn ($page) => $page
            ->where('saleList.total', 1)
            ->where('totals', fn ($totals) => collect($totals)->mapWithKeys(fn ($t) => [$t['category'] => [$t['sales'], $t['value']]])->all()
                == ['project' => [2, 109_000_000], 'rental' => [0, 0], 'brokerage' => [1, 6_000_000]]));

    // Staff without view_reports see profiles but not sales.
    $staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $staff = User::factory()->create();
    $staff->roles()->attach($staffRole);
    $this->actingAs($staff)->get("/agents/{$this->ana}/sales")->assertForbidden();

    // Ana leads Alpha, Ben isn't on it: she can't open his; her own is fine.
    $ana = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $this->actingAs($ana)->get("/agents/{$this->ben}/sales")->assertForbidden();
    $this->actingAs($ana)->get("/agents/{$this->ana}/sales")->assertOk();
});

test('inside a developer the back office can rank its teams and sub-teams; a team leader can\'t', function () {
    $range = 'from=2026-01-01&to=2026-10-11';
    $sub = DB::table('sub_teams')->insertGetId(['name' => 'Alpha One', 'team_id' => $this->alpha, 'agent_id' => $this->ana, 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $sub, 'agent_id' => $this->ana, 'joined_at' => '2020-01-01', 'status' => 'active']);

    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&developer_id=10&list=teams")
        ->assertInertia(fn ($page) => $page->where('groupTabs', true)->where('filters.view', 'teams')->where('filters.list', 'teams')
            ->where('breakdown.total', 1)
            // Ana's 10M project sale for developer 10 (her brokerage sale isn't this developer's).
            ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 10_000_000.0));
    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&developer_id=10&list=sub_teams")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'sub_teams')->where('breakdown.data.0.name', 'Alpha One'));
    // A team clicked inside the developer: that team's agents for it.
    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&developer_id=10&team_id={$this->alpha}")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'agents')->where('breakdown.total', 1)->where('breakdown.data.0.name', 'Ana Reyes'));

    // A team leader (locked to their team) gets the plain Top agents.
    $leaderRole = Role::create(['name' => 'team_leader', 'label' => 'Team Leader']);
    grantReports($leaderRole);
    $ana = User::find(DB::table('agents')->where('id', $this->ana)->value('user_id'));
    $ana->roles()->attach($leaderRole);
    $this->actingAs($ana)->get("/reports/top-agents?{$range}&developer_id=10&list=teams")
        ->assertInertia(fn ($page) => $page->where('groupTabs', false)->where('filters.view', 'agents')->where('filters.list', null));
});

test('inside a branch the back office can rank its teams and sub-teams too', function () {
    $range = 'from=2026-01-01&to=2026-10-11';
    DB::table('agents')->where('id', $this->ana)->update(['area' => 'cebu']);
    DB::table('agents')->where('id', $this->ben)->update(['area' => 'davao']);

    // Cebu: Ana's 10M project + 6M brokerage, on Alpha. Ben (Davao) isn't counted.
    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&area=cebu&list=teams")
        ->assertInertia(fn ($page) => $page->where('groupTabs', true)->where('filters.view', 'teams')->where('scope.type', 'area')
            ->where('breakdown.total', 1)
            ->where('breakdown.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 16_000_000.0));
    // A team clicked inside the branch: its agents in that branch.
    $this->actingAs($this->superadmin)->get("/reports/top-agents?{$range}&area=cebu&team_id={$this->alpha}")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'agents')->where('filters.area', 'cebu')->where('breakdown.data.0.name', 'Ana Reyes'));
});
