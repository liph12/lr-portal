<?php

use App\Models\Entities\InternationalSale;
use App\Models\Entities\ProjectPropertyType;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Legacy\LegacyInternationalSalesImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    config(['filesystems.sale_files_disk' => 's3']);
    DB::table('project_property_types')->insert(['id' => ProjectPropertyType::CONDO, 'name' => 'Condominiums']);

    $this->globalRole = Role::create(['name' => 'global_partner', 'label' => 'Global Partner']);
    $this->globalRole->permissions()->attach(Permission::where('name', 'record_international_sales')->value('id'));
    $this->agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $this->agentRole->permissions()->attach(Permission::where('name', 'record_sales')->value('id'));

    $this->person = function (Role $role, int $agentId) {
        $user = User::factory()->create();
        $user->roles()->attach($role);
        DB::table('agents')->insert(['id' => $agentId, 'user_id' => $user->id, 'email' => $user->email, 'agent_type' => $role->name === 'global_partner' ? 'global_partner' : 'local']);

        return $user;
    };
    $this->partner = ($this->person)($this->globalRole, 900);
    $this->local = ($this->person)($this->agentRole, 901);

    $this->payload = fn (array $overrides = []) => array_merge([
        'client_firstname' => 'Maria', 'client_lastname' => 'Santos', 'client_mobile' => '+971501234567', 'client_country' => 'AE',
        'client_age' => '41', 'unit_no' => 'Tower 2 - 15A', 'unit_quantity' => '2', 'project_property_type_id' => ProjectPropertyType::CONDO,
        'unit_type' => 'Studio', 'floor_area' => '24', 'total_contract_price' => '5200000', 'reservation_date' => '2026-10-03',
        'remarks' => 'OFW buyer', 'proof_of_transaction' => UploadedFile::fake()->image('pot.jpg', 800, 600),
    ], $overrides);
});

test('a global partner records an international sale credited to them', function () {
    $this->actingAs($this->partner)->post('/dashboard/record-sale/international', ($this->payload)())
        ->assertRedirect(route('dashboard.record-sale'))
        ->assertSessionHasNoErrors();

    $sale = InternationalSale::with('client')->sole();
    expect($sale->agent_id)->toBe(900)
        ->and($sale->recorded_by)->toBe($this->partner->id)
        ->and($sale->unit_quantity)->toBe(2)
        ->and((float) $sale->floor_area)->toBe(24.0)
        ->and($sale->sale_status)->toBe('pending')
        ->and($sale->client->only(['first_name', 'last_name', 'age', 'country']))->toBe(['first_name' => 'Maria', 'last_name' => 'Santos', 'age' => 41, 'country' => 'AE'])
        ->and($sale->proof_of_transaction)->toContain("sales/international/{$sale->id}/");
});

test('global partners only get the international form; local agents only the local ones', function () {
    $this->actingAs($this->partner)->get('/dashboard/record-sale')
        ->assertInertia(fn ($page) => $page->where('can', ['local' => false, 'international' => true]));
    $this->actingAs($this->partner)->get('/dashboard/record-sale/project')->assertForbidden();

    $this->actingAs($this->local)->get('/dashboard/record-sale')
        ->assertInertia(fn ($page) => $page->where('can', ['local' => true, 'international' => false]));
    $this->actingAs($this->local)->post('/dashboard/record-sale/international', ($this->payload)())->assertForbidden();

    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));
    $this->actingAs($staff)->get('/dashboard/record-sale')->assertForbidden();
    expect(InternationalSale::count())->toBe(0);
});

test('international sales follow the property-type measurements and the recording switch', function () {
    $this->actingAs($this->partner)->post('/dashboard/record-sale/international', ($this->payload)(['floor_area' => '', 'unit_quantity' => '0']))
        ->assertSessionHasErrors(['floor_area', 'unit_quantity']);

    DB::table('app_settings')->insert(['key' => 'sales_encoding', 'value' => json_encode(['enabled' => false])]);
    $this->actingAs($this->partner)->post('/dashboard/record-sale/international', ($this->payload)())->assertSessionHasErrors('sales_encoding');

    expect(InternationalSale::count())->toBe(0);
});

