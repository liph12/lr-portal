<?php

use App\Models\Entities\AgentTransaction;
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
    Carbon::setTestNow('2026-10-11 09:00:00');
    Storage::fake('s3');
    config(['filesystems.sale_files_disk' => 's3']);

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $agentRole->permissions()->attach(Permission::where('name', 'record_sales')->value('id'));
    $this->agent = User::factory()->create();
    $this->agent->roles()->attach($agentRole);
    DB::table('agents')->insert(['user_id' => $this->agent->id, 'email' => $this->agent->email]);

    $developer = DB::table('developers')->insertGetId(['name' => 'Cebu Landmasters']);
    // Commercial (id 3) has no measurements, so the payload stays minimal.
    $type = DB::table('project_property_types')->insertGetId(['id' => 3, 'name' => 'Commercial']);

    $this->record = fn (User $user, string $reservationDate) => $this->actingAs($user)->post('/dashboard/record-sale/project', [
        'client_firstname' => 'Juan', 'client_lastname' => 'Dela Cruz', 'client_mobile' => '09171234567', 'client_country' => 'PH',
        'developer_id' => $developer, 'project_name' => 'Unlisted Tower', 'unit_no' => '12B', 'project_property_type_id' => $type,
        'total_contract_price' => '3500000', 'reservation_date' => $reservationDate, 'payment_terms' => 'Cash',
        'commission_status' => 'Unclaimed', 'proof_of_transaction' => UploadedFile::fake()->image('pot.jpg', 400, 300),
    ]);
});

afterEach(fn () => Carbon::setTestNow());

test('superadmins add, edit and remove monthly cutoffs; others cannot', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/sales-cutoffs', ['month' => '2026-09', 'cutoff_at' => '2026-10-02T17:00'])
        ->assertSessionHasNoErrors();
    $id = DB::table('sales_cutoffs')->where('month', '2026-09')->value('id');
    expect(DB::table('sales_cutoffs')->find($id)->cutoff_at)->toStartWith('2026-10-02 17:00');

    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/sales-cutoffs', ['month' => '2026-09', 'cutoff_at' => '2026-10-03T17:00'])
        ->assertSessionHasErrors(['month' => 'That month already has a cutoff. Edit it instead.']);
    $this->actingAs($this->superadmin)
        ->post('/superadmin/settings/sales-cutoffs', ['month' => '2026-11', 'cutoff_at' => '2026-10-31T17:00'])
        ->assertSessionHasErrors('cutoff_at');

    $this->actingAs($this->superadmin)
        ->put("/superadmin/settings/sales-cutoffs/{$id}", ['month' => '2026-09', 'cutoff_at' => '2026-10-12T12:00'])
        ->assertSessionHasNoErrors();
    expect(DB::table('sales_cutoffs')->find($id)->cutoff_at)->toStartWith('2026-10-12 12:00');

    $this->actingAs($this->superadmin)->get('/superadmin/settings/sales-cutoffs')
        ->assertInertia(fn ($page) => $page->component('SuperAdmin/Settings/SalesCutoffs/Index')
            ->where('cutoffs.0.month', '2026-09')
            ->where('cutoffs.0.closed', false)
            ->where('encoding.enabled', true));

    $this->actingAs($this->superadmin)->delete("/superadmin/settings/sales-cutoffs/{$id}")->assertSessionHasNoErrors();
    expect(DB::table('sales_cutoffs')->count())->toBe(0);

    $this->actingAs($this->agent)->get('/superadmin/settings/sales-cutoffs')->assertForbidden();
});

test('a closed month refuses new sales; an open one still takes them', function () {
    DB::table('sales_cutoffs')->insert([
        ['month' => '2026-09', 'cutoff_at' => '2026-10-02 17:00:00'],
        ['month' => '2026-10', 'cutoff_at' => '2026-11-02 17:00:00'],
    ]);

    ($this->record)($this->agent, '2026-09-28')->assertSessionHasErrors(['reservation_date']);
    // August has no cutoff of its own, but September's has passed, so August is closed too.
    ($this->record)($this->agent, '2026-08-15')->assertSessionHasErrors(['reservation_date']);
    ($this->record)($this->superadmin, '2026-09-28')->assertSessionHasErrors(['reservation_date']);
    expect(AgentTransaction::count())->toBe(0);

    ($this->record)($this->agent, '2026-10-05')->assertSessionHasNoErrors();

    Carbon::setTestNow('2026-11-02 17:00:00');
    ($this->record)($this->agent, '2026-10-20')->assertSessionHasErrors(['reservation_date']);
    expect(AgentTransaction::count())->toBe(1);
});

test('switching recording off blocks every role until it is back on', function () {
    $this->actingAs($this->agent)->put('/superadmin/settings/sales-encoding', ['enabled' => false])->assertForbidden();

    $this->actingAs($this->superadmin)
        ->put('/superadmin/settings/sales-encoding', ['enabled' => false, 'message' => 'Closed for the year-end audit.'])
        ->assertSessionHasNoErrors();

    ($this->record)($this->agent, '2026-10-05')->assertSessionHasErrors(['sales_encoding' => 'Closed for the year-end audit.']);
    ($this->record)($this->superadmin, '2026-10-05')->assertSessionHasErrors('sales_encoding');
    $this->actingAs($this->agent)->get('/dashboard/record-sale/project')
        ->assertInertia(fn ($page) => $page->where('encoding.enabled', false)->where('encoding.message', 'Closed for the year-end audit.'));
    expect(AgentTransaction::count())->toBe(0);

    $this->actingAs($this->superadmin)->put('/superadmin/settings/sales-encoding', ['enabled' => true])->assertSessionHasNoErrors();
    ($this->record)($this->agent, '2026-10-05')->assertSessionHasNoErrors();
    expect(AgentTransaction::count())->toBe(1);
});
