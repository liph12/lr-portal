<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    $roles = collect(['superadmin' => 'Superadmin', 'staff' => 'Staff', 'unit_manager' => 'Unit Manager', 'agent' => 'Agent', 'global_partner' => 'Global Partner'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));
    // As in production: sponsors' roles may open Global Partners › Statistics (their own recruits).
    $this->statsPermission = Permission::firstOrCreate(['name' => 'view_global_partner_statistics'], ['label' => 'View Global Partner Statistics']);
    $roles['unit_manager']->permissions()->attach($this->statsPermission);
    $this->roles = $roles;

    $this->person = function (string $name, string $role, array $agent = [], ?int $sponsor = null, int $registration = 4) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);
        // Overrides first: + keeps the left-hand keys.
        $id = DB::table('agents')->insertGetId($agent + ['user_id' => $user->id, 'email' => $user->email, 'created_at' => '2024-06-01 00:00:00']);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'referral_id' => $sponsor, 'registration_status' => $registration]);

        return [$user, $id];
    };
    [$this->superadmin] = ($this->person)('Sam Admin', 'superadmin');
    [$this->umUser, $this->um] = ($this->person)('Uma Manager', 'unit_manager');
    [$this->otherUser, $this->other] = ($this->person)('Oli Other', 'agent');
    $gp = fn (string $name, string $code, string $country, int $sponsor, bool $confirmed) => ($this->person)($name, 'global_partner',
        ['agent_type' => 'global_partner', 'country_code' => $code, 'country' => $country, 'sponsor_confirmed_at' => $confirmed ? '2025-01-01 00:00:00' : null], $sponsor)[1];
    $this->dubai = $gp('Dina Dubai', 'AE', 'United Arab Emirates', $this->um, false);
    $this->toronto = $gp('Tom Toronto', 'CA', 'Canada', $this->um, true);
    $this->tokyo = $gp('Kei Tokyo', 'JP', 'Japan', $this->other, false);

    $sale = function (int $agent, float $price, string $status, string $clientCountry) {
        $id = DB::table('international_sales')->insertGetId(['agent_id' => $agent, 'unit_number' => '1', 'total_contract_price' => $price, 'reservation_date' => '2026-05-01', 'sale_status' => $status]);
        DB::table('international_sale_clients')->insert(['international_sale_id' => $id, 'first_name' => 'C', 'last_name' => 'C', 'country' => $clientCountry]);
    };
    $sale($this->dubai, 10_000_000, 'pending', 'United Arab Emirates');
    $sale($this->toronto, 4_000_000, 'valid', 'CA');
    $sale($this->toronto, 99_000_000, 'invalid', 'Canada');
    $sale($this->tokyo, 2_000_000, 'pending', 'Japan');
});

test('the back office sees every global partner, a sponsor only their invites, others none; the badge counts the waiting', function () {
    $this->actingAs($this->superadmin)->get('/global-partners?confirmation=all')
        ->assertInertia(fn ($page) => $page->component('Portal/GlobalPartners/Index')
            ->where('everyone', true)
            ->where('counts', ['all' => 3, 'pending' => 2, 'confirmed' => 1])
            ->where('partners.data', fn ($rows) => collect($rows)->firstWhere('name', 'Dina Dubai')['sponsor_name'] === 'Uma Manager')
            ->where('auth.global_partners', ['pending' => 2]));

    // Waiting first by default.
    $this->actingAs($this->umUser)->get('/global-partners')
        ->assertInertia(fn ($page) => $page->where('everyone', false)->where('counts', ['all' => 2, 'pending' => 1, 'confirmed' => 1])
            ->where('partners.data', fn ($rows) => collect($rows)->pluck('name')->all() === ['Dina Dubai'])
            ->where('partners.data.0.sales_value', 10_000_000)
            ->where('auth.global_partners', ['pending' => 1]));

    [$nobody] = ($this->person)('No Invites', 'agent');
    $this->actingAs($nobody)->get('/global-partners')->assertForbidden();
    $this->actingAs($nobody)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.global_partners', null));

    // A sponsor may open their partner's profile.
    $this->actingAs($this->umUser)->get("/agents/{$this->dubai}")->assertOk();
});

