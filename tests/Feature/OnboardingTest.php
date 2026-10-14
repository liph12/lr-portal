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
    $this->role = Role::create(['name' => 'agent', 'label' => 'Agent']);
    // A new local agent: fully registered, no NAO, no FIRE, no sales, no photo yet.
    $this->newAgent = function (array $agent = [], array $attributes = []) {
        $user = User::factory()->create();
        $user->roles()->attach($this->role);
        $id = DB::table('agents')->insertGetId($agent + ['user_id' => $user->id, 'email' => $user->email, 'agent_type' => 'local']);
        DB::table('agent_attributes')->insert($attributes + ['agent_id' => $id, 'registration_status' => 4, 'nao_video_tracker' => 0, 'fire_certificates' => 0]);

        return [$user, $id];
    };
});

test('a new local agent lands on the welcome page instead of the dashboard', function () {
    [$user] = ($this->newAgent)();

    $this->actingAs($user)->get('/dashboard/main')->assertRedirect('/welcome');
    $this->actingAs($user)->get('/welcome')->assertInertia(fn ($page) => $page->component('Portal/Onboarding/Welcome'));
    $this->actingAs($user)->get('/welcome/photo')->assertInertia(fn ($page) => $page->component('Portal/Onboarding/Photo')->has('maxPhotoKb'));
    // Other pages aren't interrupted.
    $this->actingAs($user)->get('/profile')->assertOk();
});

test('only agents who haven\'t started: NAO, FIRE, a sale, an unfinished registration, a global partner or the back office skip it', function () {
    $cases = [
        'took NAO' => ($this->newAgent)([], ['nao_video_tracker' => 40]),
        'has FIRE' => ($this->newAgent)([], ['fire_certificates' => 1]),
        'registration not finished' => ($this->newAgent)([], ['registration_status' => 3]),
        'global partner' => ($this->newAgent)(['agent_type' => 'global_partner']),
    ];
    [$seller, $sellerAgent] = ($this->newAgent)();
    AgentTransaction::create(['agent_id' => $sellerAgent, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'cancelled']);
    $cases['any sale, even cancelled'] = [$seller, $sellerAgent];

    [$staff] = ($this->newAgent)();
    $staff->roles()->sync([Role::create(['name' => 'staff', 'label' => 'Staff'])->id]);
    $cases['back office'] = [$staff->fresh(), null];

    foreach ($cases as $why => [$user]) {
        expect($this->actingAs($user)->get('/dashboard/main')->status())->toBe(200, $why);
    }
});

test('the photo step needs a photo; once done, the dashboard sends them on to the NAO step', function () {
    [$user, $agent] = ($this->newAgent)();

    $this->actingAs($user)->post('/welcome/photo')->assertSessionHasErrors('photo');
    $this->actingAs($user)->get('/dashboard/main')->assertRedirect('/welcome');

    DB::table('agents')->where('id', $agent)->update(['avatar' => 'https://files.test/me.webp']);
    $user = $user->fresh();
    $this->actingAs($user)->post('/welcome/photo')->assertRedirect(route('onboarding.nao'));
    expect(DB::table('agents')->where('id', $agent)->value('onboarding_step'))->toBe('photo');
    $this->actingAs($user)->get('/dashboard/main')->assertRedirect('/welcome/nao');
    $this->actingAs($user)->get('/welcome/nao')->assertInertia(fn ($page) => $page->component('Portal/Onboarding/Nao')
        ->where('nao.status', null)->where('nao.stage', 'choose')->where('nao.video.id', config('nao.webinar.video_id'))->has('maxFileKb'));

    // Partway through the webinar (NAO above 0) they're still in onboarding.
    DB::table('agent_attributes')->where('agent_id', $agent)->update(['nao_video_tracker' => 40]);
    $this->actingAs($user)->get('/dashboard/main')->assertRedirect('/welcome/nao');
});

test('attended a face-to-face NAO: proof and date wait for the sponsor, who is shown with their contact details', function () {
    Storage::fake('s3');
    $sponsorUser = User::factory()->create();
    $sponsor = DB::table('agents')->insertGetId(['user_id' => $sponsorUser->id, 'email' => 'sponsor@example.test', 'first_name' => 'Sam', 'last_name' => 'Sponsor', 'mobile' => '09171234567', 'agent_type' => 'local']);
    [$user, $agent] = ($this->newAgent)(['onboarding_step' => 'photo'], ['referral_id' => $sponsor]);

    $this->actingAs($user)->post('/welcome/nao/attendance', ['attended_on' => now()->addDay()->toDateString()])
        ->assertSessionHasErrors(['proof', 'attended_on']);

    $this->actingAs($user)->post('/welcome/nao/attendance', [
        'proof' => UploadedFile::fake()->image('nao.jpg', 800, 600),
        'attended_on' => '2026-10-10',
    ])->assertRedirect(route('onboarding.nao'));

    $row = DB::table('agent_attributes')->where('agent_id', $agent)->first();
    expect($row->nao_attendance_status)->toBe('yes')
        ->and($row->nao_date_of_attendance)->toBe('2026-10-10')
        ->and($row->nao_proof_of_attendance)->not->toBeEmpty()
        ->and($row->nao_attendance_submitted_at)->not->toBeNull()
        ->and((int) $row->nao_video_tracker)->toBe(0);
    expect(DB::table('agents')->where('id', $agent)->value('onboarding_step'))->toBe('nao');

    $user = $user->fresh();
    $this->actingAs($user)->get('/dashboard/main')->assertOk();
    $this->actingAs($user)->get('/welcome/nao')->assertInertia(fn ($page) => $page
        ->where('nao.status', 'yes')->where('nao.stage', 'awaiting')->where('nao.approved', false)
        ->where('nao.sponsor.name', 'Sam Sponsor')
        ->where('nao.sponsor.mobile', '09171234567')
        ->where('nao.sponsor.email', 'sponsor@example.test'));
});

