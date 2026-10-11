<?php

use App\Models\Entities\AgentTransaction;
use App\Models\User;
use App\Services\Legacy\LegacySalesImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $legacy = Schema::connection('legacy');

    $legacy->create('developers', function (Blueprint $t) {
        $t->integer('id');
        $t->string('name');
        $t->integer('isbroker')->default(0);
        $t->integer('deleted')->default(0);
        foreach (['street', 'email', 'landline', 'mobile'] as $c) {
            $t->string($c)->nullable();
        }
    });
    $legacy->create('members', function (Blueprint $t) {
        $t->id();
        $t->integer('memberid')->nullable();
    });
    $legacy->create('salesreport', function (Blueprint $t) {
        $t->id();
        foreach (['name', 'clientfamilyname', 'clientAddress', 'clientGender', 'clientEmail', 'clientMobile', 'clientCountry',
            'unitnum', 'projectname', 'reservationdate', 'termofpayment', 'dateadded', 'status', 'remarks', 'dateupdated',
            'files', 'rental_deposit_slip', 'validSale', 'prop_details', 'logs', 'created_at'] as $c) {
            $t->text($c)->nullable();
        }
        foreach (['devid', 'projid', 'prop_type_id', 'agentid', 'deleted'] as $c) {
            $t->integer($c)->nullable();
        }
        $t->double('tcprice')->nullable();
    });

    DB::connection('legacy')->table('developers')->insert([
        ['id' => 10, 'name' => 'Cebu Landmasters', 'isbroker' => 0],
        ['id' => 14, 'name' => 'Cebu Brokerage', 'isbroker' => 1],
        ['id' => 651, 'name' => 'Rental', 'isbroker' => 3],
    ]);
    // Agent 500 in the new system is legacy member 500, whose memberid (used by salesreport) is 9001.
    DB::connection('legacy')->table('members')->insert(['id' => 500, 'memberid' => 9001]);

    $user = User::factory()->create();
    DB::table('agents')->insert(['id' => 500, 'user_id' => $user->id, 'email' => 'agent@example.com']);
    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    $this->condo = DB::table('project_property_types')->insertGetId(['id' => 1, 'name' => 'Condominiums']);
    DB::table('developer_projects')->insert(['id' => 77, 'developer_id' => 10, 'name' => 'Mivela Garden', 'project_property_type_id' => 1]);

    $this->sale = fn (array $attrs) => DB::connection('legacy')->table('salesreport')->insertGetId(array_merge([
        'name' => 'Juan', 'clientfamilyname' => 'Dela Cruz', 'clientGender' => 'male', 'clientEmail' => 'JUAN@example.com',
        'clientCountry' => 'Philippines', 'unitnum' => '12B', 'reservationdate' => '03/15/2025', 'dateadded' => '03/16/2025',
        'termofpayment' => '12 Months', 'status' => 'Unclaimed', 'validSale' => 'Yes', 'agentid' => 9001, 'deleted' => 0,
        'prop_type_id' => 1, 'tcprice' => 3500000,
    ], $attrs));

    $this->import = fn (bool $dryRun = false) => (new LegacySalesImporter)->run($dryRun);
});

