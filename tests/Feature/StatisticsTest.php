<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-15 09:00:00');

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $this->condo = DB::table('project_property_types')->insertGetId(['name' => 'Condominiums']);
    $this->house = DB::table('project_property_types')->insertGetId(['name' => 'House & Lot']);

    $this->sale = function (string $developer, int $typeId, float $price, string $date, string $commission = 'Unclaimed') {
        $developerId = DB::table('developers')->where('name', $developer)->value('id')
            ?? DB::table('developers')->insertGetId(['name' => $developer]);
        $sale = AgentTransaction::create(['sale_type' => 'project', 'commission_status' => $commission, 'recorded_by' => $this->superadmin->id]);
        $sale->projectTransaction()->create([
            'developer_id' => $developerId,
            'project_name' => 'Project',
            'project_property_type_id' => $typeId,
            'total_contract_price' => $price,
            'reservation_date' => $date,
        ]);
    };
});

afterEach(fn () => Carbon::setTestNow());

test('the statistics page summarises project sales for the last 12 months by default', function () {
    ($this->sale)('Cebu Landmasters', $this->condo, 20_000_000, '2026-10-01');
    ($this->sale)('Cebu Landmasters', $this->house, 23_000_000, '2026-10-07', 'Fully Claimed');
    ($this->sale)('Ayala Land', $this->condo, 5_000_000, '2026-03-12');
    ($this->sale)('Ayala Land', $this->condo, 9_000_000, '2025-08-20'); // previous 12-month window

    $this->actingAs($this->superadmin)
        ->get('/superadmin/statistics')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Statistics')
            ->where('stats.period', '12m')
            ->where('stats.range.start', '2025-11-01')
            ->where('stats.kpis.sales', ['value' => 3, 'previous' => 1])
            ->where('stats.kpis.contract_value.value', 48_000_000)
            ->where('stats.kpis.contract_value.previous', 9_000_000)
            ->where('stats.kpis.average_deal.value', 16_000_000)
            ->has('stats.monthly', 12)
            ->where('stats.monthly.11', ['month' => '2026-10', 'sales' => 2, 'value' => 43_000_000])
            ->where('stats.monthly.0', ['month' => '2025-11', 'sales' => 0, 'value' => 0])
            ->where('stats.developers.0', ['name' => 'Cebu Landmasters', 'sales' => 2, 'value' => 43_000_000])
            ->where('stats.propertyTypes.0', ['name' => 'Condominiums', 'sales' => 2, 'value' => 25_000_000])
            // Commission status isn't a statistic.
            ->missing('stats.commission')
            ->where('stats.kpis.active_users', ['value' => 1, 'total' => 1])
            ->where('stats.team.byStatus', fn ($s) => collect($s)->pluck('status')->all() === ['active', 'inactive']));
});

test('this year and all time narrow or widen the window', function () {
    ($this->sale)('Cebu Landmasters', $this->condo, 10_000_000, '2026-02-01');
    ($this->sale)('Cebu Landmasters', $this->condo, 4_000_000, '2024-06-01');

    $this->actingAs($this->superadmin)->get('/superadmin/statistics?period=year')
        ->assertInertia(fn ($page) => $page->where('stats.range.start', '2026-01-01')->where('stats.kpis.sales.value', 1)->has('stats.monthly', 10));

    $this->actingAs($this->superadmin)->get('/superadmin/statistics?period=all')
        ->assertInertia(fn ($page) => $page
            ->where('stats.range.start', null)
            ->where('stats.kpis.sales', ['value' => 2, 'previous' => null])
            ->where('stats.monthly.0.month', '2024-06'));

    $this->actingAs($this->superadmin)->get('/superadmin/statistics?period=bogus')
        ->assertInertia(fn ($page) => $page->where('stats.period', '12m'));
});

test('developers beyond the top five are folded into Other', function () {
    foreach (range(1, 7) as $i) {
        ($this->sale)("Developer {$i}", $this->condo, $i * 1_000_000, '2026-09-01');
    }

    $this->actingAs($this->superadmin)->get('/superadmin/statistics')
        ->assertInertia(fn ($page) => $page
            ->has('stats.developers', 6)
            ->where('stats.developers.0.name', 'Developer 7')
            ->where('stats.developers.5', ['name' => 'Other (2)', 'sales' => 2, 'value' => 3_000_000]));
});

test('an empty period returns zeros rather than failing', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/statistics')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.kpis.sales', ['value' => 0, 'previous' => 0])
            ->where('stats.kpis.average_deal.value', 0)
            ->where('stats.developers', []));
});

test('admins cannot open the superadmin statistics page', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));

    $this->actingAs($admin)->get('/superadmin/statistics')->assertForbidden();
});