test('the webinar saves how far they got, never further than the time since the last save allows', function () {
    $this->travelTo(now()->startOfMinute());
    [$user, $agent] = ($this->newAgent)(['onboarding_step' => 'photo']);
    $length = (int) config('nao.webinar.seconds');
    $saved = fn () => DB::table('agent_attributes')->where('agent_id', $agent)->first();

    $this->actingAs($user)->post('/welcome/nao/webinar')->assertRedirect(route('onboarding.nao'));
    // The webinar leaves the status empty; only the % moves.
    expect($saved()->nao_attendance_status)->toBeNull();
    $this->actingAs($user)->get('/welcome/nao')->assertInertia(fn ($page) => $page->where('nao.stage', 'webinar'));

    // Jumping to the end right away is cut to what could have been watched.
    $this->travel(30)->seconds();
    $this->actingAs($user)->put('/welcome/nao/progress', ['seconds' => $length], ['X-Inertia' => 'true'])->assertRedirect(route('onboarding.nao'));
    expect((int) $saved()->nao_video_seconds)->toBe(50);

    $this->travel(30)->seconds();
    $this->actingAs($user)->put('/welcome/nao/progress', ['seconds' => 80], ['X-Inertia' => 'true']);
    expect((int) $saved()->nao_video_seconds)->toBe(80)
        ->and((int) $saved()->nao_video_tracker)->toBe((int) floor(80 * 100 / $length));

    // Never backwards; the page-leave save (not an Inertia request) only needs a status.
    $this->travel(30)->seconds();
    $this->actingAs($user)->put('/welcome/nao/progress', ['seconds' => 10])->assertNoContent();
    expect((int) $saved()->nao_video_seconds)->toBe(80);
    expect(DB::table('agents')->where('id', $agent)->value('onboarding_step'))->toBe('photo');

    // Watched through to the end: 100% and the step is done.
    DB::table('agent_attributes')->where('agent_id', $agent)->update(['nao_video_seconds' => $length - 30]);
    $this->travel(30)->seconds();
    $this->actingAs($user)->put('/welcome/nao/progress', ['seconds' => $length - 2], ['X-Inertia' => 'true']);
    expect((int) $saved()->nao_video_tracker)->toBe(100)
        ->and((int) $saved()->nao_video_seconds)->toBe($length);
    expect(DB::table('agents')->where('id', $agent)->value('onboarding_step'))->toBe('nao');
    $this->actingAs($user->fresh())->get('/dashboard/main')->assertOk();
    expect($saved()->nao_attendance_status)->toBeNull();

    // Finished: no attendance claim on top.
    $this->actingAs($user)->post('/welcome/nao/attendance', ['proof' => UploadedFile::fake()->image('x.jpg'), 'attended_on' => '2026-10-01'])
        ->assertSessionHasErrors('nao');
});

test('skip for now lets them into the portal for the rest of the session', function () {
    [$user] = ($this->newAgent)();

    $this->actingAs($user)->post('/welcome/skip')->assertRedirect(route('dashboard.index'));
    $this->actingAs($user)->get('/dashboard/main')->assertOk();

    // A new session: the welcome page again.
    $this->flushSession();
    $this->actingAs($user)->get('/dashboard/main')->assertRedirect('/welcome');
});

test('the journey: registered, photo, NAO approved — FIRE is next, then the first sale', function () {
    [$user, $agent] = ($this->newAgent)(['first_name' => 'Juan', 'last_name' => 'Cruz', 'avatar' => 'https://files.test/me.webp', 'onboarding_step' => 'nao'], [
        'nao_attendance_status' => 'yes', 'nao_video_tracker' => 100, 'nao_date_of_attendance' => '2026-10-06', 'nao_attendance_reviewed_at' => '2026-10-14 10:00:00', 'fire_certificates' => 1,
    ]);

    $this->actingAs($user)->get('/my-journey')->assertInertia(fn ($page) => $page
        ->component('Portal/Agents/Journey')
        ->where('own', true)
        ->where('journey.agent.name', 'Juan Cruz')
        ->where('journey.done', 3)
        ->where('journey.milestones.2.key', 'nao')->where('journey.milestones.2.status', 'done')
        ->where('journey.milestones.3.key', 'fire')->where('journey.milestones.3.status', 'current')->where('journey.milestones.3.certificates', 1)
        ->where('journey.milestones.4.status', 'upcoming'));

    // Someone who may not open the profile doesn't see the journey either.
    [$stranger] = ($this->newAgent)();
    $this->actingAs($stranger)->get("/agents/{$agent}/journey")->assertForbidden();
    $this->actingAs($user)->get("/agents/{$agent}/journey")->assertOk();
});
