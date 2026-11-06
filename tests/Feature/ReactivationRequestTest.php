<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    $this->agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $this->user = User::factory()->create();
    $this->user->roles()->attach($this->agentRole);
    // FIRE activated this agent (never having sold) four months ago, and AgentActivityService has already marked them
    // dormant — as if the FIRE_DEACTIVATE_AFTER_MONTHS window had run out.
    $this->agent = DB::table('agents')->insertGetId(['user_id' => $this->user->id, 'email' => $this->user->email, 'agent_type' => 'local', 'avatar' => 'https://files.test/me.webp', 'activity' => 'dormant']);
    DB::table('agent_attributes')->insert(['agent_id' => $this->agent, 'registration_status' => 4, 'nao_video_tracker' => 100, 'fire_certificates' => 3, 'fire_activated_at' => now()->subMonths(4)]);
    $this->activationStep = fn () => $this->actingAs($this->user)->get('/my-journey')->viewData('page')['props']['journey']['milestones'][4];
    $this->admin = User::factory()->create();
    $this->admin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
});

test('a dormant, never-sold agent sends a reactivation request, and approving it reactivates the account', function () {
    $step = ($this->activationStep)();
    expect($step)->toMatchArray(['key' => 'activation', 'status' => 'waiting']);
    expect($step['reactivation'])->toBeNull();

    $this->actingAs($this->user)->from('/my-journey')->post('/my-journey/reactivation-request', [
        'file' => UploadedFile::fake()->create('proof.pdf', 200, 'application/pdf'),
        'notes' => 'Closing a sale next week',
    ])->assertRedirect('/my-journey')->assertSessionHas('success');

    $row = DB::table('reactivation_requests')->where('agent_id', $this->agent)->first();
    expect($row->file)->not->toBeEmpty()->and($row->notes)->toBe('Closing a sale next week')->and($row->status)->toBe('pending');

    $step = ($this->activationStep)();
    expect($step['status'])->toBe('waiting')->and($step['reactivation']['file'])->toBe($row->file)->and($step['reactivation']['status'])->toBe('pending');

    $this->actingAs($this->admin)->post("/reactivation-requests/{$this->agent}/approve")->assertRedirect();

    expect(DB::table('agents')->where('id', $this->agent)->value('activity'))->toBe('active')
        ->and(DB::table('reactivation_requests')->where('agent_id', $this->agent)->value('status'))->toBe('approved')
        ->and(DB::table('agent_attributes')->where('agent_id', $this->agent)->value('fire_activated_at'))->not->toBeNull();

    // actingAs() pins this exact object as the resolved user for the rest of the test: its cached agent/activity would
    // otherwise still read as it was before the approval.
    $this->user = $this->user->fresh();
    $step = ($this->activationStep)();
    expect($step['status'])->toBe('done');
});

test('disapproving needs a reason, which the agent sees, and they can send another', function () {
    $this->actingAs($this->user)->post('/my-journey/reactivation-request', ['file' => UploadedFile::fake()->image('proof.jpg')]);

    $this->actingAs($this->admin)->post("/reactivation-requests/{$this->agent}/disapprove", [])->assertSessionHasErrors('reason');
    $this->actingAs($this->admin)->post("/reactivation-requests/{$this->agent}/disapprove", ['reason' => 'No sale evidence yet'])->assertRedirect();

    expect(DB::table('agents')->where('id', $this->agent)->value('activity'))->toBe('dormant');
    $step = ($this->activationStep)();
    expect($step['reactivation']['status'])->toBe('disapproved')->and($step['reactivation']['decline_reason'])->toBe('No sale evidence yet');

    $this->actingAs($this->user)->post('/my-journey/reactivation-request', ['file' => UploadedFile::fake()->image('again.jpg')])
        ->assertSessionHasNoErrors();
    expect(DB::table('reactivation_requests')->where('agent_id', $this->agent)->count())->toBe(2);
});

test('someone without an agent record can\'t send one', function () {
    $other = User::factory()->create();
    $this->actingAs($other)->post('/my-journey/reactivation-request', [
        'file' => UploadedFile::fake()->image('proof.jpg'),
    ])->assertStatus(403);
});

test('an agent who has not finished FIRE sees activation as not-yet-due, with no reactivation ask', function () {
    $user = User::factory()->create();
    $user->roles()->attach($this->agentRole);
    $agent = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'avatar' => 'https://files.test/me.webp']);
    DB::table('agent_attributes')->insert(['agent_id' => $agent, 'registration_status' => 4, 'nao_video_tracker' => 100, 'fire_certificates' => 1]);

    $step = $this->actingAs($user)->get('/my-journey')->viewData('page')['props']['journey']['milestones'][4];
    expect($step['key'])->toBe('activation')->and($step['status'])->not->toBe('done')->and($step['reactivation'] ?? null)->toBeNull();
});
