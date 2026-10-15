<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->viewReports = Permission::create(['name' => 'view_reports', 'label' => 'View Reports']);
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $um = Role::create(['name' => 'unit_manager', 'label' => 'Unit Manager']);
    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $person = function (string $name, Role $role) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($role);

        return DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email]);
    };
    $manager = $person('Mia Manager', $um);
    $agent = $person('Ana Agent', $agentRole);

    foreach ([[$manager, 5_000_000], [$agent, 9_000_000]] as [$id, $price]) {
        $t = AgentTransaction::create(['agent_id' => $id, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => now()->startOfYear()->addDays(5)->toDateString(), 'project_name' => 'Mivela']);
    }
});

test('reports open from cards, each with its own view', function () {
    $this->actingAs($this->superadmin)->get('/reports')->assertOk()->assertInertia(fn ($page) => $page->component('Portal/Reports/Index'));

    $this->actingAs($this->superadmin)->get('/reports/top-agents')
        ->assertInertia(fn ($page) => $page->component('Portal/Reports/Show')
            ->where('report', 'top-agents')
            ->where('filters.view', 'agents')
            ->where('breakdown.data.0.name', 'Ana Agent')
            ->where('summary.kpis.sales.value', 2));

    // Unit managers: only their sales, in the table and in the totals.
    $this->actingAs($this->superadmin)->get('/reports/top-unit-managers')
        ->assertInertia(fn ($page) => $page->where('filters.view', 'unit_managers')
            ->where('breakdown.total', 1)
            ->where('breakdown.data.0.name', 'Mia Manager')
            ->where('summary.kpis.value.value', 5_000_000));

    $this->actingAs($this->superadmin)->get('/reports/developer-sales')->assertInertia(fn ($page) => $page->where('filters.category', 'project'));
    $this->actingAs($this->superadmin)->get('/reports/no-such-report')->assertNotFound();
});

test('reports need view_reports', function () {
    $staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $staff = User::factory()->create();
    $staff->roles()->attach($staffRole);

    $this->actingAs($staff)->get('/reports')->assertForbidden();
    $this->actingAs($staff)->get('/reports/top-teams')->assertForbidden();

    grantReports($staffRole);
    $this->actingAs($staff->fresh())->get('/reports/top-teams')->assertOk();
});

test('each report is its own permission: unticking one hides its card and blocks its page', function () {
    $staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    grantReports($staffRole);
    $staffRole->permissions()->detach(Permission::whereIn('name', ['report_top_teams', 'report_recruits'])->pluck('id'));
    $staff = User::factory()->create();
    $staff->roles()->attach($staffRole);

    $this->actingAs($staff)->get('/reports')
        ->assertInertia(fn ($page) => $page->where('available', fn ($a) => ! collect($a)->contains('top-teams') && ! collect($a)->contains('recruits')
            && collect($a)->contains('top-agents') && collect($a)->contains('recruits-progress')));
    $this->actingAs($staff)->get('/reports/top-teams')->assertForbidden();
    $this->actingAs($staff)->get('/reports/recruits')->assertForbidden();
    $this->actingAs($staff)->get('/reports/top-agents')->assertOk();
});

test('the roles page groups permissions into sections, with every report under Reports', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/settings/roles')
        ->assertInertia(fn ($page) => $page
            ->where('permissions', fn ($ps) => collect($ps)->where('section', 'Reports')->pluck('name')
                ->contains(fn ($n) => $n === 'report_top_agents')
                && collect($ps)->where('section', 'Reports')->pluck('name')->contains('view_reports')
                && collect($ps)->firstWhere('name', 'record_sales')['section'] === 'Dashboard & sales'
                // Sections come in display order, so the page can group them as they arrive.
                && collect($ps)->pluck('section')->unique()->values()->all() === collect($ps)->pluck('section')->unique()->values()->sortBy(fn ($s) => array_search($s, [...array_keys(\App\Models\Permission::SECTIONS), \App\Models\Permission::OTHER_SECTION]))->values()->all()));
});
