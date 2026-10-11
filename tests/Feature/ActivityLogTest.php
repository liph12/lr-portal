<?php

use App\Models\ActivityLog;
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

    $this->superadmin = User::factory()->create(['name' => 'Philip Libres', 'email' => 'philip@example.com', 'password' => 'secret-pass']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
});

function seedSaleCatalogue(): array
{
    $developerId = DB::table('developers')->insertGetId(['name' => 'Cebu Landmasters Inc.']);
    $typeId = DB::table('project_property_types')->insertGetId(['name' => 'Condominiums']);
    $projectId = DB::table('developer_projects')->insertGetId([
        'developer_id' => $developerId,
        'name' => 'Mivela Garden Residences',
        'project_property_type_id' => $typeId,
    ]);

    return [
        'client_firstname' => 'Juan',
        'client_lastname' => 'Dela Cruz',
        'client_mobile' => '09171234567',
        'client_country' => 'PH',
        'developer_id' => $developerId,
        'developer_project_id' => $projectId,
        'unit_no' => '12B',
        'project_property_type_id' => $typeId,
        'unit_type' => 'Studio',
        'floor_area' => '28.5',
        'total_contract_price' => '3500000',
        'reservation_date' => '2026-10-01',
        'payment_terms' => '12 Months',
        'commission_status' => 'Unclaimed',
        'proof_of_transaction' => UploadedFile::fake()->image('pot.jpg', 800, 600),
    ];
}

test('recording a sale writes one log row describing it', function () {
    $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/project', seedSaleCatalogue())
        ->assertSessionHasNoErrors();

    $log = ActivityLog::sole();
    $sale = AgentTransaction::sole();

    expect($log->action)->toBe('sale.project.recorded')
        ->and($log->description)->toBe("Recorded project sale #{$sale->id}: Mivela Garden Residences, unit 12B")
        ->and($log->outcome)->toBe(ActivityLog::OUTCOME_SUCCESS)
        ->and($log->status_code)->toBe(302)
        ->and($log->method)->toBe('POST')
        ->and($log->route_name)->toBe('dashboard.record-sale.project.store')
        ->and($log->user_id)->toBe($this->superadmin->id)
        ->and($log->user_email)->toBe('philip@example.com')
        ->and($log->subject->is($sale))->toBeTrue()
        ->and($log->properties['proof_of_transaction'])->toBe($sale->projectTransaction->proof_of_transaction)
        ->and($log->payload['client_lastname'])->toBe('Dela Cruz')
        ->and($log->payload['proof_of_transaction'])->toMatchArray(['file' => 'pot.jpg', 'mime' => 'image/jpeg'])
        ->and($log->duration_ms)->toBeInt();
});

test('failed validation is logged with what was submitted', function () {
    $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/project', ['client_firstname' => 'Juan'])
        ->assertSessionHasErrors();

    $log = ActivityLog::sole();
    expect($log->outcome)->toBe(ActivityLog::OUTCOME_VALIDATION_FAILED)
        ->and($log->action)->toBe('dashboard.record-sale.project.store')
        ->and($log->payload)->toBe(['client_firstname' => 'Juan'])
        ->and($log->subject_id)->toBeNull();
});

test('sign-in attempts are logged without the password', function () {
    $this->post('/login-attempt', ['email' => 'philip@example.com', 'password' => 'wrong-pass']);
    $this->post('/login-attempt', ['email' => 'philip@example.com', 'password' => 'secret-pass']);

    [$failed, $ok] = ActivityLog::orderBy('id')->get();

    expect($failed->action)->toBe('auth.login_failed')
        ->and($failed->outcome)->toBe(ActivityLog::OUTCOME_VALIDATION_FAILED)
        ->and($failed->user_id)->toBeNull()
        ->and($failed->description)->toBe('Failed sign-in for philip@example.com')
        ->and($failed->payload['password'])->toBe('[redacted]')
        ->and($ok->action)->toBe('auth.login')
        ->and($ok->outcome)->toBe(ActivityLog::OUTCOME_SUCCESS)
        ->and($ok->user_id)->toBe($this->superadmin->id)
        ->and($ok->payload['password'])->toBe('[redacted]');

    expect(DB::table('activity_logs')->where('payload', 'like', '%secret-pass%')->orWhere('payload', 'like', '%wrong-pass%')->exists())->toBeFalse();
});

test('sign-out is attributed to the user who signed out', function () {
    $this->actingAs($this->superadmin)->post('/logout');

    $log = ActivityLog::sole();
    expect($log->action)->toBe('auth.logout')
        ->and($log->user_id)->toBe($this->superadmin->id);
});

test('blocked requests are logged as forbidden', function () {
    $staff = User::factory()->create();
    $staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));

    $this->actingAs($staff)->post('/dashboard/record-sale/project', []);

    expect(ActivityLog::sole())
        ->outcome->toBe(ActivityLog::OUTCOME_FORBIDDEN)
        ->status_code->toBe(403)
        ->user_id->toBe($staff->id);
});

test('page views are not logged by default', function () {
    $this->actingAs($this->superadmin)->get('/dashboard/main');

    expect(ActivityLog::count())->toBe(0);
});

test('logs past the retention window are pruned', function () {
    config(['activity_log.retention_days' => 30]);
    $this->actingAs($this->superadmin)->post('/logout');
    ActivityLog::query()->update(['created_at' => now()->subDays(31)]);
    $this->actingAs($this->superadmin)->post('/logout');

    $this->artisan('model:prune', ['--model' => [ActivityLog::class]])->assertSuccessful();

    expect(ActivityLog::count())->toBe(1);
});

test('a new sale stores the client\'s age on the reservation date, from the birthdate', function () {
    $this->actingAs($this->superadmin)
        ->post('/dashboard/record-sale/project', ['client_birthdate' => '1990-10-02'] + seedSaleCatalogue())
        ->assertSessionHasNoErrors();

    // Reserved 2026-10-01, the day before the client turns 36.
    expect(AgentTransaction::sole()->detail->client_age)->toBe(35);
});