test('a sponsor confirms their own invite; another sponsor can\'t; the back office can confirm anyone', function () {
    $this->actingAs($this->otherUser)->post("/global-partners/{$this->dubai}/confirm")->assertForbidden();

    $this->actingAs($this->umUser)->post("/global-partners/{$this->dubai}/confirm")->assertRedirect();
    $dubai = DB::table('agents')->where('id', $this->dubai)->first();
    expect($dubai->sponsor_confirmed_at)->not->toBeNull()
        ->and($dubai->sponsor_confirmed_by)->toBe($this->umUser->id)
        ->and(DB::table('activity_logs')->where('action', 'partner.confirmed')->exists())->toBeTrue();
    $this->actingAs($this->umUser)->get('/profile')->assertInertia(fn ($page) => $page->where('auth.global_partners', ['pending' => 0]));

    $this->actingAs($this->superadmin)->post("/global-partners/{$this->tokyo}/confirm")->assertRedirect();
    expect(DB::table('agents')->where('id', $this->tokyo)->value('sponsor_confirmed_at'))->not->toBeNull();

    // Only global partners can be confirmed.
    $this->actingAs($this->superadmin)->post("/global-partners/{$this->other}/confirm")->assertForbidden();
});

test('statistics count partners by country and their international sales (not the invalid ones), within reach', function () {
    $this->actingAs($this->superadmin)->get('/global-partners/statistics?from=2026-01-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->component('Portal/GlobalPartners/Statistics')
            ->where('stats.partners', ['total' => 3, 'confirmed' => 1, 'pending' => 2, 'countries' => 3])
            ->where('stats.sales', ['count' => 3, 'value' => 16_000_000, 'partners' => 3])
            ->where('stats.by_country', fn ($c) => collect($c)->pluck('partners', 'code')->all() == ['AE' => 1, 'CA' => 1, 'JP' => 1])
            // "CA" and "Canada" are one country, with its flag code.
            ->where('stats.client_countries.0', fn ($r) => $r['name'] === 'United Arab Emirates' && $r['code'] === 'AE')
            ->where('stats.client_countries', fn ($c) => collect($c)->firstWhere('name', 'Canada')['sales'] === 1 && collect($c)->firstWhere('name', 'Canada')['code'] === 'CA')
            ->where('stats.top_partners.0.name', 'Dina Dubai'));

    $this->actingAs($this->umUser)->get('/global-partners/statistics?from=2026-01-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->where('stats.partners.total', 2)->where('stats.sales.value', 14_000_000));
});

test('legacy confirmations fill blanks only', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('members', function (Blueprint $t) {
        $t->id();
        $t->text('sponsor_activation_status')->nullable();
    });
    DB::connection('legacy')->table('members')->insert([
        ['id' => $this->dubai, 'sponsor_activation_status' => 'confirmed'],
        ['id' => $this->tokyo, 'sponsor_activation_status' => null],
        ['id' => $this->toronto, 'sponsor_activation_status' => 'confirmed'],
    ]);

    $this->artisan('legacy:import-partner-confirmations')->assertSuccessful();

    expect(DB::table('agents')->where('id', $this->dubai)->value('sponsor_confirmed_at'))->not->toBeNull()
        ->and(DB::table('agents')->where('id', $this->tokyo)->value('sponsor_confirmed_at'))->toBeNull()
        ->and(DB::table('agents')->where('id', $this->toronto)->value('sponsor_confirmed_at'))->toStartWith('2025-01-01');
});

