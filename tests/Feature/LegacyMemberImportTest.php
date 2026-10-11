<?php

use App\Models\Entities\Agent;
use App\Models\Role;
use App\Models\User;
use App\Services\Legacy\LegacyMemberImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

// A throwaway stand-in for the old database: just the tables and columns the importer reads.
beforeEach(function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $legacy = Schema::connection('legacy');

    $legacy->create('roles', function (Blueprint $t) {
        $t->integer('id');
        $t->string('role');
    });
    $legacy->create('users', function (Blueprint $t) {
        $t->id();
        $t->string('email')->nullable();
        $t->string('password')->nullable();
        $t->integer('role_id')->nullable();
    });
    $legacy->create('members', function (Blueprint $t) {
        $t->id();
        foreach (['memberid', 'inviterid', 'gender', 'dateactivated', 'nao_video_tracker', 'fire_certs_count'] as $c) {
            $t->integer($c)->nullable();
        }
        foreach (['email', 'fn', 'mn', 'ln', 'completename', 'status', 'membertype', 'hashpass', 'password', 'maritalstatus',
            'phone', 'mobile', 'address', 'city', 'state', 'photo', 'aboutyourself', 'specialskills', 'workexperience',
            'fblink', 'tin', 'nao_proof_of_attendance', 'nao_attendance_confirmation', 'nao_date_attended', 'prc_expiry', 'dshud_expiry'] as $c) {
            $t->text($c)->nullable();
        }
        $t->timestamps();
    });

    DB::connection('legacy')->table('roles')->insert([
        ['id' => 4, 'role' => 'AGENT'], ['id' => 7, 'role' => 'UNIT MANAGER'], ['id' => 11, 'role' => 'CLIENT'],
    ]);

    $this->bcrypt = Hash::make('OldPassword1');

    $this->member = function (array $attrs) {
        return DB::connection('legacy')->table('members')->insertGetId(array_merge([
            'status' => 'active', 'gender' => 1, 'nao_video_tracker' => 0, 'fire_certs_count' => 0,
            'created_at' => '2025-03-01 10:00:00', 'updated_at' => '2025-03-01 10:00:00',
        ], $attrs));
    };
    $this->account = fn (string $email, int $roleId, ?string $password = null) => DB::connection('legacy')->table('users')
        ->insert(['email' => $email, 'password' => $password ?? $this->bcrypt, 'role_id' => $roleId]);

    $this->import = fn (bool $dryRun = false) => (new LegacyMemberImporter)->run($dryRun);
});

