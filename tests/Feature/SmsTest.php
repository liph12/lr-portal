<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\SmsText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    config(['services.semaphore.key' => 'test-key', 'services.semaphore.url' => 'https://sms.test/api/v4', 'services.semaphore.sender_name' => 'LEUTERIO']);
    $send = Permission::where('name', 'send_sms')->firstOrFail();
    $this->roles = [
        'superadmin' => Role::create(['name' => 'superadmin', 'label' => 'Superadmin']),
        'team_leader' => Role::create(['name' => 'team_leader', 'label' => 'Team Leader']),
        'agent' => Role::create(['name' => 'agent', 'label' => 'Agent']),
    ];
    $this->roles['team_leader']->permissions()->attach($send);
    $this->person = function (string $role, ?string $mobile, string $status = 'active') {
        $user = User::factory()->create(['status' => $status]);
        $user->roles()->attach($this->roles[$role]);
        $agent = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'agent_type' => 'local', 'mobile' => $mobile]);

        return [$user, $agent];
    };
    [$this->superadmin] = ($this->person)('superadmin', null);
    [$this->leader, $leaderAgent] = ($this->person)('team_leader', '0917 111 0000');
    $team = DB::table('teams')->insertGetId(['name' => 'Team A', 'agent_id' => $leaderAgent, 'status' => 'active']);
    // Two members on the leader's team (one with a messy number), one elsewhere, one inactive, one without a number.
    foreach (['+63 917-111-0001', '09171110002 / 09999999999', null] as $mobile) {
        [, $id] = ($this->person)('agent', $mobile);
        DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $id, 'joined_at' => '2025-01-01', 'status' => 'active']);
    }
    [, $inactive] = ($this->person)('agent', '09171110003', 'inactive');
    DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $inactive, 'joined_at' => '2025-01-01', 'status' => 'active']);
    ($this->person)('agent', '09171110009');
    $this->semaphore = fn (array $refused = []) => Http::fake(['sms.test/*' => fn ($request) => Http::response(
        collect(explode(',', $request['number'] ?? ''))->reject(fn ($n) => in_array($n, $refused, true))->map(fn ($n) => ['message_id' => rand(), 'recipient' => '63'.substr($n, 1), 'status' => 'Pending'])->values()->all()
    )]);
    // A group's people, as the page loads them when it's ticked.
    $this->members = fn (User $user, string $role) => $this->actingAs($user)->get('/sms?members_role='.$role, [
        'X-Inertia' => 'true', 'X-Inertia-Version' => app(App\Http\Middleware\HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'Portal/Sms/Index', 'X-Inertia-Partial-Data' => 'members',
    ])->json('props.members.people');
    $this->groups = fn (User $user) => collect($this->actingAs($user)->get('/sms')->viewData('page')['props']['groups'])->pluck('count', 'role')->all();
});

test('SMS text: parts per message and Philippine mobile numbers', function () {
    expect(SmsText::parts(str_repeat('a', 160)))->toBe(1)
        ->and(SmsText::parts(str_repeat('a', 161)))->toBe(2)
        ->and(SmsText::parts(str_repeat('{', 80)))->toBe(1)
        ->and(SmsText::parts('Salamat po 🙏'))->toBe(1)
        ->and(SmsText::parts(str_repeat('é', 70).'🙏'))->toBe(2)
        ->and(SmsText::mobile('+63 917-123-4567'))->toBe('09171234567')
        ->and(SmsText::mobile('9171234567'))->toBe('09171234567')
        ->and(SmsText::mobile('09171234567 / 09180000000'))->toBe('09171234567')
        ->and(SmsText::mobile('032 255 1234'))->toBeNull()
        ->and(SmsText::numbers("0917 123 4567, 09171234567\nabc"))->toBe(['valid' => ['09171234567'], 'invalid' => ['abc']])
        ->and(SmsText::numbers('09171234567 09181234567'))->toBe(['valid' => ['09171234567', '09181234567'], 'invalid' => []]);
});

test('only those given send_sms open it; a team leader reaches their own team, an SMS manager everyone', function () {
    [$agent] = ($this->person)('agent', '09170000000');
    $this->actingAs($agent)->get('/sms')->assertForbidden();

    expect(($this->groups)($this->leader))->toBe(['agent' => 2])
        ->and(($this->groups)($this->superadmin))->toBe(['agent' => 4, 'team_leader' => 1]);
});

