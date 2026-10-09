<?php

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
        'files' => [
            UploadedFile::fake()->image('reservation.jpg', 3000, 2000),
            UploadedFile::fake()->createWithContent('term-sheet.pdf', "%PDF-1.4\n".str_repeat("1 0 obj << /Type /Page >> endobj\n", 2000)),
        ],
    ], $overrides);
}

test('a superadmin records a project sale with compressed files on the sale disk', function () {
    $response = $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId));

    $response->assertRedirect(route('superadmin.record-sale'))
        ->assertSessionHas('success')
        ->assertSessionHasNoErrors();

    $sale = AgentTransaction::with(['detail', 'projectTransaction', 'files'])->sole();

    expect($sale->recorded_by)->toBe($this->superadmin->id)
        ->and($sale->agent_id)->toBeNull()
        ->and($sale->sale_type)->toBe('project')
        ->and($sale->unit_number)->toBe('Tower 1 - 12B')
        ->and($sale->term_of_payment)->toBe('12 Months')
        ->and($sale->detail->client_last_name)->toBe('Dela Cruz')
        ->and($sale->detail->client_country)->toBe('PH')
        ->and($sale->projectTransaction->developer_id)->toBe($this->developerId)
        ->and($sale->projectTransaction->developer_project_id)->toBe($this->projectId)
        ->and($sale->projectTransaction->project_name)->toBe('Mivela Garden Residences')
        ->and($sale->projectTransaction->project_property_type_id)->toBe($this->condoTypeId)
        ->and($sale->projectTransaction->total_contract_price)->toBe(3500000.0)
        ->and($sale->files)->toHaveCount(2);

    $image = $sale->files->firstWhere('original_name', 'reservation.jpg');
    $pdf = $sale->files->firstWhere('original_name', 'term-sheet.pdf');

    Storage::disk('s3')->assertExists([$image->path, $pdf->path]);

    $stored = imagecreatefromstring(Storage::disk('s3')->get($image->path));
    expect(max(imagesx($stored), imagesy($stored)))->toBe(2400)
        ->and($image->mime_type)->toBe('image/jpeg');

    expect($pdf->content_encoding)->toBe('gzip')
        ->and($pdf->stored_size)->toBeLessThan($pdf->original_size)
        ->and(gzdecode(Storage::disk('s3')->get($pdf->path)))->toStartWith('%PDF-1.4');
});

test('missing fields and files are rejected with nothing stored', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'client_firstname' => '',
            'developer_id' => 999999,
            'files' => [],
        ]))
        ->assertSessionHasErrors(['client_firstname', 'developer_id', 'files']);

    expect(AgentTransaction::count())->toBe(0);
    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('disallowed file types are rejected', function () {
    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'files' => [UploadedFile::fake()->createWithContent('payload.html', '<html><script>alert(1)</script></html>')],
        ]))
        ->assertSessionHasErrors('files.0');

    expect(AgentTransaction::count())->toBe(0);
});

test('a failed upload rolls back the sale and removes files already sent', function () {
    $realDisk = Storage::disk('s3');
    $puts = 0;
    $flakyDisk = Mockery::mock($realDisk)->makePartial();
    $flakyDisk->shouldReceive('put')->andReturnUsing(function ($path, $contents, $options = []) use ($realDisk, &$puts) {
        return ++$puts === 1 ? $realDisk->put($path, $contents, $options) : false;
    });
    $flakyDisk->shouldReceive('delete')->andReturnUsing(fn ($paths) => $realDisk->delete($paths));
    Storage::set('s3', $flakyDisk);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertServerError();

    expect($puts)->toBe(2)
        ->and(AgentTransaction::count())->toBe(0)
        ->and($realDisk->allFiles())->toBeEmpty();
});

test('users without the superadmin role cannot record sales', function () {
    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));

    $this->actingAs($staff)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId))
        ->assertForbidden();

    expect(AgentTransaction::count())->toBe(0);
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
            'files' => [new UploadedFile($path, 'term-sheet.docx', null, null, true)],
        ]))
        ->assertSessionHasNoErrors();

    $file = AgentTransaction::sole()->files->sole();
    expect($file->original_name)->toBe('term-sheet.docx');
    Storage::disk('s3')->assertExists($file->path);
});

test('files up to 20MB are accepted and larger ones are rejected', function () {
    $pdf = fn (string $name, int $bytes) => UploadedFile::fake()->createWithContent(
        $name,
        "%PDF-1.4\n".str_repeat("1 0 obj << /Type /Page >> endobj\n", intdiv($bytes, 34)),
    );

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'files' => [$pdf('big.pdf', 19 * 1024 * 1024)],
        ]))
        ->assertSessionHasNoErrors();

    $file = AgentTransaction::sole()->files->sole();
    expect($file->original_size)->toBeGreaterThan(19 * 1000 * 1000)
        ->and($file->stored_size)->toBeLessThan($file->original_size / 10);

    $this->actingAs($this->superadmin)
        ->post('/superadmin/dashboard/record-sale/project', projectSalePayload($this->developerId, [
            'files' => [$pdf('too-big.pdf', 21 * 1024 * 1024)],
        ]))
        ->assertSessionHasErrors(['files.0' => 'Each file must be 20MB or smaller.']);

    expect(AgentTransaction::count())->toBe(1);
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
