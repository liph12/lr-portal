<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use App\Services\SalesReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->admin = User::factory()->create();
    $this->admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));

    $this->agent = function (string $name, string $signedUp = '2020-01-01') {
        $user = User::factory()->create(['name' => $name]);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'created_at' => "{$signedUp} 00:00:00"]);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'registration_status' => 4]);

        return $id;
    };
    $this->ana = ($this->agent)('Ana Reyes');
    $this->ben = ($this->agent)('Ben Cruz', '2026-04-01');
    DB::table('agent_attributes')->where('agent_id', $this->ben)->update(['nao_video_tracker' => 50, 'fire_certificates' => 1]);

    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    $t = AgentTransaction::create(['agent_id' => $this->ana, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 5_000_000, 'reservation_date' => '2026-05-01', 'developer_id' => 10, 'project_name' => 'Mivela']);
});

afterEach(fn () => Carbon::setTestNow());

test('a superadmin opens the sales builder with every view available, unrestricted', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/report-builder/sales?from=2026-01-01&to=2026-10-11&view=agents')
        ->assertInertia(fn ($page) => $page->component('Portal/SuperAdmin/ReportBuilder/Sales')
            ->where('options.views', SalesReportService::VIEWS)
            ->where('breakdown.data.0.name', 'Ana Reyes'));
});

test('inside a developer, picking Projects / Top teams / Top sub-teams actually regroups the table, not just the card', function () {
    $team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->ana, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->ana, 'joined_at' => '2020-01-01', 'status' => 'active']);
    $sub = DB::table('sub_teams')->insertGetId(['name' => 'Alpha One', 'team_id' => $team, 'agent_id' => $this->ana, 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $sub, 'agent_id' => $this->ana, 'joined_at' => '2020-01-01', 'status' => 'active']);
    $range = 'from=2026-01-01&to=2026-10-11&developer_id=10';

    $this->actingAs($this->superadmin)->get("/superadmin/report-builder/sales?{$range}&list=projects")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'projects')->where('groupTabs', true)
            ->where('breakdown.data.0.name', 'Mivela'));

    $this->actingAs($this->superadmin)->get("/superadmin/report-builder/sales?{$range}&list=teams")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'teams')->where('breakdown.data.0.name', 'Alpha'));

    $this->actingAs($this->superadmin)->get("/superadmin/report-builder/sales?{$range}&list=sub_teams")
        ->assertInertia(fn ($page) => $page->where('filters.view', 'sub_teams')->where('breakdown.data.0.name', 'Alpha One'));

    // Without a developer, these lists are ignored (not reach-restricted, so plain Top agents instead).
    $this->actingAs($this->superadmin)->get('/superadmin/report-builder/sales?from=2026-01-01&to=2026-10-11&list=projects')
        ->assertInertia(fn ($page) => $page->where('filters.view', 'agents')->where('filters.list', null));
});

test('an admin cannot reach the report builder', function () {
    $this->actingAs($this->admin)->get('/superadmin/report-builder/sales')->assertStatus(403);
    $this->actingAs($this->admin)->get('/superadmin/report-builder/recruits')->assertStatus(403);
    $this->actingAs($this->admin)->post('/superadmin/report-builder/ai', ['prompt' => 'condo sales'])->assertStatus(403);
});

test('exporting sales streams a CSV of every matching row', function () {
    $response = $this->actingAs($this->superadmin)->get('/superadmin/report-builder/sales/export?from=2026-01-01&to=2026-10-11&view=agents');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');
    $csv = $response->streamedContent();
    expect($csv)->toContain('ID,Name,Detail,Branch,Team,"Total units",Value')->and($csv)->toContain('Ana Reyes');
});

test('a superadmin opens the recruits builder, grouped by team by default, with the recruit-by-recruit listing left out', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/report-builder/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->component('Portal/SuperAdmin/ReportBuilder/Recruits')
            ->where('filters.group', 'teams')
            ->where('options.groups', fn ($groups) => ! $groups->contains('recruits')));
});

test('exporting recruits streams a CSV of every matching group', function () {
    $response = $this->actingAs($this->superadmin)->get('/superadmin/report-builder/recruits/export?from=2026-01-01&to=2026-10-11&group=areas');

    $response->assertOk();
    expect($response->streamedContent())->toContain('ID,Name,Detail,Team,Recruits,Sold');
});