test('a team leader pays with approved credits; numbers Semaphore refuses give their credits back', function () {
    ($this->semaphore)(['09171110002']);
    $team = ($this->members)($this->leader, 'agent');
    expect(collect($team)->pluck('mobile')->sort()->values()->all())->toBe(['09171110001', '09171110002']);
    $message = ['message' => 'Team meeting at 3 PM', 'groups' => ['agent'], 'people' => array_column($team, 'id'), 'numbers' => '0918 000 0001'];

    // No credits yet.
    $this->actingAs($this->leader)->post('/sms', $message)->assertSessionHasErrors('message');
    Http::assertNothingSent();

    // Buy credits: a proof of payment, approved by an SMS manager (who may give fewer).
    $this->actingAs($this->leader)->post('/sms/credits', ['credits' => 10, 'proof_of_payment' => UploadedFile::fake()->image('gcash.jpg')])->assertSessionHasNoErrors();
    $request = DB::table('sms_credit_requests')->first();
    expect($request->status)->toBe('pending')->and($request->proof_of_payment)->not->toBeEmpty();
    $this->actingAs($this->leader)->post("/sms/credits/{$request->id}/approve", ['credits' => 10])->assertForbidden();
    $this->actingAs($this->superadmin)->post("/sms/credits/{$request->id}/approve", ['credits' => 5])->assertSessionHasNoErrors();
    $this->actingAs($this->superadmin)->post("/sms/credits/{$request->id}/approve", ['credits' => 5])->assertSessionHasErrors('request');
    expect(app(App\Services\SmsCreditService::class)->balance($this->leader))->toBe(5);

    // Team's two agents + one typed-in number = 3 credits; one is refused → 1 back.
    $this->actingAs($this->leader)->post('/sms', $message)->assertSessionHasNoErrors();
    Http::assertSent(fn ($r) => $r['apikey'] === 'test-key' && $r['sendername'] === 'LEUTERIO' && $r['message'] === 'Team meeting at 3 PM'
        && collect(explode(',', $r['number']))->sort()->values()->all() === ['09171110001', '09171110002', '09180000001']);
    $blast = DB::table('sms_blasts')->first();
    expect($blast->status)->toBe('partial')->and($blast->recipients)->toBe(3)->and($blast->sent)->toBe(2)->and($blast->failed)->toBe(1)
        ->and(app(App\Services\SmsCreditService::class)->balance($this->leader))->toBe(3);
});

test('groups outside one\'s reach and bad numbers are refused; an SMS manager sends on the company balance', function () {
    ($this->semaphore)();
    DB::table('sms_credit_ledger')->insert(['user_id' => $this->leader->id, 'change' => 100, 'reason' => 'purchase', 'created_at' => now(), 'updated_at' => now()]);

    $this->actingAs($this->leader)->post('/sms', ['message' => 'Hi', 'groups' => ['team_leader']])->assertSessionHasErrors('groups');
    // Someone outside the leader's team, picked by id anyway.
    $outsider = DB::table('agents')->where('mobile', '09171110009')->value('user_id');
    $this->actingAs($this->leader)->post('/sms', ['message' => 'Hi', 'people' => [$outsider]])->assertSessionHasErrors('people');
    $this->actingAs($this->leader)->post('/sms', ['message' => 'Hi', 'numbers' => '0917 abc'])->assertSessionHasErrors('numbers');
    $this->actingAs($this->leader)->post('/sms', ['message' => str_repeat('a', 500), 'numbers' => '09170000000'])->assertSessionHasErrors('message');

    $everyone = [...($this->members)($this->superadmin, 'agent'), ...($this->members)($this->superadmin, 'team_leader')];
    $this->actingAs($this->superadmin)->post('/sms', ['message' => 'Office closed tomorrow', 'groups' => ['agent', 'team_leader'], 'people' => array_column($everyone, 'id')])->assertSessionHasNoErrors();
    $blast = DB::table('sms_blasts')->first();
    expect($blast->charged)->toBe(0)->and($blast->recipients)->toBe(4)->and($blast->status)->toBe('sent')
        ->and(DB::table('sms_credit_ledger')->where('reason', 'send')->count())->toBe(0);
});

test('a disapproved request adds nothing and shows the reason', function () {
    $this->actingAs($this->leader)->post('/sms/credits', ['credits' => 10, 'proof_of_payment' => UploadedFile::fake()->image('p.jpg')]);
    $id = DB::table('sms_credit_requests')->value('id');
    $this->actingAs($this->superadmin)->post("/sms/credits/{$id}/disapprove", [])->assertSessionHasErrors('reason');
    $this->actingAs($this->superadmin)->post("/sms/credits/{$id}/disapprove", ['reason' => 'Payment not found'])->assertSessionHasNoErrors();

    $requests = $this->actingAs($this->leader)->get('/sms/credits')->viewData('page')['props']['requests'];
    expect($requests[0])->toMatchArray(['status' => 'disapproved', 'remarks' => 'Payment not found'])
        ->and(app(App\Services\SmsCreditService::class)->balance($this->leader))->toBe(0);
});

test('people are searched within reach, by name or mobile number', function () {
    $search = fn (User $user, string $q) => collect($this->actingAs($user)->get('/sms?people_q='.urlencode($q), [
        'X-Inertia' => 'true', 'X-Inertia-Version' => app(App\Http\Middleware\HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'Portal/Sms/Index', 'X-Inertia-Partial-Data' => 'peopleOptions',
    ])->json('props.peopleOptions'))->pluck('mobile')->all();

    expect($search($this->superadmin, '1110009'))->toBe(['09171110009'])
        ->and($search($this->leader, '1110009'))->toBe([])
        ->and($search($this->leader, '1110001'))->toBe(['09171110001']);
});
