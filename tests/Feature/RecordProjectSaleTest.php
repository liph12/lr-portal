<?php

use App\Models\Entities\AgentProjectTransaction;
use App\Models\Entities\AgentTransaction;
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

    $this->developerId = DB::table('developers')->insertGetId(['name' => 'Cebu Landmasters Inc.']);
    $this->condoTypeId = DB::table('project_property_types')->insertGetId(['name' => 'Condominiums']);
    $this->projectId = DB::table('developer_projects')->insertGetId([
        'developer_id' => $this->developerId,
        'name' => 'Mivela Garden Residences',
        'project_property_type_id' => $this->condoTypeId,
    ]);

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
});

function projectSalePayload(int $developerId, array $overrides = []): array
{
    $projectId = DB::table('developer_projects')->where('developer_id', $developerId)->value('id');
    $typeId = DB::table('project_property_types')->where('name', 'Condominiums')->value('id');

    return array_merge([
        'client_firstname' => 'Juan',
        'client_middlename' => 'Santos',
        'client_lastname' => 'Dela Cruz',
        'client_email' => 'juan@example.com',
        'client_mobile' => '09171234567',
        'client_birthdate' => '1990-05-20',
        'client_gender' => 'Male',
        'client_country' => 'PH',
        'client_address' => 'Cebu City',
        'developer_id' => $developerId,
        'developer_project_id' => $projectId,
        'unit_no' => 'Tower 1 - 12B',
        'project_property_type_id' => $typeId,
        'unit_type' => 'Studio',
        'floor_area' => '28.50',
        'total_contract_price' => '3500000',
        'reservation_date' => '2026-10-01',
        'payment_terms' => '12 Months',
        'remarks' => 'Walk-in client',
        'commission_status' => 'Unclaimed',
        'proof_of_transaction' => UploadedFile::fake()->image('reservation.jpg', 3000, 2000),
    ], $overrides);
}

function fakePdf(string $name, int $bytes): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        $name,
        "%PDF-1.4\n".str_repeat("1 0 obj << /Type /Page >> endobj\n", intdiv($bytes, 34)),
    );
}

// The stored value is the disk's public URL; map it back to the object path to inspect the upload.
function storedPath(string $url): string
{
    return ltrim(str_replace(rtrim(Storage::disk('s3')->url(''), '/'), '', $url), '/');
}

test('a superadmin records a project sale with its proof of transaction url', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertRedirect(route('superadmin.record-sale'))
        ->assertSessionHas('success')
        ->assertSessionHasNoErrors();

    $sale = AgentTransaction::with(['detail', 'projectTransaction'])->sole();
    $project = $sale->projectTransaction;

    expect($sale->recorded_by)->toBe($this->superadmin->id)
        ->and($sale->agent_id)->toBeNull()
        ->and($sale->sale_type)->toBe('project')
        ->and($sale->unit_number)->toBe('Tower 1 - 12B')
        ->and($sale->term_of_payment)->toBe('12 Months')
        ->and($sale->detail->client_last_name)->toBe('Dela Cruz')
        ->and($sale->detail->client_country)->toBe('PH')
        ->and($project->developer_id)->toBe($this->developerId)
        ->and($project->developer_project_id)->toBe($this->projectId)
        ->and($project->project_name)->toBe('Mivela Garden Residences')
        ->and($project->project_property_type_id)->toBe($this->condoTypeId)
        ->and($project->total_contract_price)->toBe(3500000.0);

    $path = storedPath($project->proof_of_transaction);

    expect($project->proof_of_transaction)->toBe(Storage::disk('s3')->url($path))
        ->and($path)->toStartWith("sales/project/{$sale->id}/")
        ->and($path)->toEndWith('.jpg');

    Storage::disk('s3')->assertExists($path);
    expect(Storage::disk('s3')->allFiles())->toHaveCount(1);

    $stored = imagecreatefromstring(Storage::disk('s3')->get($path));
    expect(max(imagesx($stored), imagesy($stored)))->toBe(2400);
});

