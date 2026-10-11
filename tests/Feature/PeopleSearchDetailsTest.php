<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 09:00:00');
    $roles = collect(['superadmin' => 'Superadmin', 'team_leader' => 'Team Leader', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));
    $this->superadmin = User::factory()->create(['name' => 'Sam Admin']);
    $this->superadmin->roles()->attach($roles['superadmin']);

    $this->juan = User::factory()->create(['name' => 'Juan Dela Cruz', 'email' => 'juan@example.com', 'last_active_at' => '2026-09-30 10:00:00']);
    $this->juan->roles()->attach($roles['agent']);
    $this->agent = DB::table('agents')->insertGetId(['user_id' => $this->juan->id, 'email' => $this->juan->email, 'mobile' => '09171234567', 'address' => '12 Osmeña Blvd', 'city' => 'Cebu City',
        'created_at' => '2025-01-15 08:00:00', 'activated_at' => '2026-01-10 00:00:00']);
    DB::table('agent_credentials')->insert(['agent_id' => $this->agent, 'prc_expiration' => '2027-05-31', 'dhsud_expiration' => '2026-01-31']);
    DB::table('agent_attributes')->insert(['agent_id' => $this->agent, 'fire_certificates' => 3]);
    $team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->agent, 'status' => 'active']);
    $unit = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Alpha Unit', 'agent_id' => $this->agent, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->agent, 'joined_at' => '2025-02-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $this->agent, 'joined_at' => '2025-03-01', 'status' => 'active']);
    // A sale in June restarts the 6 months: until 2026-12-15.
    $t = AgentTransaction::create(['agent_id' => $this->agent, 'sale_type' => 'rental', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_rental_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 1, 'reservation_date' => '2026-06-15', 'commission_received' => 0]);
});

afterEach(fn () => Carbon::setTestNow());

test('people results carry team / sub-team, joined, registered, last activity, licences, contact and the activity window', function () {
    $this->actingAs($this->superadmin)->getJson('/search/users?q=juan')
        ->assertOk()
        ->assertJsonPath('users.0.last_active_at', '2026-09-30 10:00:00')
        ->assertJsonPath('users.0.details.team', 'Alpha')
        ->assertJsonPath('users.0.details.sub_team', 'Alpha Unit')
        ->assertJsonPath('users.0.details.team_joined', '2025-02-01')
        ->assertJsonPath('users.0.details.sub_team_joined', '2025-03-01')
        ->assertJsonPath('users.0.details.registered', '2025-01-15')
        ->assertJsonPath('users.0.details.mobile', '09171234567')
        ->assertJsonPath('users.0.details.address', '12 Osmeña Blvd, Cebu City')
        ->assertJsonPath('users.0.details.prc_expiration', '2027-05-31')
        ->assertJsonPath('users.0.details.dhsud_expiration', '2026-01-31')
        ->assertJsonPath('users.0.details.activity.last_sale', '2026-06-15')
        ->assertJsonPath('users.0.details.activity.ends_on', '2026-12-15')
        ->assertJsonPath('users.0.details.activity.days_left', 64);
});

test('FIRE certificates come from the training site: at most 3, course / date / score only', function () {
    Http::fake(['realestatetraining.ph/*' => Http::response(['user' => ['cellphone' => '0999', 'score' => collect(range(1, 5))->map(fn ($i) => [
        'courseid' => $i, 'score' => 9 + $i % 2, 'dateTaken' => "2025-0{$i}-10", 'course' => ['cname' => "Course {$i}"],
    ])->all()]])]);

    $this->actingAs($this->superadmin)->getJson("/search/users/{$this->juan->id}/certificates")
        ->assertOk()
        ->assertJsonPath('total', 5)
        ->assertJsonCount(3, 'certificates')
        ->assertJsonPath('certificates.0', ['course' => 'Course 5', 'taken_on' => '2025-05-10', 'score' => 10])
        ->assertJsonMissing(['cellphone' => '0999']);
    Http::assertSent(fn ($r) => str_ends_with($r->url(), '/get-certificates/juan%40example.com'));
});

