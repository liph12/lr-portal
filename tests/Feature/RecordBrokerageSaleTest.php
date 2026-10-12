<?php

use App\Models\ActivityLog;
use App\Models\Entities\AgentBrokerageTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-08 10:00:00');
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

    $this->superadmin = User::factory()->create(['name' => 'Sam Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $person = function (string $name, bool $broker = false) {
        $user = User::factory()->create(['name' => $name]);

        return DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'area' => 'cebu', 'is_broker' => $broker]);
    };
    $this->closing = $person('Remy Abrau');
    $this->partner = $person('Pia Partner');
    $this->broker = $person('Marjorie Broker', true);
    $team = DB::table('teams')->insertGetId(['name' => 'VIP - Direct', 'agent_id' => $this->closing, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->closing, 'joined_at' => '2025-01-01', 'status' => 'active']);

    $this->post = fn (array $overrides = []) => $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/brokerage', array_merge([
            'client_firstname' => 'Robert',
            'client_lastname' => 'Hewitt',
            'client_mobile' => '09171234567',
            'client_country' => 'PH',
            'brokerage_area_id' => 14,
            'unit_no' => 'Block 3 Lot 12',
            'project_property_type_id' => ProjectPropertyType::HOUSE_AND_LOT,
            'floor_area' => '90',
            'lot_area' => '120',
            'remittance_date' => '2026-10-06',
            'payment_terms' => 'Cash',
            'commission_status' => 'Unclaimed',
            'commission_received' => '175000',
            'company_share_rate' => 15,
            'closing_agent_id' => $this->closing,
            'partner_agent_id' => $this->partner,
            'signing_broker_id' => $this->broker,
            'property_owner' => 'Rachel Espanola',
            'contract' => UploadedFile::fake()->create('contract.pdf', 200, 'application/pdf'),
            'proof_of_transaction' => UploadedFile::fake()->image('with-client.jpg', 1200, 900),
            'deposit_slip' => UploadedFile::fake()->image('deposit.jpg', 800, 600),
        ], $overrides));
});

test('a brokerage sale is encoded from the commission: the property total, company share and slip are worked out', function () {
    ($this->post)()->assertRedirect(route('dashboard.record-sale'))->assertSessionHasNoErrors();

    $sale = AgentTransaction::with('brokerageTransaction')->sole();
    $b = $sale->brokerageTransaction;

    // 175,000 is 5% of 3.5M; the company's 15% of it is 26,250.
    expect($sale->sale_type)->toBe('brokerage')
        ->and($sale->sale_status)->toBe('pending')
        ->and($b->total_contract_price)->toBe(3500000.0)
        ->and((float) $b->commission_received)->toBe(175000.0)
        ->and((float) $b->commission_rate)->toBe(5.0)
        ->and((float) $b->company_share_rate)->toBe(15.0)
        ->and((float) $b->company_share)->toBe(26250.0)
        ->and($b->reservation_date->toDateString())->toBe('2026-10-06')
        ->and($b->remittance_date->toDateString())->toBe('2026-10-06')
        ->and($b->closing_agent)->toBe('Remy Abrau')
        ->and($b->partner_agent)->toBe('Pia Partner')
        ->and($b->signing_broker_id)->toBe($this->broker);

    // Contract, proof of transaction, deposit slip — and the generated commission slip (a PNG).
    foreach ([$b->contract, $b->proof_of_transaction, $b->deposit_slip, $b->remittance_slip] as $url) {
        expect($url)->toContain("sales/brokerage/{$sale->id}/");
    }
    expect($b->remittance_slip)->toEndWith('.png')
        ->and(getimagesizefromstring(Storage::disk('s3')->get(Str::after($b->remittance_slip, '/storage/') ?: ''))['mime'] ?? 'image/png')->toBe('image/png');

    // The owner's name goes on the slip only, never into the database.
    $everything = json_encode([DB::table('agent_brokerage_transactions')->get(), DB::table('agent_transactions')->get(), DB::table('agent_transaction_details')->get(), ActivityLog::all()]);
    expect($everything)->not->toContain('Rachel');
});

