<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $roles = collect(['superadmin' => 'Superadmin', 'staff' => 'Staff', 'secretary' => 'Secretary', 'team_leader' => 'Team Leader', 'unit_manager' => 'Unit Manager', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));

    $this->person = function (string $name, string $role, ?string $area = null, ?int $sponsor = null, bool $submitted = false) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'area' => $area, 'agent_type' => 'local']);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'referral_id' => $sponsor, 'registration_status' => 4] + ($submitted ? [
            'nao_attendance_status' => 'yes', 'nao_date_of_attendance' => '2026-10-06', 'nao_proof_of_attendance' => "https://files.test/nao-{$id}.webp",
            'nao_attendance_submitted_at' => now(),
        ] : []));

        return [$user, $id];
    };

    [$this->staff] = ($this->person)('Stella Staff', 'staff');
    [$this->secretaryUser, $secretary] = ($this->person)('Sela Secretary', 'secretary', 'davao');
    [$this->leaderUser, $leader] = ($this->person)('Tina Leader', 'team_leader', 'cebu');
    [$this->umUser, $um] = ($this->person)('Uma Manager', 'unit_manager', 'cebu');
    [$this->sponsorUser, $this->sponsor] = [$sponsorUser, $sponsor] = ($this->person)('Sam Sponsor', 'agent', 'cebu');
    [$this->strangerUser] = ($this->person)('Oscar Other', 'agent', 'iloilo');
    DB::table('offices')->insert(['id' => 5, 'name' => 'Davao', 'province' => 'Davao Del Sur', 'area' => 'davao', 'secretary_agent_id' => $secretary]);

    $this->team = $team = DB::table('teams')->insertGetId(['name' => 'Team A', 'agent_id' => $leader, 'status' => 'active']);
    $this->unit = $unit = DB::table('sub_teams')->insertGetId(['team_id' => $team, 'name' => 'Unit A', 'agent_id' => $um, 'status' => 'active']);

    // Who sent an attendance: one per kind of reach.
    [$this->recruitUser, $this->recruit] = ($this->person)('Rita Recruit', 'agent', 'iloilo', $sponsor, true);
    [, $this->davao] = ($this->person)('Dave Davao', 'agent', 'davao', null, true);
    [, $this->teamMember] = ($this->person)('Terry Team', 'agent', 'cebu', null, true);
    [, $this->unitMember] = ($this->person)('Una Unit', 'agent', 'cebu', null, true);
    // The leader's own attendance: never theirs to approve.
    DB::table('agent_attributes')->where('agent_id', $leader)->update(['nao_attendance_status' => 'yes', 'nao_attendance_submitted_at' => now()]);
    foreach ([$leader, $this->teamMember, $this->unitMember] as $id) {
        DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $id, 'joined_at' => '2025-01-01', 'status' => 'active']);
    }
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $this->unitMember, 'joined_at' => '2025-01-01', 'status' => 'active']);

    $this->ids = fn ($user) => collect($this->actingAs($user)->get('/nao-approvals?status=all')->assertOk()->viewData('page')['props']['submissions']['data'])->pluck('id')->sort()->values()->all();
});

test('each reader sees the attendances in their reach, with a pending badge', function () {
    expect(($this->ids)($this->staff))->toEqualCanonicalizing([$this->recruit, $this->davao, $this->teamMember, $this->unitMember, DB::table('agents')->where('email', $this->leaderUser->email)->value('id')])
        ->and(($this->ids)($this->secretaryUser))->toBe([$this->davao])
        ->and(($this->ids)($this->leaderUser))->toEqualCanonicalizing([$this->teamMember, $this->unitMember])
        ->and(($this->ids)($this->umUser))->toBe([$this->unitMember])
        ->and(($this->ids)($this->sponsorUser))->toBe([$this->recruit]);

    // Sent proofs are `yes` (legacy meaning) with the NAO still at 0 until approved; the review tells waiting from approved.
    expect(DB::table('agent_attributes')->where('agent_id', $this->davao)->value('nao_video_tracker'))->toBe(0);
    $this->actingAs($this->secretaryUser)->get('/nao-approvals')->assertInertia(fn ($page) => $page
        ->component('Portal/NaoApprovals/Index')->where('auth.nao_approvals.pending', 1)->where('counts.pending', 1)->where('scope.branches', ['Davao']));

    // Nobody to approve: no menu item, no page.
    $this->actingAs($this->strangerUser)->get('/nao-approvals')->assertForbidden();
    expect($this->actingAs($this->strangerUser)->get('/profile')->viewData('page')['props']['auth']['nao_approvals'])->toBeNull();
});

