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
    // The page opens on this month; the fixtures are reserved on 2026-09-01.
    Carbon::setTestNow('2026-09-20 09:00:00');
    $this->superadmin = User::factory()->create(['name' => 'Sam Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);

    $agent = function (string $name, ?string $area) {
        $user = User::factory()->create(['name' => $name]);

        return DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'area' => $area]);
    };
    $this->cebu = $agent('Ana Cebu', 'cebu');
    $this->davao = $agent('Ben Davao', 'davao');

    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    DB::table('brokerage_areas')->insert(['id' => 14, 'name' => 'Cebu Brokerage', 'status' => 'active']);

    $this->sale = function (string $type, int $agentId, string $status = 'pending', array $extra = []) {
        $t = AgentTransaction::create(['agent_id' => $agentId, 'sale_type' => $type, 'commission_status' => 'Unclaimed', 'sale_status' => $status, 'unit_number' => '12B']);
        // Overrides first: + keeps the left-hand keys.
        $row = $extra + ['agent_transaction_id' => $t->id, 'total_contract_price' => 1_000_000, 'reservation_date' => '2026-09-01'];
        match ($type) {
            'project' => DB::table('agent_project_transactions')->insert($row + ['developer_id' => 10, 'project_name' => 'Mivela', 'proof_of_transaction' => 'https://files.test/pot.pdf']),
            'rental' => DB::table('agent_rental_transactions')->insert($row + ['commission_received' => 0, 'remittance_slip' => 'https://files.test/remit.pdf']),
            'brokerage' => DB::table('agent_brokerage_transactions')->insert($row + ['commission_received' => 0, 'brokerage_area_id' => 14, 'remittance_slip' => 'https://files.test/r.pdf', 'deposit_slip' => 'https://files.test/d.pdf']),
        };
        DB::table('agent_transaction_details')->insert(['agent_transaction_id' => $t->id, 'client_first_name' => 'Juan', 'client_last_name' => 'Cruz', 'client_mobile' => '0917', 'client_country' => 'PH']);

        return $t;
    };

    $this->pending = ($this->sale)('project', $this->cebu);
    ($this->sale)('project', $this->cebu, 'valid');
    ($this->sale)('project', $this->cebu, 'invalid');
    ($this->sale)('brokerage', $this->cebu);
    ($this->sale)('rental', $this->cebu, 'cancelled');
    ($this->sale)('project', $this->davao);
});

afterEach(fn () => Carbon::setTestNow());

test('the range defaults to this month by reservation date and narrows every step', function () {
    $august = ($this->sale)('project', $this->cebu, 'pending', ['reservation_date' => '2026-08-15']);

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation')
        ->assertInertia(fn ($page) => $page->where('filters.from', '2026-09-01')->where('filters.to', '2026-09-20')->where('areas.0.pending', 3));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&from=2026-08-01&to=2026-08-31')
        ->assertInertia(fn ($page) => $page->where('counts.project', ['pending' => 1, 'valid' => 0, 'invalid' => 0, 'cancelled' => 0]));
    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=project&from=2026-08-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->where('sales.total', 2)->where('sales.data', fn ($rows) => collect($rows)->pluck('id')->contains($august->id)));
});

test('step 1 lists areas with their pending sales', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation')
        ->assertInertia(fn ($page) => $page->component('Portal/SalesValidation/Index')
            ->where('areas.0', ['key' => 'all', 'name' => 'All areas', 'pending' => 3])
            ->where('areas', fn ($a) => collect($a)->firstWhere('key', 'cebu')['pending'] === 2 && collect($a)->firstWhere('key', 'davao')['pending'] === 1)
            ->where('counts', null)
            ->where('sales', null)
            // Abroad and "no area" aren't offered (their sales still count under All areas).
            ->where('areas', fn ($a) => ! collect($a)->pluck('key')->intersect(['abroad', 'unassigned'])->count()));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=abroad')
        ->assertInertia(fn ($page) => $page->where('filters.area', null)->where('counts', null));
});

