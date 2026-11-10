<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');

    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));

    $this->staff = User::factory()->create();
    $this->staff->roles()->attach(Role::create(['name' => 'staff', 'label' => 'Staff']));

    $user = User::factory()->create(['name' => 'Ana Reyes']);
    $this->ana = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email]);
    DB::table('developers')->insert(['id' => 10, 'name' => 'Cebu Landmasters']);
    DB::table('project_property_types')->insert(['id' => 1, 'name' => 'Condominiums']);
    $t = AgentTransaction::create(['agent_id' => $this->ana, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 10_000_000, 'reservation_date' => '2026-08-10', 'developer_id' => 10, 'project_name' => 'Mivela', 'project_property_type_id' => 1]);

    $this->fake = function (array $answer) {
        config(['services.openai.key' => 'test-key', 'services.openai.model' => 'gpt-test']);
        Http::fake(['api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode($answer)]]]])]);
    };

    $this->empty = [
        'view' => null, 'category' => null, 'status' => null, 'from' => null, 'to' => null,
        'developer_name' => null, 'team_name' => null, 'sub_team_name' => null, 'area_name' => null, 'agent_name' => null,
        'property_type' => null, 'unit_type' => null, 'project_name' => null, 'summary' => 'Showing every sale.',
    ];
});

afterEach(fn () => Carbon::setTestNow());

test('a request resolves names to real filters and redirects into the Sales report', function () {
    ($this->fake)([...$this->empty,
        'view' => 'developers', 'developer_name' => 'cebu landmasters', 'property_type' => 'Condominiums',
        'from' => '2026-08-01', 'to' => '2026-08-31', 'summary' => 'Condo sales in August, by developer.',
    ]);

    $response = $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => 'condo sales in August by developer']);

    $response->assertRedirect();
    parse_str((string) parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);
    expect($query)->toMatchArray(['view' => 'developers', 'developer_id' => '10', 'property_type_id' => '1', 'from' => '2026-08-01', 'to' => '2026-08-31']);
    $response->assertSessionHas('success', 'Condo sales in August, by developer.');

    $this->actingAs($this->superadmin)->get('/superadmin/report-builder/sales?view=developers&developer_id=10&property_type_id=1&from=2026-08-01&to=2026-08-31')
        ->assertInertia(fn ($page) => $page->where('filters.developer_id', 10)->where('filters.property_type_id', 1)
            ->where('summary.kpis.value.value', 10_000_000));
});

test('a name that matches nothing is dropped, with a warning, instead of guessed', function () {
    ($this->fake)([...$this->empty, 'developer_name' => 'Nonexistent Developer LLC', 'summary' => 'Showing every developer\'s sales.']);

    $response = $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => 'sales for Nonexistent Developer LLC']);

    $response->assertRedirect('/superadmin/report-builder/sales');
    $response->assertSessionHas('warning', fn ($m) => str_contains($m, 'Showing every developer\'s sales.') && str_contains($m, 'Nonexistent Developer LLC'));
});

test('without an OPENAI_API_KEY, or when the call fails, nothing is guessed and the filters stay untouched', function () {
    config(['services.openai.key' => null]);
    $response = $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => 'condo sales']);
    $response->assertRedirect();
    $response->assertSessionHas('error', fn ($m) => str_contains($m, 'OPENAI_API_KEY'));
    Http::assertNothingSent();

    config(['services.openai.key' => 'test-key']);
    Http::fake(['api.openai.com/*' => Http::response(['error' => ['message' => 'down']], 500)]);
    $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => 'condo sales'])
        ->assertSessionHas('error');
});

test('more than 20 requests an hour are refused without calling OpenAI again', function () {
    ($this->fake)($this->empty);
    for ($i = 0; $i < 20; $i++) {
        $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => "request {$i}"]);
    }
    Http::assertSentCount(20);

    $this->actingAs($this->superadmin)->post('/superadmin/report-builder/ai', ['prompt' => 'one more'])
        ->assertSessionHas('error', fn ($m) => str_contains($m, 'a lot of requests'));
    Http::assertSentCount(20);
});

test('a non-superadmin cannot reach Ask AI at all — Report Builder is superadmin only', function () {
    // Granting the permission doesn't help: the whole report-builder route group is behind role:superadmin.
    $this->staff->roles()->first()->permissions()->attach(Permission::where('name', 'use_ai_report_builder')->value('id'));

    $this->actingAs($this->staff->fresh())->post('/superadmin/report-builder/ai', ['prompt' => 'condo sales'])->assertForbidden();
});
