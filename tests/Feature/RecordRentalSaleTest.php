<?php

use App\Models\Entities\Agent;
use App\Models\Entities\AgentRentalTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\RentalSaleService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

    // Ana closes on Team Dreamchasers, in Mia's sub-team.
    $team = DB::table('teams')->insertGetId(['name' => 'Dreamchasers', 'agent_id' => $this->partner, 'status' => 'active']);
    $this->manager = $agent('Mia Lopez');
    $subTeam = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Dreamchasers 1', 'agent_id' => $this->manager, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->closer, 'joined_at' => '2025-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $subTeam, 'agent_id' => $this->closer, 'joined_at' => '2025-01-01', 'status' => 'active']);

    $this->payload = fn (array $overrides = []) => array_merge([
        'client_firstname' => 'Andrew',
        'client_lastname' => 'Thornhill',
        'client_mobile' => '09171234567',
        'client_country' => 'PH',
        'unit_no' => 'RLC Galleria Residences, Unit 1503',
        'project_property_type_id' => ProjectPropertyType::CONDO,
        'property_size' => '40.50',
        'rental_rate' => '40000',
        'duration_value' => '6',
        'duration_unit' => 'months',
        'remittance_date' => '2026-10-09',
        'commission_received' => '10000',
        'commission_status' => 'Unclaimed',
        'closing_agent_id' => $this->closer,
        'partner_agent_id' => $this->partner,
        'contract' => UploadedFile::fake()->createWithContent('lease.pdf', "%PDF-1.4\n".str_repeat('x', 5000)),
        'proof_of_transaction' => UploadedFile::fake()->image('with-client.jpg', 1200, 900),
        'deposit_slip' => UploadedFile::fake()->image('deposit.jpg', 800, 600),
    ], $overrides);

    $this->post = fn (array $overrides = []) => $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/rental', ($this->payload)($overrides));
});

// A transparent PNG with a stroke, as the signature pad sends it.
function rentalSignature(): string
{
    $image = imagecreatetruecolor(600, 180);
    imagesavealpha($image, true);
    imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
    imagesetthickness($image, 4);
    imageline($image, 40, 120, 520, 60, imagecolorallocate($image, 26, 58, 138));
    ob_start();
    imagepng($image);

    return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
}

test('a rental is encoded from the rent commission slip: the contract total is worked out, the rest stored as given', function () {
    Carbon::setTestNow('2026-10-10 09:00:00');
    ($this->post)()->assertRedirect(route('dashboard.record-sale'))->assertSessionHasNoErrors();

    $sale = AgentTransaction::with('rentalTransaction')->sole();
    $r = $sale->rentalTransaction;

    // 10,000 is 8.3% of 120,481.93.
    expect($sale->sale_type)->toBe('rental')
        ->and($sale->sale_status)->toBe('pending')
        ->and($sale->unit_number)->toBe('RLC Galleria Residences, Unit 1503')
        ->and($sale->term_of_payment)->toBe('6 months')
        ->and($r->total_contract_price)->toBe(120481.93)
        ->and((float) $r->commission_received)->toBe(10000.0)
        ->and((float) $r->commission_rate)->toBe(8.3)
        ->and((float) $r->rental_rate)->toBe(40000.0)
        ->and((float) $r->property_size)->toBe(40.5)
        ->and($r->duration_value)->toBe(6)
        ->and($r->duration_unit)->toBe('months')
        ->and($r->remittance_date->toDateString())->toBe('2026-10-09')
        ->and($r->reservation_date->toDateString())->toBe('2026-10-09')
        ->and($r->closing_agent)->toBe('Ana Reyes')
        ->and($r->closing_agent_id)->toBe($this->closer)
        ->and($r->partner_agent)->toBe('Ben Cruz');

    // The Rent.ph share and the team / unit manager aren't columns; they're worked out.
    expect(Schema::hasColumns('agent_rental_transactions', ['rent_ph_share']))->toBeFalse()
        ->and(Schema::hasColumns('agent_rental_transactions', ['team']))->toBeFalse()
        ->and(RentalSaleService::teamOf($this->closer))->toBe(['team' => 'Dreamchasers', 'unit_manager' => 'Mia Lopez']);

    foreach ([$r->contract, $r->proof_of_transaction, $r->deposit_slip, $r->remittance_slip] as $url) {
        expect($url)->toContain("sales/rental/{$sale->id}/");
    }
    expect($r->remittance_slip)->toEndWith('.png')->and(Storage::disk('s3')->allFiles())->toHaveCount(4);
});