test('only partners abroad, fully registered and joined from 2024-02-01 are global partners here', function () {
    $partner = fn (string $name, array $agent, int $registration = 4) => ($this->person)($name, 'global_partner',
        $agent + ['agent_type' => 'global_partner', 'country_code' => 'AE', 'country' => 'United Arab Emirates'], $this->um, $registration)[1];
    $inPh = $partner('Pia Pinas', ['country_code' => 'PH', 'country' => 'Philippines']);
    $unregistered = $partner('Ursula Unregistered', [], 3);
    $early = $partner('Eddie Early', ['created_at' => '2024-01-31 23:00:00']);
    DB::table('international_sales')->insert(['agent_id' => $early, 'unit_number' => '1', 'total_contract_price' => 50_000_000, 'reservation_date' => '2026-05-01', 'sale_status' => 'valid']);

    $this->actingAs($this->superadmin)->get('/global-partners?confirmation=all')
        ->assertInertia(fn ($page) => $page->where('counts.all', 3)
            ->where('partners.data', fn ($rows) => collect($rows)->pluck('id')->intersect([$inPh, $unregistered, $early])->isEmpty())
            ->where('auth.global_partners', ['pending' => 2]));

    // Their sales stay out of the statistics too, and they can't be confirmed here.
    $this->actingAs($this->superadmin)->get('/global-partners/statistics?from=2026-01-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->where('stats.partners.total', 3)->where('stats.sales.value', 16_000_000));
    $this->actingAs($this->superadmin)->post("/global-partners/{$inPh}/confirm")->assertForbidden();
});

test('every country and every partner who sold is sent; the page shows them a page at a time', function () {
    $this->actingAs($this->superadmin)->get('/global-partners/statistics?from=2026-01-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->has('stats.client_countries', 3)->has('stats.top_partners', 3)
            ->where('stats.top_partners', fn ($p) => collect($p)->every(fn ($r) => $r['sales'] > 0)));
});

test('the list shows each partner\'s own team and sub-team, and sorts by team', function () {
    $team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $this->um, 'status' => 'active']);
    $unit = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Alpha Unit', 'agent_id' => $this->um, 'status' => 'active']);
    DB::table('team_agents')->insert([
        ['team_id' => $team, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'transferred_at' => null, 'status' => 'active'],
        // A past team doesn't show.
        ['team_id' => $team, 'agent_id' => $this->toronto, 'joined_at' => '2024-07-01', 'transferred_at' => '2025-01-01', 'status' => 'inactive'],
    ]);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'status' => 'active']);

    $this->actingAs($this->superadmin)->get('/global-partners?confirmation=all&sort=team&dir=desc')
        ->assertInertia(fn ($page) => $page
            ->where('partners.data.0', fn ($r) => $r['name'] === 'Dina Dubai' && $r['team_name'] === 'Alpha' && $r['sub_team_name'] === 'Alpha Unit')
            ->where('partners.data', fn ($rows) => collect($rows)->firstWhere('name', 'Tom Toronto')['team_name'] === null));
});

test('global partner statistics need their permission, and for a sponsor cover only their recruits', function () {
    // Oli sponsors Kei but his role (agent) hasn't been given the statistics.
    $this->actingAs($this->otherUser)->get('/global-partners')->assertOk();
    $this->actingAs($this->otherUser)->get('/global-partners/statistics')->assertForbidden();

    $this->roles['agent']->permissions()->attach($this->statsPermission);
    $this->actingAs($this->otherUser->fresh())->get('/global-partners/statistics?from=2026-01-01&to=2026-12-31')
        ->assertInertia(fn ($page) => $page->where('everyone', false)->where('stats.partners.total', 1)->where('stats.sales.value', 2_000_000));
});

test('the search finds partners by team, sub-team, sponsor or country too, and the tab counts follow it', function () {
    $team = DB::table('teams')->insertGetId(['name' => 'Falcons', 'agent_id' => $this->um, 'status' => 'active']);
    $unit = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Desert Unit', 'agent_id' => $this->um, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'status' => 'active']);
    $names = fn (string $q) => collect($this->actingAs($this->superadmin)->get('/global-partners?confirmation=all&q='.urlencode($q))
        ->viewData('page')['props']['partners']['data'])->pluck('name')->sort()->values()->all();

    expect($names('falcon'))->toBe(['Dina Dubai'])
        ->and($names('desert'))->toBe(['Dina Dubai'])
        ->and($names('uma manager'))->toBe(['Dina Dubai', 'Tom Toronto'])
        ->and($names('japan'))->toBe(['Kei Tokyo']);

    $this->actingAs($this->superadmin)->get('/global-partners?q=uma')->assertInertia(fn ($page) => $page->where('counts', ['all' => 2, 'pending' => 1, 'confirmed' => 1]));
});