test('10% company share, required uploads, a broker as signing broker and an open month', function () {
    ($this->post)(['company_share_rate' => 10])->assertSessionHasNoErrors();
    expect((float) AgentBrokerageTransaction::sole()->company_share)->toBe(17500.0);

    ($this->post)(['company_share_rate' => 12])->assertSessionHasErrors('company_share_rate');
    ($this->post)(['contract' => null, 'proof_of_transaction' => null])->assertSessionHasErrors(['contract', 'proof_of_transaction']);
    ($this->post)(['signing_broker_id' => $this->partner])->assertSessionHasErrors(['signing_broker_id' => 'Select a broker from the list.']);
    ($this->post)(['property_owner' => ''])->assertSessionHasErrors('property_owner');
    ($this->post)(['remittance_date' => '2026-10-20'])->assertSessionHasErrors('remittance_date');
    ($this->post)(['brokerage_area_id' => 15])->assertSessionHasErrors('brokerage_area_id');
    ($this->post)(['partner_agent_id' => $this->closing])->assertSessionHasErrors('partner_agent_id');

    // The remittance date is the sale's date for cutoffs too.
    DB::table('sales_cutoffs')->insert(['month' => '2026-09', 'cutoff_at' => '2026-10-05 17:00:00']);
    ($this->post)(['remittance_date' => '2026-09-28'])->assertSessionHasErrors('reservation_date');
    expect(AgentTransaction::count())->toBe(1);
});

// What the signature pad sends: a transparent PNG, with or without a stroke on it.
function signature(bool $drawn = true): string
{
    $image = imagecreatetruecolor(600, 180);
    imagesavealpha($image, true);
    imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
    if ($drawn) {
        imagesetthickness($image, 4);
        imageline($image, 40, 120, 520, 60, imagecolorallocate($image, 26, 58, 138));
    }
    ob_start();
    imagepng($image);

    return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
}