test('required: contract, proof of transaction, closing agent, a duration in days / months / years, a past date', function () {
    Carbon::setTestNow('2026-10-10 09:00:00');
    ($this->post)(['contract' => null, 'proof_of_transaction' => null])->assertSessionHasErrors(['contract', 'proof_of_transaction']);
    ($this->post)(['closing_agent_id' => null])->assertSessionHasErrors(['closing_agent_id' => 'Select the closing agent, or enter them as not yet in LR.']);
    ($this->post)(['duration_unit' => 'weeks'])->assertSessionHasErrors('duration_unit');
    ($this->post)(['duration_value' => '0'])->assertSessionHasErrors('duration_value');
    ($this->post)(['remittance_date' => '2026-10-20'])->assertSessionHasErrors('remittance_date');
    ($this->post)(['property_size' => ''])->assertSessionHasErrors('property_size');
    ($this->post)(['partner_agent_id' => $this->closer])->assertSessionHasErrors('partner_agent_id');
    ($this->post)(['closing_agent_id' => 999999])->assertSessionHasErrors('closing_agent_id');
    expect(AgentTransaction::count())->toBe(0);

    ($this->post)(['deposit_slip' => null, 'partner_agent_id' => null, 'duration_value' => '1', 'duration_unit' => 'years'])->assertSessionHasNoErrors();
    expect(AgentTransaction::sole()->term_of_payment)->toBe('1 year');
});