test('step 2 counts each category by status in the area; step 3 lists the sales with client, property and files', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu')
        ->assertInertia(fn ($page) => $page
            ->where('areaName', 'Cebu')
            ->where('counts.project', ['pending' => 1, 'valid' => 1, 'invalid' => 1, 'cancelled' => 0])
            ->where('counts.brokerage.pending', 1)
            ->where('counts.rental.cancelled', 1)
            ->where('sales', null));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=project')
        ->assertInertia(fn ($page) => $page
            ->where('sales.total', 1)
            ->where('sales.data.0', fn ($r) => $r['id'] === $this->pending->id && $r['client_first_name'] === 'Juan' && $r['project_name'] === 'Mivela'
                && $r['developer'] === 'Cebu Landmasters' && $r['proof_of_transaction'] === 'https://files.test/pot.pdf' && $r['agent_name'] === 'Ana Cebu'
                && $r['reservation_date'] === '2026-09-01' && $r['created_at'] !== null));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=brokerage')
        ->assertInertia(fn ($page) => $page->where('sales.data.0', fn ($r) => $r['brokerage_area'] === 'Cebu Brokerage' && $r['remittance_slip'] === 'https://files.test/r.pdf' && $r['deposit_slip'] === 'https://files.test/d.pdf'));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=rental&status=cancelled')
        ->assertInertia(fn ($page) => $page->where('sales.total', 1)->where('sales.data.0.remittance_slip', 'https://files.test/remit.pdf')->where('sales.data.0.deposit_slip', null));
});

test('validating a sale records who did it, logs it and moves it between the counts', function () {
    $this->actingAs($this->superadmin)->patch("/superadmin/sales-validation/{$this->pending->id}", ['status' => 'approved'])->assertSessionHasErrors('status');
    $this->actingAs($this->superadmin)->patch("/superadmin/sales-validation/{$this->pending->id}", ['status' => 'valid'])->assertSessionHasNoErrors();

    $sale = $this->pending->fresh();
    expect($sale->sale_status)->toBe('valid')
        ->and($sale->validated_by)->toBe($this->superadmin->id)
        ->and($sale->validated_at)->not->toBeNull()
        ->and(collect($sale->update_logs)->last()['description'])->toBe('Sale status: pending → valid')
        ->and(DB::table('activity_logs')->where('action', 'sale.validate')->exists())->toBeTrue();

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=project&status=valid')
        ->assertInertia(fn ($page) => $page->where('counts.project.pending', 0)->where('counts.project.valid', 2)->where('sales.data', fn ($rows) => collect($rows)->contains(fn ($r) => $r['id'] === $this->pending->id && $r['validated_by'] === 'Sam Admin')));
});

test('only roles with sales_validation get in (staff has it after the migration)', function () {
    $staff = User::factory()->create();
    $staff->roles()->attach($this->staffRole);
    $this->actingAs($staff)->get('/staff/sales-validation')->assertForbidden();
    $this->actingAs($staff)->patch("/staff/sales-validation/{$this->pending->id}", ['status' => 'valid'])->assertForbidden();

    $this->staffRole->permissions()->attach(Permission::where('name', 'sales_validation')->value('id'));
    $this->actingAs($staff->fresh())->get('/staff/sales-validation?area=all&category=project')
        ->assertInertia(fn ($page) => $page->where('sales.total', 2));
});

test('clicking an agent shows their sales client first, split into project, brokerage and rental', function () {
    ($this->sale)('project', $this->cebu, 'valid', ['reservation_date' => '2025-05-01']);

    $this->actingAs($this->superadmin)->get("/superadmin/sales-validation?area=cebu&category=project&agent={$this->cebu}")
        ->assertInertia(fn ($page) => $page
            ->where('agentSales.agent.name', 'Ana Cebu')
            ->where('agentSales.all_dates', false)
            // This month only: 3 project sales (pending, valid, invalid), 1 brokerage, 1 rental.
            ->where('agentSales.categories.project.total', 3)
            ->where('agentSales.categories.project.counts', ['pending' => 1, 'valid' => 1, 'invalid' => 1, 'cancelled' => 0])
            ->where('agentSales.categories.brokerage.rows.0', fn ($r) => $r['client_first_name'] === 'Juan' && $r['brokerage_area'] === 'Cebu Brokerage' && $r['deposit_slip'] === 'https://files.test/d.pdf')
            ->where('agentSales.categories.rental.total', 1)
            ->where('agentSales.categories.rental.rows.0.sale_status', 'cancelled'));

    $this->actingAs($this->superadmin)->get("/superadmin/sales-validation?area=cebu&category=project&agent={$this->cebu}&agent_dates=all")
        ->assertInertia(fn ($page) => $page->where('agentSales.all_dates', true)->where('agentSales.categories.project.total', 4)
            ->where('agentSales.categories.project.rows.3.reservation_date', '2025-05-01'));

    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=project')
        ->assertInertia(fn ($page) => $page->where('agentSales', null)->where('sales.data.0.agent_id', $this->cebu));
});