test('a member becomes a user + agent with only the columns the new schema has', function () {
    $sponsor = ($this->member)(['email' => 'sponsor@example.com', 'fn' => 'Ana', 'ln' => 'Reyes', 'memberid' => 500]);
    ($this->account)('sponsor@example.com', 4);

    $juanId = ($this->member)([
        'email' => '  Juan@Example.com ', 'fn' => 'JUAN', 'mn' => 'Santos', 'ln' => 'DELA CRUZ', 'memberid' => 777,
        'inviterid' => $sponsor, 'gender' => 0, 'maritalstatus' => 'Married', 'mobile' => '09171234567',
        'address' => '123 Osmeña Blvd', 'city' => 'Cebu City', 'state' => 'Cebu', 'photo' => 'me 1.jpg',
        'aboutyourself' => str_repeat('a', 300), 'specialskills' => 'Condos', 'fblink' => 'https://facebook.com/juan',
        'tin' => '123 456 789', 'dateactivated' => 1735689600, 'nao_video_tracker' => 3, 'fire_certs_count' => 2,
        'nao_date_attended' => '2025-02-10', 'nao_attendance_confirmation' => 'confirmed',
        'prc_expiry' => '2027-05-31', 'dshud_expiry' => '0206-09-25',
    ]);
    ($this->account)('juan@example.com', 7);

    $result = ($this->import)();

    $user = User::where('email', 'juan@example.com')->sole();
    $agent = Agent::with('profile')->where('user_id', $user->id)->sole();
    $attributes = DB::table('agent_attributes')->where('agent_id', $agent->id)->first();

    expect($user->name)->toBe('Juan Dela Cruz')
        ->and($user->status)->toBe('active')
        ->and(Hash::check('OldPassword1', $user->password))->toBeTrue()
        ->and($user->roles()->pluck('name')->all())->toBe(['unit_manager'])
        ->and($agent->only(['first_name', 'middle_name', 'last_name', 'city', 'state', 'mobile', 'marital_status']))->toBe([
            'first_name' => 'Juan', 'middle_name' => 'Santos', 'last_name' => 'Dela Cruz',
            'city' => 'Cebu City', 'state' => 'Cebu', 'mobile' => '09171234567', 'marital_status' => 'Married',
        ])
        ->and($agent->gender)->toBeFalse()
        ->and($agent->avatar)->toBe('https://leuteriorealty.com/memberfiles/777/me%201.jpg')
        ->and(mb_strlen($agent->profile->about))->toBe(255)
        ->and($agent->profile->facebook)->toBe('https://facebook.com/juan')
        ->and(DB::table('agent_credentials')->where('agent_id', $agent->id)->value('tax_identification_no'))->toBe('123456789')
        ->and($attributes->date_activated)->toStartWith('2025-01-01')
        ->and((int) $attributes->nao_video_tracker)->toBe(3)
        ->and((int) $attributes->fire_certificates)->toBe(2)
        ->and($attributes->nao_attendance_status)->toBe('confirmed')
        ->and($agent->id)->toBe($juanId)
        ->and((int) $attributes->referral_id)->toBe($sponsor)
        ->and(Agent::where('email', 'sponsor@example.com')->value('id'))->toBe($sponsor)
        ->and(DB::table('agent_credentials')->where('agent_id', $agent->id)->value('prc_expiration'))->toBe('2027-05-31')
        ->and(DB::table('agent_credentials')->where('agent_id', $agent->id)->value('dhsud_expiration'))->toBeNull();

    expect($result['stats'])->toMatchArray(['imported' => 2, 'passwords_kept' => 2, 'sponsors_linked' => 1, 'text_truncated' => 1]);
});

test('members the old system never gave a status are imported as inactive', function () {
    ($this->member)(['email' => 'pending@example.com', 'fn' => 'Pending', 'status' => null]);
    ($this->account)('pending@example.com', 4);

    ($this->import)();

    expect(User::where('email', 'pending@example.com')->value('status'))->toBe('inactive');
});

test('without a legacy account, membertype gives the role and a non-bcrypt hash locks the password', function () {
    ($this->member)(['email' => 'old@example.com', 'fn' => 'Old', 'membertype' => 'superadmin', 'hashpass' => str_repeat('a', 65)]);

    $result = ($this->import)();
    $user = User::where('email', 'old@example.com')->sole();

    expect($user->roles()->pluck('name')->all())->toBe(['admin'])
        ->and($user->password)->not->toBe(str_repeat('a', 65))
        ->and($result['stats']['passwords_locked'])->toBe(1);
});

test('duplicate emails keep the newest record; bad emails and clients are rejected', function () {
    ($this->member)(['email' => 'dup@example.com', 'fn' => 'Older', 'updated_at' => '2023-01-01 00:00:00']);
    ($this->member)(['email' => 'DUP@example.com', 'fn' => 'Newer', 'updated_at' => '2026-01-01 00:00:00']);
    ($this->member)(['email' => 'not-an-email', 'fn' => 'Bad']);
    ($this->member)(['email' => '', 'fn' => 'Empty']);
    ($this->member)(['email' => 'client@example.com', 'fn' => 'Client']);
    ($this->account)('client@example.com', 11);

    $result = ($this->import)();

    expect(Agent::where('email', 'dup@example.com')->value('first_name'))->toBe('Newer')
        ->and(User::count())->toBe(1)
        ->and(collect($result['rejects'])->pluck(2)->all())->toEqualCanonicalizing([
            'duplicate email; a newer member record with this email was imported',
            'missing or invalid email',
            'missing or invalid email',
            'legacy role CLIENT is not an agent',
        ]);
});

