<?php

use App\Models\Entities\AgentBrokerageTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    config(['filesystems.sale_files_disk' => 's3']);

    DB::table('project_property_types')->insert([
        ['id' => ProjectPropertyType::HOUSE_AND_LOT, 'name' => 'House & Lot'],
        ['id' => ProjectPropertyType::LOT_ONLY, 'name' => 'Lot Only'],
    ]);
    DB::table('brokerage_areas')->insert([
        ['id' => 14, 'name' => 'Cebu Brokerage', 'status' => 'active'],
        ['id' => 15, 'name' => 'Closed Office', 'status' => 'inactive'],
    ]);

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $this->post = fn (array $overrides = []) => $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/brokerage', array_merge([
            'client_firstname' => 'Juan',
            'client_lastname' => 'Dela Cruz',
            'client_mobile' => '09171234567',
            'client_country' => 'PH',
            'brokerage_area_id' => 14,
            'unit_no' => 'Block 3 Lot 12',
            'project_property_type_id' => ProjectPropertyType::HOUSE_AND_LOT,
            'floor_area' => '90',
            'lot_area' => '120',
            'total_contract_price' => '6500000',
            'reservation_date' => '2026-10-07',
            'payment_terms' => 'Cash',
            'commission_status' => 'Unclaimed',
            'remittance_slip' => UploadedFile::fake()->image('remittance.jpg', 1200, 900),
            'deposit_slip' => UploadedFile::fake()->image('deposit.jpg', 800, 600),
        ], $overrides));
});

test('a brokerage sale is recorded under its brokerage area with both slips', function () {
    ($this->post)()->assertRedirect(route('dashboard.record-sale'))->assertSessionHasNoErrors();

    $sale = AgentTransaction::with('brokerageTransaction')->sole();
    $brokerage = $sale->brokerageTransaction;

    expect($sale->sale_type)->toBe('brokerage')
        ->and($sale->recorded_by)->toBe($this->superadmin->id)
        ->and($brokerage->brokerage_area_id)->toBe(14)
        ->and((float) $brokerage->floor_area)->toBe(90.0)
        ->and((float) $brokerage->lot_area)->toBe(120.0)
        ->and($brokerage->unit_type)->toBeNull()
        ->and($brokerage->total_contract_price)->toBe(6500000.0)
        ->and(DB::table('agent_project_transactions')->count() + DB::table('agent_rental_transactions')->count())->toBe(0);

    foreach ([$brokerage->remittance_slip, $brokerage->deposit_slip] as $url) {
        expect($url)->toContain("sales/brokerage/{$sale->id}/");
    }
    expect(Storage::disk('s3')->allFiles())->toHaveCount(2);
});

test('the area must be active, the remittance slip is required and the measurements follow the type', function () {
    ($this->post)(['brokerage_area_id' => 15])->assertSessionHasErrors('brokerage_area_id');
    ($this->post)(['remittance_slip' => null])->assertSessionHasErrors(['remittance_slip' => 'Upload the remittance slip.']);
    ($this->post)(['project_property_type_id' => ProjectPropertyType::LOT_ONLY, 'lot_area' => ''])->assertSessionHasErrors('lot_area');
    expect(AgentTransaction::count())->toBe(0);

    ($this->post)(['deposit_slip' => null, 'project_property_type_id' => ProjectPropertyType::LOT_ONLY])->assertSessionHasNoErrors();

    $brokerage = AgentBrokerageTransaction::sole();
    expect($brokerage->deposit_slip)->toBeNull()->and($brokerage->floor_area)->toBeNull()->and((float) $brokerage->lot_area)->toBe(120.0);
});

test('the brokerage page offers active brokerage areas, and only superadmins may record', function () {
    $this->actingAs($this->superadmin)->get('/dashboard/record-sale/brokerage')
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/RecordSale/Brokerage')
            ->has('brokerageAreas', 1)
            ->where('brokerageAreas.0.name', 'Cebu Brokerage')
            ->has('propertyTypes', 2));

    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));
    $this->actingAs($staff)->post('/dashboard/record-sale/brokerage', [])->assertForbidden();
});