test('a project sale keeps its legacy id, links the agent via memberid, and maps prop_details', function () {
    $id = ($this->sale)([
        'devid' => 10, 'projid' => 77, 'projectname' => 'Mivela Garden',
        'prop_details' => json_encode(['floor_area' => '28.5', 'lot_area' => '', 'unit_type' => 'Studio']),
        'files' => 'proofoftrans/123/receipt 1.jpg', 'status' => 'Full Claimed',
    ]);

    $result = ($this->import)();

    $sale = AgentTransaction::with(['detail', 'projectTransaction'])->findOrFail($id);
    $project = $sale->projectTransaction;

    expect($sale->agent_id)->toBe(500)
        ->and($sale->recorded_by)->toBeNull()
        ->and($sale->sale_type)->toBe('project')
        ->and($sale->commission_status)->toBe('Fully Claimed')
        ->and($sale->sale_status)->toBe('valid')
        ->and($sale->created_at->toDateString())->toBe('2025-03-16')
        ->and($sale->detail->client_last_name)->toBe('Dela Cruz')
        ->and($sale->detail->client_email)->toBe('juan@example.com')
        ->and($sale->detail->client_gender)->toBe('Male')
        ->and($project->developer_id)->toBe(10)
        ->and($project->developer_project_id)->toBe(77)
        ->and($project->project_property_type_id)->toBe(1)
        ->and($project->unit_type)->toBe('Studio')
        ->and((float) $project->floor_area)->toBe(28.5)
        ->and($project->lot_area)->toBeNull()
        ->and($project->reservation_date->toDateString())->toBe('2025-03-15')
        ->and($project->proof_of_transaction)->toBe('https://leuteriorealty.com/proofoftrans/123/receipt%201.jpg')
        ->and($result['stats'])->toMatchArray(['project' => 1, 'with_agent' => 1]);
});

test('rental sales go to the rental table with their own details and no developer', function () {
    $id = ($this->sale)([
        'devid' => 651, 'rental_deposit_slip' => 'https://filipinohomes123.s3.amazonaws.com/slip.jpg',
        'files' => 'https://filipinohomes123.s3.amazonaws.com/pot.jpg',
        'prop_details' => json_encode(['rental_rate' => '25000', 'closing_agent' => 'Ana Reyes', 'partner_agent' => 'Ben Cruz', 'property_size' => '30', 'unit_type' => '1 Bedroom', 'floor_area' => '30']),
    ]);

    ($this->import)();

    $rental = DB::table('agent_rental_transactions')->where('agent_transaction_id', $id)->first();

    expect(AgentTransaction::find($id)->sale_type)->toBe('rental')
        ->and(DB::table('agent_project_transactions')->count())->toBe(0)
        ->and($rental->developer_project_id)->toBeNull()
        ->and((float) $rental->rental_rate)->toBe(25000.0)
        ->and($rental->closing_agent)->toBe('Ana Reyes')
        ->and($rental->partner_agent)->toBe('Ben Cruz')
        ->and($rental->property_size)->toBe('30')
        ->and($rental->unit_type)->toBe('1 Bedroom')
        ->and($rental->deposit_slip)->toBe('https://filipinohomes123.s3.amazonaws.com/slip.jpg')
        ->and($rental->remittance_slip)->toBe('https://filipinohomes123.s3.amazonaws.com/pot.jpg')
        ->and(property_exists($rental, 'proof_of_transaction'))->toBeFalse()
        ->and((float) $rental->total_contract_price)->toBe(3500000.0);
});

test('brokerage sales link to a brokerage area imported from the legacy brokerage developer', function () {
    $id = ($this->sale)(['devid' => 14, 'prop_details' => json_encode(['lot_area' => '120']), 'files' => 'proofoftrans/9/slip.jpg']);

    $result = ($this->import)();

    $brokerage = DB::table('agent_brokerage_transactions')->where('agent_transaction_id', $id)->first();

    expect(AgentTransaction::find($id)->sale_type)->toBe('brokerage')
        ->and(DB::table('brokerage_areas')->where('id', 14)->value('name'))->toBe('Cebu Brokerage')
        ->and((int) $brokerage->brokerage_area_id)->toBe(14)
        ->and((float) $brokerage->lot_area)->toBe(120.0)
        ->and($brokerage->remittance_slip)->toBe('https://leuteriorealty.com/proofoftrans/9/slip.jpg')
        ->and(property_exists($brokerage, 'proof_of_transaction'))->toBeFalse()
        ->and(DB::table('developers')->where('id', 14)->exists())->toBeFalse()
        ->and($result['stats']['brokerage_areas'])->toBe(1);
});