test('approving completes the NAO; disapproving needs a reason, which the agent sees back in onboarding', function () {
    DB::table('agents')->where('id', $this->recruit)->update(['onboarding_step' => 'nao']);

    $this->actingAs($this->sponsorUser)->post("/nao-approvals/{$this->recruit}/disapprove", [])->assertSessionHasErrors('reason');
    $this->actingAs($this->sponsorUser)->post("/nao-approvals/{$this->recruit}/disapprove", ['reason' => 'The photo is not from the NAO.'])->assertRedirect();

    $row = DB::table('agent_attributes')->where('agent_id', $this->recruit)->first();
    expect($row->nao_attendance_status)->toBe('disapproved')
        ->and($row->nao_attendance_remarks)->toBe('The photo is not from the NAO.')
        ->and((int) $row->nao_attendance_reviewed_by)->toBe($this->sponsorUser->id);
    // Back to the NAO step.
    expect(DB::table('agents')->where('id', $this->recruit)->value('onboarding_step'))->toBe('photo');
    $this->actingAs($this->recruitUser->fresh())->get('/welcome/nao')->assertInertia(fn ($page) => $page->where('nao.status', 'disapproved')->where('nao.stage', 'disapproved')->where('nao.remarks', 'The photo is not from the NAO.'));

    // Already reviewed: not again.
    $this->actingAs($this->sponsorUser)->post("/nao-approvals/{$this->recruit}/approve")->assertSessionHasErrors('nao');

    $this->actingAs($this->staff)->post("/nao-approvals/{$this->davao}/approve")->assertRedirect();
    $row = DB::table('agent_attributes')->where('agent_id', $this->davao)->first();
    expect($row->nao_attendance_status)->toBe('yes')
        ->and((int) $row->nao_video_tracker)->toBe(100)
        ->and((int) $row->nao_attendance_reviewed_by)->toBe($this->staff->id)
        ->and($row->nao_attendance_reviewed_at)->not->toBeNull();
});

test('nobody reviews outside their reach', function () {
    $this->actingAs($this->sponsorUser)->post("/nao-approvals/{$this->davao}/approve")->assertForbidden();
    $this->actingAs($this->secretaryUser)->post("/nao-approvals/{$this->teamMember}/approve")->assertForbidden();
    $this->actingAs($this->umUser)->post("/nao-approvals/{$this->teamMember}/disapprove", ['reason' => 'x'])->assertForbidden();
    expect(DB::table('agent_attributes')->whereIn('agent_id', [$this->davao, $this->teamMember])->whereNotNull('nao_attendance_reviewed_at')->exists())->toBeFalse();
});