test('editing a project sale corrects client, price, date, developer and project, then the status', function () {
    DB::table('developers')->insert(['id' => 11, 'name' => 'Ayala Land']);
    DB::table('developer_projects')->insert(['id' => 300, 'developer_id' => 11, 'name' => 'Avida Towers', 'status' => 'active']);
    $url = "/superadmin/sales-validation/{$this->pending->id}";
    $payload = [
        'status' => 'valid', 'client_first_name' => 'Juana', 'client_last_name' => 'Cruz', 'client_mobile' => '0918', 'client_email' => null,
        'unit_number' => '7A', 'total_contract_price' => 2500000, 'reservation_date' => '2026-09-05', 'developer_id' => 11, 'project_name' => 'Avida Towers',
    ];

    $this->actingAs($this->superadmin)->put($url, ['developer_id' => 999, 'total_contract_price' => 0] + $payload)
        ->assertSessionHasErrors(['developer_id', 'total_contract_price']);
    $this->actingAs($this->superadmin)->put($url, $payload)->assertRedirect()->assertSessionHasNoErrors();

    $project = DB::table('agent_project_transactions')->where('agent_transaction_id', $this->pending->id)->first();
    $sale = $this->pending->fresh();
    expect((float) $project->total_contract_price)->toBe(2500000.0)
        ->and($project->reservation_date)->toStartWith('2026-09-05')
        ->and($project->developer_id)->toBe(11)
        ->and($project->developer_project_id)->toBe(300)      // matched the catalogue
        ->and($sale->unit_number)->toBe('7A')
        ->and($sale->sale_status)->toBe('valid')
        ->and($sale->validated_by)->toBe($this->superadmin->id)
        ->and(DB::table('agent_transaction_details')->where('agent_transaction_id', $sale->id)->value('client_first_name'))->toBe('Juana');

    $logs = collect($sale->update_logs);
    expect($logs[count($logs) - 2]['description'])->toContain('Client first name: Juan → Juana')
        ->toContain('Total contract price: 1,000,000.00 → 2,500,000.00')
        ->toContain('Developer: Cebu Landmasters → Ayala Land')
        ->toContain('Project: Mivela → Avida Towers')
        ->and($logs->last()['description'])->toBe('Sale status: pending → valid')
        ->and(DB::table('activity_logs')->where('action', 'sale.edit')->exists())->toBeTrue();

    // A project typed in (not in the catalogue) unlinks it.
    $this->actingAs($this->superadmin)->put($url, ['project_name' => 'Brand New Tower'] + $payload)->assertSessionHasNoErrors();
    expect(DB::table('agent_project_transactions')->where('agent_transaction_id', $sale->id)->value('developer_project_id'))->toBeNull();
});