test('deleted sales are skipped, cancelled ones are marked, and unknown agents stay empty', function () {
    ($this->sale)(['devid' => 10, 'deleted' => 1]);
    $cancelled = ($this->sale)(['devid' => 10, 'status' => 'Cancelled', 'validSale' => 'No']);
    $orphan = ($this->sale)(['devid' => 10, 'agentid' => 123456]);
    $partial = ($this->sale)(['devid' => 10, 'status' => 'Partial ', 'validSale' => '']);

    $result = ($this->import)();

    expect(AgentTransaction::count())->toBe(3)
        ->and(AgentTransaction::find($cancelled)->sale_status)->toBe('cancelled')
        ->and(AgentTransaction::find($orphan)->agent_id)->toBeNull()
        ->and(AgentTransaction::find($partial)->only(['commission_status', 'sale_status']))->toBe(['commission_status' => 'Partially Claimed', 'sale_status' => 'pending'])
        ->and($result['stats'])->toMatchArray(['deleted_skipped' => 1, 'agent_not_found' => 1, 'cancelled' => 1]);
});

test('a dry run saves nothing and re-running does not duplicate', function () {
    ($this->sale)(['devid' => 10]);
    ($this->sale)(['devid' => 651]);

    ($this->import)(true);
    expect(AgentTransaction::count())->toBe(0)->and(DB::table('brokerage_areas')->count())->toBe(0);

    ($this->import)();
    $again = ($this->import)();

    expect(AgentTransaction::count())->toBe(2)
        ->and(DB::table('agent_transaction_details')->count())->toBe(2)
        ->and($again['stats']['already_imported'])->toBe(2);
});

test('the legacy change history is kept as update_logs', function () {
    $history = [
        ['user' => 'staff@example.com', 'updated_at' => '2025-03-20 10:00:00', 'description' => 'Updated sale status', 'details' => ['status' => 'Full Claimed']],
        ['user' => 'admin@example.com', 'updated_at' => '2025-03-21 09:30:00', 'description' => 'Uploaded file', 'file' => 'proofoftrans/1/a.jpg'],
    ];
    $withLogs = ($this->sale)(['devid' => 10, 'logs' => json_encode($history)]);
    $empty = ($this->sale)(['devid' => 10, 'logs' => '[]']);
    $broken = ($this->sale)(['devid' => 10, 'logs' => 'not json']);

    $result = ($this->import)();

    expect(json_decode(AgentTransaction::find($withLogs)->getRawOriginal('update_logs'), true))->toBe($history)
        ->and(AgentTransaction::find($empty)->getRawOriginal('update_logs'))->toBeNull()
        ->and(AgentTransaction::find($broken)->getRawOriginal('update_logs'))->toBeNull()
        ->and($result['stats']['with_update_logs'])->toBe(1);
});

test('sales reserved before 4 Jan 2017 with a blank validSale are valid; invalid and cancelled ones stay so', function () {
    $blankOld = ($this->sale)(['devid' => 10, 'reservationdate' => '01/03/2017', 'validSale' => '']);
    $nullOld = ($this->sale)(['devid' => 10, 'reservationdate' => '06/15/2010', 'validSale' => null]);
    $invalidOld = ($this->sale)(['devid' => 10, 'reservationdate' => '06/15/2010', 'validSale' => 'No']);
    $cancelledOld = ($this->sale)(['devid' => 10, 'reservationdate' => '06/15/2010', 'validSale' => '', 'status' => 'Cancelled']);
    $blankNew = ($this->sale)(['devid' => 10, 'reservationdate' => '01/04/2017', 'validSale' => '']);

    ($this->import)();

    expect(AgentTransaction::find($blankOld)->sale_status)->toBe('valid')
        ->and(AgentTransaction::find($nullOld)->sale_status)->toBe('valid')
        ->and(AgentTransaction::find($invalidOld)->sale_status)->toBe('invalid')
        ->and(AgentTransaction::find($cancelledOld)->sale_status)->toBe('cancelled')
        ->and(AgentTransaction::find($blankNew)->sale_status)->toBe('pending');
});
