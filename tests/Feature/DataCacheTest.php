<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\DataCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithConsoleEvents;
use Illuminate\Support\Facades\DB;

// Laravel only raises command events in tests with WithConsoleEvents (on `php artisan` they're always on).
uses(RefreshDatabase::class, WithConsoleEvents::class);

beforeEach(function () {
    config(['data_cache.enabled' => true]);
    $this->superadmin = User::factory()->create();
    $role = Role::create(['name' => 'superadmin', 'label' => 'Superadmin']);
    $this->superadmin->roles()->attach($role);
    $role->permissions()->attach(Permission::where('name', 'use_preferences')->value('id'));
});

test('a cached result is served until the data version moves', function () {
    $calls = 0;
    $compute = function () use (&$calls) {
        return ++$calls;
    };

    expect(DataCache::remember('demo', ['a' => 1], $compute))->toBe(1)
        ->and(DataCache::remember('demo', ['a' => 1], $compute))->toBe(1)
        // Other parameters, other entry.
        ->and(DataCache::remember('demo', ['a' => 2], $compute))->toBe(2);

    DataCache::bump();
    expect(DataCache::remember('demo', ['a' => 1], $compute))->toBe(3);
});

test('writes bump the version; reads, sign-in noise and preference saves don\'t', function () {
    $leader = DB::table('agents')->insertGetId(['user_id' => $this->superadmin->id, 'email' => $this->superadmin->email]);
    $team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $leader, 'status' => 'active']);
    $version = DataCache::version();

    $this->actingAs($this->superadmin)->get('/superadmin/management/teams')->assertOk();
    $this->actingAs($this->superadmin)->put('/settings/preferences/theme', ['theme' => 'dark']);
    expect(DataCache::version())->toBe($version);

    $this->actingAs($this->superadmin)->patch("/superadmin/management/teams/{$team}/status", ['status' => 'inactive'])->assertSessionHasNoErrors();
    expect(DataCache::version())->not->toBe($version);
});

test('data commands bump the version when they finish', function () {
    $version = DataCache::version();
    $this->artisan('list')->assertSuccessful();
    expect(DataCache::version())->toBe($version);

    $this->artisan('rentals:link-unregistered-agents')->assertSuccessful();
    expect(DataCache::version())->not->toBe($version);
});

test('the statistics page is served from the cache until something changes', function () {
    $sale = function () {
        $user = User::factory()->create();
        $agent = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'agent_type' => 'local']);
        $id = DB::table('agent_transactions')->insertGetId(['agent_id' => $agent, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $id, 'total_contract_price' => 1000000, 'reservation_date' => now()->toDateString()]);
    };
    $count = fn () => $this->actingAs($this->superadmin)->get('/superadmin/statistics')->viewData('page')['props']['stats']['kpis']['sales']['value'];

    $sale();
    expect($count())->toBe(1);

    // Changed straight in the database: still the cached figure.
    $sale();
    expect($count())->toBe(1);

    // Any write through the app (or a data command) moves the version: fresh numbers.
    DataCache::bump();
    expect($count())->toBe(2);
});