test('brokerage and rental sales edit their own fields; editing needs sales_validation', function () {
    DB::table('brokerage_areas')->insert(['id' => 15, 'name' => 'Davao Brokerage', 'status' => 'active']);
    $brokerage = AgentTransaction::where('sale_type', 'brokerage')->first();
    $rental = AgentTransaction::where('sale_type', 'rental')->first();
    $base = ['status' => 'pending', 'client_first_name' => 'Juan', 'client_last_name' => 'Cruz', 'total_contract_price' => 1000000, 'reservation_date' => '2026-09-01'];

    $this->actingAs($this->superadmin)->put("/superadmin/sales-validation/{$brokerage->id}", $base)->assertSessionHasErrors('brokerage_area_id');
    $this->actingAs($this->superadmin)->put("/superadmin/sales-validation/{$brokerage->id}", ['brokerage_area_id' => 15] + $base)->assertRedirect()->assertSessionHasNoErrors();
    expect(DB::table('agent_brokerage_transactions')->where('agent_transaction_id', $brokerage->id)->value('brokerage_area_id'))->toBe(15);

    $this->actingAs($this->superadmin)->put("/superadmin/sales-validation/{$rental->id}", ['closing_agent' => 'Carla Closer', 'partner_agent' => 'Pia Partner', 'status' => 'cancelled'] + $base)->assertSessionHasNoErrors();
    expect(DB::table('agent_rental_transactions')->where('agent_transaction_id', $rental->id)->value('closing_agent'))->toBe('Carla Closer');

    $staff = User::factory()->create();
    $staff->roles()->attach($this->staffRole);
    $this->actingAs($staff)->put("/staff/sales-validation/{$rental->id}", $base)->assertForbidden();

    // The edit dialog's pickers arrive with the table step.
    $this->actingAs($this->superadmin)->get('/superadmin/sales-validation?area=cebu&category=project')
        ->assertInertia(fn ($page) => $page->where('editOptions.developers', fn ($d) => collect($d)->pluck('label')->contains('Cebu Landmasters'))
            ->where('editOptions.brokerage_areas', fn ($a) => collect($a)->pluck('label')->contains('Davao Brokerage'))
            ->where('sales.data.0.developer_id', 10));
});

test('clicking a sale loads every detail, and every detail can be corrected', function () {
    DB::table('project_property_types')->insert([['id' => 1, 'name' => 'Condominiums'], ['id' => 14, 'name' => 'Lot Only']]);
    DB::table('agent_project_transactions')->where('agent_transaction_id', $this->pending->id)->update(['project_property_type_id' => 1, 'unit_type' => 'Studio', 'floor_area' => 24]);

    $this->actingAs($this->superadmin)->get("/superadmin/sales-validation?area=cebu&category=project&sale={$this->pending->id}")
        ->assertInertia(fn ($page) => $page
            ->where('saleDetail.category', 'project')
            ->where('saleDetail.agent.name', 'Ana Cebu')
            ->where('saleDetail.client.client_first_name', 'Juan')
            ->where('saleDetail.property.project_name', 'Mivela')
            ->where('saleDetail.property.unit_type', 'Studio')
            ->where('saleDetail.names.developer', 'Cebu Landmasters')
            ->where('saleDetail.property.proof_of_transaction', 'https://files.test/pot.pdf')
            ->where('editOptions.property_types', fn ($t) => collect($t)->pluck('label')->contains('Lot Only')));

    $this->actingAs($this->superadmin)->put("/superadmin/sales-validation/{$this->pending->id}", [
        'status' => 'pending', 'client_first_name' => 'Juan', 'client_last_name' => 'Cruz', 'client_gender' => 'Male', 'client_country' => 'JP',
        'client_birthdate' => '1980-09-02', 'client_address' => 'Cebu City', 'total_contract_price' => 1000000, 'reservation_date' => '2026-09-01',
        'developer_id' => 10, 'project_name' => 'Mivela', 'commission_status' => 'Fully Claimed', 'term_of_payment' => '24 Months',
        // Lot only: the condo's unit type and floor area no longer apply.
        'project_property_type_id' => 14, 'unit_type' => 'Studio', 'floor_area' => 24, 'lot_area' => 120,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $detail = DB::table('agent_transaction_details')->where('agent_transaction_id', $this->pending->id)->first();
    $project = DB::table('agent_project_transactions')->where('agent_transaction_id', $this->pending->id)->first();
    expect($detail)->client_gender->toBe('Male')->client_country->toBe('JP')->client_age->toBe(45)
        ->and($project)->project_property_type_id->toBe(14)->unit_type->toBeNull()->floor_area->toBeNull()
        ->and((float) $project->lot_area)->toBe(120.0)
        ->and($this->pending->fresh())->commission_status->toBe('Fully Claimed')->term_of_payment->toBe('24 Months')
        ->and(collect($this->pending->fresh()->update_logs)->last()['description'])->toContain('Property type: Condominiums → Lot Only')->toContain('Unit type: Studio → —');
});