test('legacy answers are listed too: yes under 100% waits, yes at 100% is approved, webinar-only rows are not attendances', function () {
    [, $waiting] = ($this->person)('Lea Legacy', 'agent', 'davao');
    [, $approved] = ($this->person)('Al Approved', 'agent', 'davao');
    [, $watcher] = ($this->person)('Wes Watcher', 'agent', 'davao');
    DB::table('agent_attributes')->where('agent_id', $waiting)->update(['nao_attendance_status' => 'yes', 'nao_video_tracker' => 0, 'nao_date_of_attendance' => '2023-05-01']);
    DB::table('agent_attributes')->where('agent_id', $approved)->update(['nao_attendance_status' => 'yes', 'nao_video_tracker' => 100]);
    DB::table('agent_attributes')->where('agent_id', $watcher)->update(['nao_video_tracker' => 60]);

    $page = $this->actingAs($this->secretaryUser)->get('/nao-approvals?status=all')->viewData('page')['props'];
    $rows = collect($page['submissions']['data'])->keyBy('id');
    expect($rows->keys()->sort()->values()->all())->toEqualCanonicalizing([$this->davao, $waiting, $approved])
        ->and($rows[$waiting]['status'])->toBe('pending')
        ->and($rows[$waiting]['submitted_at'])->toBeNull()
        ->and($rows[$approved]['status'])->toBe('approved')
        ->and($page['counts'])->toMatchArray(['pending' => 2, 'approved' => 1, 'disapproved' => 0])
        ->and($page['auth']['nao_approvals']['pending'])->toBe(2);

    $this->actingAs($this->secretaryUser)->post("/nao-approvals/{$waiting}/approve")->assertRedirect();
    expect((int) DB::table('agent_attributes')->where('agent_id', $waiting)->value('nao_video_tracker'))->toBe(100);
    // Already 100%: nothing left to approve.
    $this->actingAs($this->secretaryUser)->post("/nao-approvals/{$approved}/approve")->assertSessionHasErrors('nao');
});

test('filters: team, unit manager (sub-team) and a sponsor / agent, with choices from the reach', function () {
    $ids = fn (string $query) => collect($this->actingAs($this->staff)->get("/nao-approvals?status=all&{$query}")->viewData('page')['props']['submissions']['data'])->pluck('id')->all();
    $leader = DB::table('agents')->where('email', $this->leaderUser->email)->value('id');

    expect($ids("team_id={$this->team}"))->toEqualCanonicalizing([$leader, $this->teamMember, $this->unitMember])
        ->and($ids("sub_team_id={$this->unit}"))->toBe([$this->unitMember])
        // A sponsor: everyone they sponsored; an agent: themselves.
        ->and($ids("person={$this->sponsor}"))->toBe([$this->recruit])
        ->and($ids("person={$this->davao}"))->toBe([$this->davao]);

    $this->actingAs($this->staff)->get("/nao-approvals?person={$this->sponsor}")->assertInertia(fn ($page) => $page
        ->where('groups.teams', [['value' => $this->team, 'label' => 'Team A']])
        ->where('groups.sub_teams.0.label', 'Uma Manager')->where('groups.sub_teams.0.secondary', 'Unit A')
        ->where('person.label', 'Sam Sponsor')
        ->missing('personOptions'));

    $service = app(App\Services\NaoApprovalService::class);
    expect(collect($service->personOptions(null, 'Sam'))->pluck('value')->all())->toBe([$this->sponsor])
        ->and(collect($service->personOptions(null, 'Rita'))->pluck('value')->all())->toBe([$this->recruit])
        ->and($service->personOptions(null, 'S'))->toBe([]);

    // Someone outside the reader's reach isn't named back.
    $this->actingAs($this->sponsorUser)->get("/nao-approvals?person={$this->davao}")->assertInertia(fn ($page) => $page->where('person', null)->where('submissions.total', 0));
});

test('search finds an attendance by any detail: name, email, mobile, member #, sponsor, team, sub-team or branch', function () {
    DB::table('agents')->where('id', $this->davao)->update(['mobile' => '0917 555-1234']);
    $ids = fn (string $q) => collect($this->actingAs($this->staff)->get('/nao-approvals?status=all&q='.urlencode($q))->viewData('page')['props']['submissions']['data'])->pluck('id')->sort()->values()->all();

    expect($ids('Rita'))->toBe([$this->recruit])
        ->and($ids('Sam Spon'))->toBe([$this->recruit])
        ->and($ids('Unit A'))->toBe([$this->unitMember])
        ->and($ids('Team A'))->toContain($this->teamMember, $this->unitMember)
        ->and($ids('Davao'))->toBe([$this->davao])
        ->and($ids('09175551234'))->toBe([$this->davao])
        ->and($ids((string) $this->recruit))->toContain($this->recruit);
    // The counts search the same way.
    $this->actingAs($this->staff)->get('/nao-approvals?q=Davao')->assertInertia(fn ($page) => $page->where('counts.pending', 1));
});