test('existing portal accounts and agent profiles are never overwritten', function () {
    $staff = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $portalUser = User::factory()->create(['email' => 'philip@example.com', 'name' => 'Philip Libres', 'password' => 'PortalPass1']);
    $portalUser->roles()->attach($staff);
    $portalUser->agent()->create(['first_name' => 'Philip', 'email' => 'philip@example.com', 'city' => 'Mandaue']);

    ($this->member)(['email' => 'philip@example.com', 'fn' => 'Someone', 'ln' => 'Else', 'city' => 'Davao']);
    ($this->account)('philip@example.com', 4);

    $result = ($this->import)();
    $portalUser->refresh();

    expect(Hash::check('PortalPass1', $portalUser->password))->toBeTrue()
        ->and($portalUser->name)->toBe('Philip Libres')
        ->and($portalUser->roles()->pluck('name')->all())->toBe(['staff'])
        ->and($portalUser->agent->city)->toBe('Mandaue')
        ->and($result['stats']['existing_account'])->toBe(1);
});

test('a dry run saves nothing, and re-running does not duplicate', function () {
    ($this->member)(['email' => 'juan@example.com', 'fn' => 'Juan']);
    ($this->account)('juan@example.com', 7);

    ($this->import)(true);
    expect(User::count())->toBe(0)
        ->and(Agent::count())->toBe(0)
        ->and(Role::where('name', 'unit_manager')->exists())->toBeFalse();

    ($this->import)();
    ($this->import)();
    expect(User::count())->toBe(1)->and(Agent::count())->toBe(1)->and(DB::table('agent_attributes')->count())->toBe(1);
});

test('agents keep their legacy member id, and new agents continue after the highest one', function () {
    DB::connection('legacy')->table('members')->insert([
        ['id' => 218171408, 'email' => 'big@example.com', 'fn' => 'Big', 'status' => 'active', 'gender' => 1, 'nao_video_tracker' => 0, 'fire_certs_count' => 0, 'inviterid' => 999999999],
    ]);

    ($this->import)();

    expect(Agent::where('email', 'big@example.com')->value('id'))->toBe(218171408)
        // referral_id is the legacy inviterid as-is, even when that inviter wasn't imported.
        ->and((int) DB::table('agent_attributes')->where('agent_id', 218171408)->value('referral_id'))->toBe(999999999);

    $later = User::factory()->create();
    expect($later->agent()->create(['email' => 'new@example.com'])->id)->toBeGreaterThan(218171408);
});

test('a portal user\'s existing agent row is moved onto their legacy member id', function () {
    $portalUser = User::factory()->create(['email' => 'philip@example.com']);
    $old = $portalUser->agent()->create(['first_name' => 'Philip', 'email' => 'philip@example.com', 'city' => 'Mandaue']);
    $old->profile()->create(['about' => 'Kept']);
    // A legacy id unlike the auto-increment one, as in real data (Philip is member 218171408).
    $memberId = ($this->member)(['id' => 218171408, 'email' => 'philip@example.com', 'fn' => 'Someone']);

    $result = ($this->import)();

    $agent = Agent::where('email', 'philip@example.com')->sole();
    expect($agent->id)->toBe($memberId)
        ->and($agent->city)->toBe('Mandaue')
        ->and($agent->profile->about)->toBe('Kept')
        ->and(Agent::find($old->id))->toBeNull()
        ->and($result['stats']['agents_renumbered'])->toBe(1);
});

test('legacy supervisors become team leaders', function () {
    DB::connection('legacy')->table('roles')->insert(['id' => 9, 'role' => 'SUPERVISOR']);
    ($this->member)(['email' => 'lead@example.com', 'fn' => 'Lead']);
    ($this->account)('lead@example.com', 9);
    ($this->member)(['email' => 'old-lead@example.com', 'fn' => 'Old', 'membertype' => 'supervisor']);

    ($this->import)();

    expect(User::where('email', 'lead@example.com')->sole()->roles()->pluck('name')->all())->toBe(['team_leader'])
        ->and(User::where('email', 'old-lead@example.com')->sole()->roles()->pluck('name')->all())->toBe(['team_leader'])
        ->and(Role::where('name', 'supervisor')->exists())->toBeFalse();
});