test('legacy international sales keep their ids and map agent_id (memberid) to the agent', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('members', function (Blueprint $t) {
        $t->id();
        $t->integer('memberid')->nullable();
    });
    Schema::connection('legacy')->create('international_sales_report', function (Blueprint $t) {
        $t->integer('id');
        foreach (['client_fn', 'client_mn', 'client_ln', 'client_email', 'client_age', 'client_address', 'client_mobile', 'client_country',
            'unit_number', 'reservation_date', 'remarks', 'pot_file', 'sale_validation', 'sale_status', 'logs', 'created_at', 'updated_at'] as $c) {
            $t->text($c)->nullable();
        }
        foreach (['client_gender', 'property_type_id', 'unit_quantity', 'agent_id'] as $c) {
            $t->integer($c)->nullable();
        }
        $t->double('total_contract_price')->nullable();
    });
    DB::connection('legacy')->table('members')->insert(['id' => 900, 'memberid' => 55501]);
    DB::connection('legacy')->table('international_sales_report')->insert([
        ['id' => 7, 'agent_id' => 55501, 'client_fn' => 'MARIA', 'client_ln' => 'SANTOS', 'client_email' => 'Maria@Example.com', 'client_age' => '41',
            'client_gender' => 1, 'client_country' => 'Philippines', 'unit_number' => '15A', 'property_type_id' => 1, 'unit_quantity' => 1,
            'total_contract_price' => 4200000.5, 'reservation_date' => '2024-04-29', 'pot_file' => 'lr_app/proofoftrans/May2024/17/pot file',
            'created_at' => '0000-00-00 00:00:00', 'remarks' => 'Paid'],
        ['id' => 8, 'agent_id' => 99999, 'client_fn' => 'Ben', 'client_ln' => 'Cruz', 'client_email' => 'not-an-email', 'client_age' => '',
            'client_gender' => 1, 'client_country' => 'Philippines', 'unit_number' => '3B', 'property_type_id' => 77, 'unit_quantity' => 0,
            'total_contract_price' => 0, 'reservation_date' => '2025-01-10', 'pot_file' => '', 'created_at' => '2025-01-11 10:00:00', 'remarks' => ''],
    ]);

    $first = (new LegacyInternationalSalesImporter)->run();
    $again = (new LegacyInternationalSalesImporter)->run();

    $sale = InternationalSale::with('client')->find(7);
    expect($sale->agent_id)->toBe(900)
        ->and($sale->project_property_type_id)->toBe(ProjectPropertyType::CONDO)
        ->and((float) $sale->total_contract_price)->toBe(4200000.5)
        ->and($sale->reservation_date->toDateString())->toBe('2024-04-29')
        ->and($sale->created_at->toDateString())->toBe('2024-04-29')
        ->and($sale->proof_of_transaction)->toBe(LegacyInternationalSalesImporter::FILE_BASE_URL.'lr_app/proofoftrans/May2024/17/pot%20file')
        ->and($sale->client->only(['first_name', 'last_name', 'email', 'age', 'gender']))->toBe(['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria@example.com', 'age' => 41, 'gender' => null])
        ->and(InternationalSale::find(8)->agent_id)->toBeNull()
        ->and(InternationalSale::find(8)->unit_quantity)->toBe(1)
        ->and(InternationalSale::find(8)->project_property_type_id)->toBeNull()
        ->and($first)->toMatchArray(['imported' => 2, 'with_agent' => 1, 'agent_not_found' => 1, 'pending' => 2, 'without_pot' => 1])
        ->and($again)->toMatchArray(['imported' => 0, 'already_imported' => 2]);
});
