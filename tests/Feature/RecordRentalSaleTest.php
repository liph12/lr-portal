<?php

use App\Models\Entities\AgentRentalTransaction;
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

    foreach ([
        ProjectPropertyType::CONDO => 'Condominiums',
        ProjectPropertyType::HOUSE_AND_LOT => 'House & Lot',
        ProjectPropertyType::TOWNHOUSE => 'Townhouse',
        ProjectPropertyType::LOT_ONLY => 'Lot Only',
        19 => 'Office Space',
    ] as $id => $name) {
        DB::table('project_property_types')->insert(['id' => $id, 'name' => $name]);
    }

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $agent = function (string $name, string $status = 'active') {
        $user = User::factory()->create(['name' => $name, 'status' => $status]);
        [$first, $last] = explode(' ', $name, 2);

        return DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'first_name' => $first, 'last_name' => $last]);
    };
    $this->closer = $agent('Ana Reyes');
    $this->partner = $agent('Ben Cruz');
    $this->resigned = $agent('Ana Resigned', 'resigned');

    $this->payload = fn (array $overrides = []) => array_merge([
        'client_firstname' => 'Juan',
        'client_lastname' => 'Dela Cruz',
        'client_mobile' => '09171234567',
        'client_country' => 'PH',
        'unit_no' => 'Unit 5F, Avida Tower',
        'project_property_type_id' => ProjectPropertyType::CONDO,
        'unit_type' => '1 Bedroom',
        'floor_area' => '32.5',
        'lot_area' => '999',
        'rental_rate' => '25000',
        'total_contract_price' => '300000',
        'reservation_date' => '2026-10-05',
        'payment_terms' => '12 Months',
        'commission_status' => 'Unclaimed',
        'closing_agent_id' => $this->closer,
        'partner_agent_id' => $this->partner,
        'remittance_slip' => UploadedFile::fake()->image('remittance.jpg', 1200, 900),
        'deposit_slip' => UploadedFile::fake()->createWithContent('deposit.pdf', "%PDF-1.4\n".str_repeat('x', 5000)),
    ], $overrides);

    $this->post = fn (array $overrides = []) => $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/rental', ($this->payload)($overrides));
});

function rentalObjectPath(string $url): string
{
    return ltrim(str_replace(rtrim(Storage::disk('s3')->url(''), '/'), '', $url), '/');
}

test('a rental sale is recorded without a developer, with both slips and its agents', function () {
    ($this->post)()->assertRedirect(route('dashboard.record-sale'))->assertSessionHasNoErrors();

    $sale = AgentTransaction::with(['detail', 'rentalTransaction'])->sole();
    $rental = $sale->rentalTransaction;

    expect($sale->sale_type)->toBe('rental')
        ->and($sale->recorded_by)->toBe($this->superadmin->id)
        ->and($sale->unit_number)->toBe('Unit 5F, Avida Tower')
        ->and($sale->detail->client_last_name)->toBe('Dela Cruz')
        ->and(DB::table('agent_project_transactions')->count())->toBe(0)
        ->and($rental->developer_project_id)->toBeNull()
        ->and($rental->project_property_type_id)->toBe(ProjectPropertyType::CONDO)
        ->and($rental->unit_type)->toBe('1 Bedroom')
        ->and((float) $rental->floor_area)->toBe(32.5)
        // A condo has no lot area, so a stray value isn't kept.
        ->and($rental->lot_area)->toBeNull()
        ->and((float) $rental->rental_rate)->toBe(25000.0)
        ->and($rental->total_contract_price)->toBe(300000.0)
        ->and($rental->closing_agent)->toBe('Ana Reyes')
        ->and($rental->partner_agent)->toBe('Ben Cruz');

    foreach ([$rental->remittance_slip, $rental->deposit_slip] as $url) {
        expect(rentalObjectPath($url))->toStartWith("sales/rental/{$sale->id}/");
        Storage::disk('s3')->assertExists(rentalObjectPath($url));
    }
    expect(Storage::disk('s3')->allFiles())->toHaveCount(2);
});

test('the remittance slip is required; the deposit slip and agents are optional', function () {
    ($this->post)(['remittance_slip' => null])->assertSessionHasErrors(['remittance_slip' => 'Upload the remittance slip.']);
    expect(AgentTransaction::count())->toBe(0);

    ($this->post)(['deposit_slip' => null, 'closing_agent_id' => null, 'partner_agent_id' => null])->assertSessionHasNoErrors();

    $rental = AgentRentalTransaction::sole();
    expect($rental->deposit_slip)->toBeNull()->and($rental->closing_agent)->toBeNull()->and($rental->partner_agent)->toBeNull();
});

test('agents must exist and the partner must differ from the closing agent', function () {
    ($this->post)(['closing_agent_id' => 999999])->assertSessionHasErrors('closing_agent_id');
    ($this->post)(['partner_agent_id' => $this->closer])->assertSessionHasErrors('partner_agent_id');

    expect(AgentTransaction::count())->toBe(0);
});

test('each property type asks for its own measurements', function (int $type, array $missing, array $present) {
    $blank = ['unit_type' => '', 'floor_area' => '', 'lot_area' => ''];

    if ($missing) {
        ($this->post)(['project_property_type_id' => $type, ...$blank])->assertSessionHasErrors($missing);
        expect(AgentTransaction::count())->toBe(0);
    }

    ($this->post)(['project_property_type_id' => $type, 'unit_type' => 'Studio', 'floor_area' => '40', 'lot_area' => '120'])->assertSessionHasNoErrors();

    $rental = AgentRentalTransaction::sole();
    foreach (['unit_type', 'floor_area', 'lot_area'] as $field) {
        expect($rental->{$field} !== null)->toBe(in_array($field, $present, true));
    }
})->with([
    'condo' => [ProjectPropertyType::CONDO, ['unit_type', 'floor_area'], ['unit_type', 'floor_area']],
    'house & lot' => [ProjectPropertyType::HOUSE_AND_LOT, ['floor_area', 'lot_area'], ['floor_area', 'lot_area']],
    'townhouse' => [ProjectPropertyType::TOWNHOUSE, ['floor_area', 'lot_area'], ['floor_area', 'lot_area']],
    'lot only' => [ProjectPropertyType::LOT_ONLY, ['lot_area'], ['lot_area']],
    'office space' => [19, [], []],
]);

test('a failure after uploading removes both slips', function () {
    AgentRentalTransaction::creating(fn () => throw new RuntimeException('database went away'));

    ($this->post)()->assertServerError();

    expect(AgentTransaction::count())->toBe(0)->and(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('only superadmins can record rentals or search agents, and the search lists active agents', function () {
    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));

    $this->actingAs($staff)->post('/dashboard/record-sale/rental', ($this->payload)())->assertForbidden();
    $this->actingAs($staff)->getJson('/search/agents?q=ana')->assertForbidden();

    $this->actingAs($this->superadmin)->getJson('/search/agents?q=ana')
        ->assertOk()
        ->assertJsonCount(1, 'agents')
        ->assertJsonPath('agents.0.id', $this->closer)
        ->assertJsonPath('agents.0.name', 'Ana Reyes');
});

test('the rental page offers property types, not developers', function () {
    $this->actingAs($this->superadmin)->get('/dashboard/record-sale/rental')
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/RecordSale/Rental')
            ->has('propertyTypes', 5)
            ->has('maxFileKb')
            ->missing('developers'));
});
