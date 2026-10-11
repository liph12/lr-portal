<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Role;
use App\Models\User;
use App\Services\AgentActivityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    $this->roles = collect(['agent' => 'Agent', 'team_leader' => 'Team Leader', 'secretary' => 'Secretary', 'global_partner' => 'Global Partner'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));

    $this->agent = function (string $role, ?string $activatedAt, string $createdAt = '2024-01-01 00:00:00') {
        $user = User::factory()->create();
        $user->roles()->attach($this->roles[$role]);

        return DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'activated_at' => $activatedAt, 'created_at' => $createdAt]);
    };
    $this->sale = function (int $agentId, string $date, string $status = 'valid') {
        $t = AgentTransaction::create(['agent_id' => $agentId, 'sale_type' => 'rental', 'commission_status' => 'Unclaimed', 'sale_status' => $status]);
        DB::table('agent_rental_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 100_000, 'reservation_date' => $date, 'commission_received' => 0]);
    };
    $this->activity = fn (int $id) => DB::table('agents')->where('id', $id)->value('activity');
});

afterEach(fn () => Carbon::setTestNow());

test('agents go dormant after 6 months without a sale since activation, on a rolling window', function () {
    $idle = ($this->agent)('agent', '2026-01-15 00:00:00');
    $sold = ($this->agent)('agent', '2025-01-15 00:00:00');
    ($this->sale)($sold, '2026-07-01');
    $pending = ($this->agent)('agent', '2025-01-15 00:00:00');
    ($this->sale)($pending, '2026-09-01', 'pending');
    $cancelled = ($this->agent)('agent', '2025-01-15 00:00:00');
    ($this->sale)($cancelled, '2026-09-01', 'cancelled');
    $oldSale = ($this->agent)('agent', '2024-01-15 00:00:00');
    ($this->sale)($oldSale, '2025-12-01');
    $new = ($this->agent)('agent', '2026-06-01 00:00:00');
    $neverActivated = ($this->agent)('agent', null, '2025-03-01 00:00:00');
    $partner = ($this->agent)('global_partner', '2025-01-15 00:00:00');
    DB::table('international_sales')->insert(['agent_id' => $partner, 'unit_number' => '1', 'total_contract_price' => 1, 'reservation_date' => '2026-08-01', 'sale_status' => 'valid']);

    $result = app(AgentActivityService::class)->refresh();

    expect(($this->activity)($idle))->toBe('dormant')
        ->and(($this->activity)($sold))->toBe('active')
        ->and(($this->activity)($pending))->toBe('active')        // a just-recorded sale counts
        ->and(($this->activity)($cancelled))->toBe('dormant')
        ->and(($this->activity)($oldSale))->toBe('dormant')       // rolling: last sale over 6 months ago
        ->and(($this->activity)($new))->toBe('active')            // still inside the first 6 months
        ->and(($this->activity)($neverActivated))->toBe('dormant') // falls back to the sign-up date
        ->and(($this->activity)($partner))->toBe('active')        // international sales count
        ->and($result)->toBe(['active' => 4, 'dormant' => 4]);
});

test('leaders and back-office roles are never dormant, and dormant never blocks sign-in', function () {
    $leader = ($this->agent)('team_leader', '2020-01-01 00:00:00');
    $secretary = ($this->agent)('secretary', '2020-01-01 00:00:00');
    $idle = ($this->agent)('agent', '2020-01-01 00:00:00');

    app(AgentActivityService::class)->refresh();

    expect(($this->activity)($leader))->toBe('active')
        ->and(($this->activity)($secretary))->toBe('active')
        ->and(($this->activity)($idle))->toBe('dormant')
        ->and(User::find(DB::table('agents')->where('id', $idle)->value('user_id'))->status)->toBe('active');
});

test('a sale wakes a dormant agent up; refreshing one agent leaves the rest alone', function () {
    $idle = ($this->agent)('agent', '2025-01-01 00:00:00');
    $other = ($this->agent)('agent', '2025-01-01 00:00:00');
    app(AgentActivityService::class)->refresh();
    expect(($this->activity)($idle))->toBe('dormant');

    ($this->sale)($idle, '2026-10-01', 'pending');
    DB::table('agents')->where('id', $other)->update(['activity' => 'active']);
    app(AgentActivityService::class)->refresh([$idle]);

    expect(($this->activity)($idle))->toBe('active')
        ->and(($this->activity)($other))->toBe('active');

    $this->artisan('agents:refresh-activity')->assertSuccessful();
    expect(($this->activity)($other))->toBe('dormant');
});