test('a team leader sees every global partner on their team, a unit manager their sub-team, an agent only their recruits', function () {
    [$leaderUser, $leader] = ($this->person)('Tina Leader', 'unit_manager');
    $team = DB::table('teams')->insertGetId(['name' => 'Falcons', 'agent_id' => $leader, 'status' => 'active']);
    $unit = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Desert Unit', 'agent_id' => $this->um, 'status' => 'active']);
    // Kei (recruited by Oli) and Dina (recruited by Uma) are both on Falcons; only Dina is in Uma's sub-team.
    foreach ([$this->tokyo, $this->dubai] as $id) {
        DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $id, 'joined_at' => '2025-01-01', 'status' => 'active']);
    }
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'status' => 'active']);
    $names = fn (User $u) => collect($this->actingAs($u)->get('/global-partners?confirmation=all')->viewData('page')['props']['partners']['data'])->pluck('name')->sort()->values()->all();

    // The team leader recruited none of them, but leads the team.
    expect($names($leaderUser))->toBe(['Dina Dubai', 'Kei Tokyo'])
        // Uma: her sub-team (Dina) plus her own recruits (Dina, Tom).
        ->and($names($this->umUser))->toBe(['Dina Dubai', 'Tom Toronto'])
        // Oli leads nothing: just his recruit.
        ->and($names($this->otherUser))->toBe(['Kei Tokyo']);

    $this->actingAs($leaderUser)->get('/global-partners')->assertInertia(fn ($page) => $page->where('showSponsor', true)->where('everyone', false));
    $this->actingAs($this->otherUser)->get('/global-partners')->assertInertia(fn ($page) => $page->where('showSponsor', false));

    // The leader can confirm a partner on their team though someone else recruited them.
    $this->actingAs($leaderUser)->post("/global-partners/{$this->tokyo}/confirm")->assertRedirect();
    expect(DB::table('agents')->where('id', $this->tokyo)->value('sponsor_confirmed_by'))->toBe($leaderUser->id);
    $this->actingAs($leaderUser)->post("/global-partners/{$this->toronto}/confirm")->assertForbidden();
});

test('statistics rank teams and recruiters, and a click narrows the whole page to one team, recruiter or country', function () {
    $team = DB::table('teams')->insertGetId(['name' => 'Falcons', 'agent_id' => $this->um, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $this->dubai, 'joined_at' => '2025-01-01', 'status' => 'active']);
    $range = 'from=2026-01-01&to=2026-12-31';

    $this->actingAs($this->superadmin)->get("/global-partners/statistics?{$range}")
        ->assertInertia(fn ($page) => $page
            ->where('stats.top_teams', [['id' => $team, 'name' => 'Falcons', 'logo' => null, 'partners' => 1, 'sales' => 1, 'value' => 10_000_000]])
            ->where('stats.top_recruiters', fn ($r) => collect($r)->pluck('partners', 'name')->all() == ['Uma Manager' => 2, 'Oli Other' => 1])
            ->where('stats.selection', null));

    $this->actingAs($this->superadmin)->get("/global-partners/statistics?{$range}&team_id={$team}")
        ->assertInertia(fn ($page) => $page->where('stats.selection', ['type' => 'team', 'name' => 'Falcons'])
            ->where('stats.partners.total', 1)->where('stats.sales.value', 10_000_000)->where('stats.by_country.0.code', 'AE'));

    $this->actingAs($this->superadmin)->get("/global-partners/statistics?{$range}&sponsor_id={$this->um}")
        ->assertInertia(fn ($page) => $page->where('stats.selection.type', 'recruiter')->where('stats.partners.total', 2)->where('stats.sales.value', 14_000_000));

    $this->actingAs($this->superadmin)->get("/global-partners/statistics?{$range}&country=JP")
        ->assertInertia(fn ($page) => $page->where('stats.selection', ['type' => 'country', 'name' => 'Japan', 'code' => 'JP'])->where('stats.sales.value', 2_000_000));

    // An agent who only sees their recruits gets no recruiter ranking (it would just be them).
    $this->roles['agent']->permissions()->attach($this->statsPermission);
    $this->actingAs($this->otherUser->fresh())->get("/global-partners/statistics?{$range}")->assertInertia(fn ($page) => $page->where('stats.top_recruiters', []));
});

test('the global partner cut-off uses the day they joined Leuterio Realty when it is known', function () {
    // Signed up on the portal after the cut-off, but joined LR before it: not a global partner here.
    DB::table('agents')->where('id', $this->dubai)->update(['lr_joined_at' => '2023-11-01']);
    $this->actingAs($this->superadmin)->get('/global-partners?confirmation=all')
        ->assertInertia(fn ($page) => $page->where('counts.all', 2)->where('partners.data', fn ($rows) => ! collect($rows)->pluck('id')->contains($this->dubai)));
});