test('pdf proofs are gzipped before upload', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'proof_of_transaction' => fakePdf('term-sheet.pdf', 200_000),
        ]))
        ->assertSessionHasNoErrors();

    $contents = Storage::disk('s3')->get(storedPath(AgentProjectTransaction::sole()->proof_of_transaction));

    expect(strlen($contents))->toBeLessThan(200_000)
        ->and(gzdecode($contents))->toStartWith('%PDF-1.4');
});

test('word documents are accepted', function () {
    $path = tempnam(sys_get_temp_dir(), 'docx');
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::OVERWRITE);
    $zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    $zip->addFromString('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Term sheet</w:t></w:r></w:p></w:body></w:document>');
    $zip->close();

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'proof_of_transaction' => new UploadedFile($path, 'term-sheet.docx', null, null, true),
        ]))
        ->assertSessionHasNoErrors();

    Storage::disk('s3')->assertExists(storedPath(AgentProjectTransaction::sole()->proof_of_transaction));
});

test('missing fields and a missing proof are rejected with nothing stored', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'client_firstname' => '',
            'developer_id' => 999999,
            'proof_of_transaction' => null,
        ]))
        ->assertSessionHasErrors(['client_firstname', 'developer_id', 'proof_of_transaction']);

    expect(AgentTransaction::count())->toBe(0)
        ->and(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('disallowed file types are rejected', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'proof_of_transaction' => UploadedFile::fake()->createWithContent('payload.html', '<html><script>alert(1)</script></html>'),
        ]))
        ->assertSessionHasErrors('proof_of_transaction');

    expect(AgentTransaction::count())->toBe(0);
});

test('files up to 20MB are accepted and larger ones are rejected', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'proof_of_transaction' => fakePdf('big.pdf', 19 * 1024 * 1024),
        ]))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'proof_of_transaction' => fakePdf('too-big.pdf', 21 * 1024 * 1024),
        ]))
        ->assertSessionHasErrors(['proof_of_transaction' => 'The file must be 20MB or smaller.']);

    expect(AgentTransaction::count())->toBe(1);
});

test('a failed upload saves nothing', function () {
    $realDisk = Storage::disk('s3');
    $failingDisk = Mockery::mock($realDisk)->makePartial();
    $failingDisk->shouldReceive('put')->andReturn(false);
    Storage::set('s3', $failingDisk);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertServerError();

    expect(AgentTransaction::count())->toBe(0)
        ->and($realDisk->allFiles())->toBeEmpty();
});

test('a database failure after upload removes the uploaded file', function () {
    AgentProjectTransaction::creating(fn () => throw new RuntimeException('database went away'));

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertServerError();

    expect(AgentTransaction::count())->toBe(0)
        ->and(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('users without the superadmin role cannot record sales', function () {
    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));

    $this->actingAs($staff)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertForbidden();

    expect(AgentTransaction::count())->toBe(0);
});

test('a project that is not listed can be recorded by name', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'developer_project_id' => '',
            'project_name' => 'Brand New Tower',
        ]))
        ->assertSessionHasNoErrors();

    $project = AgentTransaction::sole()->projectTransaction;
    expect($project->developer_project_id)->toBeNull()
        ->and($project->project_name)->toBe('Brand New Tower');
});

test('a project from another developer, or no project at all, is rejected', function () {
    $otherDeveloper = DB::table('developers')->insertGetId(['name' => 'Other Developer']);
    $otherProject = DB::table('developer_projects')->insertGetId([
        'developer_id' => $otherDeveloper,
        'name' => 'Somewhere Else',
    ]);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'developer_project_id' => $otherProject,
        ]))
        ->assertSessionHasErrors(['developer_project_id' => 'That project does not belong to the selected developer.']);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'developer_project_id' => '',
            'project_name' => '',
            'project_property_type_id' => 999,
        ]))
        ->assertSessionHasErrors(['project_name', 'project_property_type_id']);

    expect(AgentTransaction::count())->toBe(0);
});

test('deleting a catalogue project keeps the recorded sale', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertSessionHasNoErrors();

    DB::table('developer_projects')->where('id', $this->projectId)->delete();

    $project = AgentTransaction::sole()->projectTransaction;
    expect($project->developer_project_id)->toBeNull()
        ->and($project->project_name)->toBe('Mivela Garden Residences');
});