test('Brokerage receiving lists slips awaiting receipt; signing for one validates it and signs the slip', function () {
    ($this->post)();
    $sale = AgentTransaction::sole();
    $slipPath = collect(Storage::disk('s3')->allFiles())->first(fn ($p) => str_ends_with($p, '.png'));
    $original = Storage::disk('s3')->get($slipPath);

    // Someone with sales validation but not the receive permission has no page and can't receive.
    $clerk = User::factory()->create(['name' => 'Cherrie Clerk']);
    $clerkRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $clerkRole->permissions()->attach(Permission::firstOrCreate(['name' => 'sales_validation'], ['label' => 'Sales Validation']));
    $clerk->roles()->attach($clerkRole);
    $this->actingAs($clerk)->get('/brokerage-receiving')->assertForbidden();
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(), 'received_on' => '2026-10-07'])->assertForbidden();

    $clerkRole->permissions()->attach(Permission::where('name', 'receive_brokerage_sales')->value('id'));
    $this->actingAs($clerk)->get('/brokerage-receiving')
        ->assertInertia(fn ($page) => $page->component('Portal/CommissionReceiving/Index')
            ->where('counts', ['awaiting' => 1, 'received' => 0, 'disapproved' => 0])
            ->where('sales.data.0.id', $sale->id)
            ->where('sales.data.0.commission_received', 175000)
            ->where('auth.commission_receiving.awaiting', 1));
    $this->actingAs($clerk)->get("/brokerage-receiving?sale={$sale->id}")->assertInertia(fn ($page) => $page->where('saleDetail.id', $sale->id));

    // A signature is required, and has to have something drawn on it.
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", [])->assertSessionHasErrors('signature');
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(false), 'received_on' => '2026-10-07'])->assertSessionHasErrors(['signature' => 'Sign in the box before receiving.']);
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => 'data:image/png;base64,bm90IGFuIGltYWdl', 'received_on' => '2026-10-07'])->assertSessionHasErrors('signature');

    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(), 'received_on' => '2026-10-07'])->assertRedirect()->assertSessionHasNoErrors();

    $sale->refresh();
    $b = $sale->brokerageTransaction;
    expect($sale->sale_status)->toBe('valid')
        ->and($sale->validated_by)->toBe($clerk->id)
        ->and($b->received_by)->toBe($clerk->id)
        ->and($b->received_at->toDateString())->toBe('2026-10-07')
        ->and($b->received_signature)->toContain("sales/brokerage/{$sale->id}/")
        ->and(Storage::disk('s3')->get($slipPath))->not->toBe($original)
        ->and(json_encode(ActivityLog::all()))->not->toContain('base64');

    // Received now; can't be signed for twice.
    $this->actingAs($clerk)->get('/brokerage-receiving?status=received')->assertInertia(fn ($page) => $page->where('counts', ['awaiting' => 0, 'received' => 1, 'disapproved' => 0])->where('sales.data.0.received_by', 'Cherrie Clerk'));

    // The date received can be corrected; the slip is signed again.
    $signed = Storage::disk('s3')->get($slipPath);
    $this->actingAs($clerk)->patch("/brokerage-receiving/{$sale->id}/received-date", ['received_on' => '2026-10-20'])->assertSessionHasErrors('received_on');
    $this->actingAs($clerk)->patch("/brokerage-receiving/{$sale->id}/received-date", ['received_on' => '2026-10-06'])->assertSessionHasNoErrors()->assertSessionMissing('warning');
    // Before the remittance date (Oct 6): saved, with a warning toast.
    $this->actingAs($clerk)->patch("/brokerage-receiving/{$sale->id}/received-date", ['received_on' => '2026-10-05'])->assertSessionHas('warning');
    $this->actingAs($clerk)->patch("/brokerage-receiving/{$sale->id}/received-date", ['received_on' => '2026-10-06']);
    expect($sale->brokerageTransaction()->first()->received_at->toDateString())->toBe('2026-10-06')
        ->and(Storage::disk('s3')->get($slipPath))->not->toBe($signed);
    $this->actingAs($clerk)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(), 'received_on' => '2026-10-07'])->assertSessionHasErrors('signature');
    $this->actingAs($this->superadmin)->get("/superadmin/sales-validation?sale={$sale->id}")
        ->assertInertia(fn ($page) => $page->where('saleDetail.names.received_by', 'Cherrie Clerk')->where('saleDetail.names.signing_broker', 'Marjorie Broker'));
});

test('receiving is for the back office: secretaries don\'t get it, even with the permission', function () {
    ($this->post)();
    $sale = AgentTransaction::sole();
    $role = Role::create(['name' => 'secretary', 'label' => 'Secretary']);
    $role->permissions()->attach(Permission::where('name', 'receive_brokerage_sales')->value('id'));
    $secretary = User::factory()->create();
    $secretary->roles()->attach($role);
    $agent = DB::table('agents')->insertGetId(['user_id' => $secretary->id, 'email' => $secretary->email, 'area' => 'cebu']);
    DB::table('offices')->insert(['name' => 'Cebu', 'area' => 'cebu', 'secretary_agent_id' => $agent]);

    $this->actingAs($secretary)->get('/brokerage-receiving')->assertForbidden();
    $this->actingAs($secretary)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(), 'received_on' => '2026-10-07'])->assertForbidden();
    $this->actingAs($secretary)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.commission_receiving', null));
});