test('a failure after uploading removes every file', function () {
    Carbon::setTestNow('2026-10-10 09:00:00');
    AgentRentalTransaction::creating(fn () => throw new RuntimeException('database went away'));

    ($this->post)()->assertServerError();

    expect(AgentTransaction::count())->toBe(0)->and(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('the rent slip can be previewed, and a rental is signed for in Rental receiving', function () {
    Carbon::setTestNow('2026-10-10 09:00:00');
    $this->actingAs($this->superadmin)->post('/dashboard/record-sale/rental/slip-preview', ['commission_received' => '10000', 'closing_agent_id' => $this->closer])
        ->assertOk()->assertHeader('Content-Type', 'image/png');
    expect(Storage::disk('s3')->allFiles())->toBe([]);

    ($this->post)();
    $sale = AgentTransaction::sole();

    // Rental receiving is its own page and permission: brokerage receivers don't get it.
    $clerk = User::factory()->create(['name' => 'Cara Clerk']);
    $role = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $role->permissions()->attach(Permission::where('name', 'receive_brokerage_sales')->value('id'));
    $clerk->roles()->attach($role);
    $this->actingAs($clerk)->get('/rental-receiving')->assertForbidden();
    $this->actingAs($clerk)->post("/rental-receiving/{$sale->id}/receive", ['signature' => rentalSignature(), 'received_on' => '2026-10-10'])->assertForbidden();
    // Nor can a rental be signed for from the brokerage page.
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => rentalSignature(), 'received_on' => '2026-10-10'])->assertForbidden();
    $this->actingAs($clerk)->get("/brokerage-receiving?sale={$sale->id}")->assertInertia(fn ($page) => $page->where('category', 'brokerage')->where('saleDetail', null));

    $role->permissions()->attach(Permission::where('name', 'receive_rental_sales')->value('id'));
    $this->actingAs($clerk)->get('/rental-receiving')
        ->assertInertia(fn ($page) => $page->component('Portal/CommissionReceiving/Index')
            ->where('category', 'rental')
            ->where('counts.awaiting', 1)
            ->where('sales.data.0.place', 'RLC Galleria Residences, Unit 1503')
            ->where('sales.data.0.unregistered_agent', false)
            ->where('sales.data.0.share', 2000)
            ->where('auth.commission_receiving', ['awaiting' => 1, 'brokerage' => 0, 'rental' => 1]));
    $this->actingAs($clerk)->get("/rental-receiving?sale={$sale->id}")
        ->assertInertia(fn ($page) => $page->where('saleDetail.names.team', 'Dreamchasers')->where('saleDetail.names.unit_manager', 'Mia Lopez'));

    $this->actingAs($clerk)->post("/rental-receiving/{$sale->id}/receive", ['signature' => rentalSignature(), 'received_on' => '2026-10-10'])->assertSessionHasNoErrors();
    $sale->refresh();
    expect($sale->sale_status)->toBe('valid')
        ->and($sale->rentalTransaction->received_by)->toBe($clerk->id)
        ->and($sale->rentalTransaction->received_signature)->toContain("sales/rental/{$sale->id}/");
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

test('the rental page offers property types, the fixed rates and the duration units', function () {
    $this->actingAs($this->superadmin)->get('/dashboard/record-sale/rental')
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/RecordSale/Rental')
            ->has('propertyTypes', 5)
            ->where('commissionRate', 8.3)
            ->where('shareRate', 20)
            ->where('durationUnits', ['days', 'months', 'years'])
            ->missing('developers'));
});

test('a closing agent with no LR account is entered by hand, credited by name, and linked when their account appears', function () {
    Carbon::setTestNow('2026-10-10 09:00:00');
    $unregistered = ['closing_agent_id' => null, 'partner_agent_id' => null, 'unregistered_agent_name' => 'Nora Newbie', 'unregistered_agent_email' => 'Nora@Example.com', 'unregistered_agent_mobile' => '+63 917 555 0101'];

    // An email that already has an account must be picked instead; an email is needed to link later.
    $taken = User::where('name', 'Ana Reyes')->value('email');
    ($this->post)([...$unregistered, 'unregistered_agent_email' => $taken])->assertSessionHasErrors('unregistered_agent_email');
    ($this->post)([...$unregistered, 'unregistered_agent_email' => ''])->assertSessionHasErrors('unregistered_agent_email');

    // Recorded by a field agent, it's still credited to Nora — nobody until she has an account.
    $recorderRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $recorderRole->permissions()->attach(Permission::firstOrCreate(['name' => 'record_sales'], ['label' => 'Record Sales']));
    $recorder = User::find(DB::table('agents')->where('id', $this->partner)->value('user_id'));
    $recorder->roles()->attach($recorderRole);
    $this->actingAs($recorder)->post('/dashboard/record-sale/rental', ($this->payload)($unregistered))->assertSessionHasNoErrors();

    $sale = AgentTransaction::with('rentalTransaction')->sole();
    expect($sale->agent_id)->toBeNull()
        ->and($sale->rentalTransaction->closing_agent)->toBe('Nora Newbie')
        ->and($sale->rentalTransaction->closing_agent_id)->toBeNull()
        ->and($sale->rentalTransaction->unregistered_agent_email)->toBe('nora@example.com')
        ->and($sale->rentalTransaction->unregistered_agent_mobile)->toBe('9175550101');

    // Nora signs up (an agent record with her mobile): the rental becomes hers.
    $nora = User::factory()->create(['name' => 'Nora Newbie', 'email' => 'someone-else@example.com']);
    $agent = Agent::create(['user_id' => $nora->id, 'email' => 'someone-else@example.com', 'first_name' => 'Nora', 'last_name' => 'Newbie', 'mobile' => '09175550101']);

    $sale->refresh();
    expect($sale->agent_id)->toBe($agent->id)->and($sale->rentalTransaction->closing_agent_id)->toBe($agent->id);

    // The command finds nothing left to link.
    $this->artisan('rentals:link-unregistered-agents')->expectsOutput('0 rentals linked.')->assertSuccessful();
});