test('certificates follow the search reach and say so when the site is down', function () {
    Http::fake(['realestatetraining.ph/*' => Http::response('down', 500)]);
    $this->actingAs($this->superadmin)->getJson("/search/users/{$this->juan->id}/certificates")->assertStatus(503)->assertJsonStructure(['message']);

    // A leader of another team can't look Juan up.
    $leaderUser = User::factory()->create();
    $leaderUser->roles()->attach(Role::where('name', 'team_leader')->first());
    $leader = DB::table('agents')->insertGetId(['user_id' => $leaderUser->id, 'email' => $leaderUser->email]);
    DB::table('teams')->insert(['name' => 'Bravo', 'agent_id' => $leader, 'status' => 'active']);
    $this->actingAs($leaderUser)->getJson("/search/users/{$this->juan->id}/certificates")->assertForbidden();
});

test('last activity comes from the legacy account (latest update per email)', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('users', function (Blueprint $t) {
        $t->id();
        $t->string('email')->nullable();
        $t->timestamp('updated_at')->nullable();
    });
    DB::connection('legacy')->table('users')->insert([
        ['email' => 'JUAN@example.com', 'updated_at' => '2026-10-01 08:00:00'],
        ['email' => 'juan@example.com', 'updated_at' => '2025-01-01 08:00:00'],
    ]);

    $this->artisan('legacy:import-last-activity')->assertSuccessful();
    expect((string) DB::table('users')->where('id', $this->juan->id)->value('last_active_at'))->toBe('2026-10-01 08:00:00');
});

test('"registered" is the day they joined Leuterio Realty, else the portal sign-up; the profile shows both', function () {
    $this->actingAs($this->superadmin)->getJson('/search/users?q=juan')->assertJsonPath('users.0.details.registered', '2025-01-15');

    DB::table('agents')->where('id', $this->agent)->update(['lr_joined_at' => '2019-06-01']);
    $this->actingAs($this->superadmin)->getJson('/search/users?q=juan')->assertJsonPath('users.0.details.registered', '2019-06-01');
    $this->actingAs($this->superadmin)->get("/agents/{$this->agent}")
        ->assertInertia(fn ($page) => $page->where('details.joined_lr', '2019-06-01')->where('details.signed_up', '2025-01-15'));
});

test('legacy lr_joined is copied to agents (0000-00-00 means none)', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('members', function (Blueprint $t) {
        $t->id();
        $t->string('lr_joined')->nullable();
    });
    $zero = User::factory()->create();
    $other = DB::table('agents')->insertGetId(['user_id' => $zero->id, 'email' => $zero->email]);
    DB::connection('legacy')->table('members')->insert([['id' => $this->agent, 'lr_joined' => '2018-03-20'], ['id' => $other, 'lr_joined' => '0000-00-00']]);

    $this->artisan('legacy:import-lr-joined')->assertSuccessful();
    expect((string) DB::table('agents')->where('id', $this->agent)->value('lr_joined_at'))->toStartWith('2018-03-20')
        ->and(DB::table('agents')->where('id', $other)->value('lr_joined_at'))->toBeNull();
});

test('the search gives a working Facebook link, cleaned from whatever was typed (or none)', function (?string $typed, ?string $link) {
    DB::table('agent_profiles')->insert(['agent_id' => $this->agent, 'facebook' => $typed]);

    $this->actingAs($this->superadmin)->getJson('/search/users?q=juan')->assertJsonPath('users.0.details.facebook', $link);
})->with([
    'full link' => ['https://www.facebook.com/juan.cruz', 'https://www.facebook.com/juan.cruz'],
    'no https' => ['facebook.com/juan.cruz', 'https://facebook.com/juan.cruz'],
    'username with a dot' => ['juan.cruz', 'https://www.facebook.com/juan.cruz'],
    'a name, not a link' => ['Juan Dela Cruz', null],
    'another site' => ['https://instagram.com/juan', null],
    'just the site' => ['facebook.com', null],
    'blank-ish' => ['n/a', null],
    'nothing' => [null, null],
]);

test('each person shows how many sales they have (valid or pending, not invalid)', function () {
    // The June rental (valid) from setup, plus one pending and one invalid.
    foreach (['pending', 'invalid'] as $status) {
        $t = AgentTransaction::create(['agent_id' => $this->agent, 'sale_type' => 'rental', 'commission_status' => 'Unclaimed', 'sale_status' => $status]);
        DB::table('agent_rental_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 1, 'reservation_date' => '2026-07-01', 'commission_received' => 0]);
    }

    $this->actingAs($this->superadmin)->getJson('/search/users?q=juan')->assertJsonPath('users.0.details.sales', 2);
});