test('a waiting slip can be disapproved with a reason; the lists filter by status, remittance dates and area', function () {
    ($this->post)();
    ($this->post)(['remittance_date' => '2026-09-15', 'client_firstname' => 'Older']);
    [$sale] = AgentTransaction::orderBy('id')->get();
    $slipPath = collect(Storage::disk('s3')->allFiles("sales/brokerage/{$sale->id}"))->first(fn ($p) => str_ends_with($p, '.png') && ! str_contains($p, 'with-client'));
    $before = Storage::disk('s3')->get($slipPath);

    // This month by default (Oct 2026); the September one only with its dates.
    $this->actingAs($this->superadmin)->get('/brokerage-receiving')->assertInertia(fn ($page) => $page->where('counts.awaiting', 1)->where('filters.from', '2026-10-01'));
    $this->actingAs($this->superadmin)->get('/brokerage-receiving?from=2026-09-01&to=2026-10-08')->assertInertia(fn ($page) => $page->where('counts.awaiting', 2));

    $this->actingAs($this->superadmin)->post("/brokerage-receiving/{$sale->id}/disapprove", ['reason' => ''])->assertSessionHasErrors('reason');
    $this->actingAs($this->superadmin)->post("/brokerage-receiving/{$sale->id}/disapprove", ['reason' => 'The deposit slip does not match the amount.'])->assertSessionHasNoErrors();

    $sale->refresh();
    expect($sale->sale_status)->toBe('invalid')
        ->and($sale->brokerageTransaction->disapproval_reason)->toBe('The deposit slip does not match the amount.')
        ->and($sale->brokerageTransaction->disapproved_by)->toBe($this->superadmin->id)
        ->and(Storage::disk('s3')->get($slipPath))->not->toBe($before);
    $this->actingAs($this->superadmin)->get('/brokerage-receiving?status=disapproved')
        ->assertInertia(fn ($page) => $page->where('counts', ['awaiting' => 0, 'received' => 0, 'disapproved' => 1])->where('sales.data.0.disapproval_reason', 'The deposit slip does not match the amount.'));

    // Disapproved: no longer received or disapproved again.
    $this->actingAs($this->superadmin)->post("/brokerage-receiving/{$sale->id}/receive", ['signature' => signature(), 'received_on' => '2026-10-07'])->assertSessionHasErrors('signature');
    $this->actingAs($this->superadmin)->post("/brokerage-receiving/{$sale->id}/disapprove", ['reason' => 'Again'])->assertSessionHasErrors('reason');

    // The area filter: the recorder (superadmin) has no area, so a Davao filter shows nothing.
    $this->actingAs($this->superadmin)->get('/brokerage-receiving?status=disapproved&area=davao')->assertInertia(fn ($page) => $page->where('counts.disapproved', 0)->where('filters.area', 'davao'));
});

test('the brokerage page offers active areas, brokers to sign and the company-share choices', function () {
    $this->actingAs($this->superadmin)->get('/dashboard/record-sale/brokerage')
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/RecordSale/Brokerage')
            ->has('brokerageAreas', 1)
            ->where('brokers.0.name', 'Marjorie Broker')
            ->has('brokers', 1)
            ->where('companyShareRates', [15, 10])
            ->where('commissionRate', 5));

    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));
    $this->actingAs($staff)->post('/dashboard/record-sale/brokerage', [])->assertForbidden();
});

test('the slip can be previewed from the form so far: an image, nothing saved, the owner nowhere in the database', function () {
    $response = $this->actingAs($this->superadmin)->post('/dashboard/record-sale/brokerage/slip-preview', [
        'client_firstname' => 'Robert',
        'commission_received' => '175000',
        'company_share_rate' => 10,
        'signing_broker_id' => $this->broker,
        'property_owner' => 'Rachel Espanola',
    ]);

    $response->assertOk()->assertHeader('Content-Type', 'image/png');
    expect(getimagesizefromstring($response->getContent())[0])->toBe(1240)
        ->and(AgentTransaction::count())->toBe(0)
        ->and(Storage::disk('s3')->allFiles())->toBe([])
        ->and(json_encode(ActivityLog::all()))->not->toContain('Rachel');

    // Half-filled is fine; nonsense isn't.
    $this->actingAs($this->superadmin)->post('/dashboard/record-sale/brokerage/slip-preview', [])->assertOk();
    $this->actingAs($this->superadmin)->postJson('/dashboard/record-sale/brokerage/slip-preview', ['commission_received' => 'lots'])->assertUnprocessable();

    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));
    $this->actingAs($staff)->post('/dashboard/record-sale/brokerage/slip-preview', [])->assertForbidden();
});
