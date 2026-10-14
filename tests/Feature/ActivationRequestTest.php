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
    $this->user = User::factory()->create();
    $this->user->roles()->attach(Role::create(['name' => 'agent', 'label' => 'Agent']));
    $this->agent = DB::table('agents')->insertGetId(['user_id' => $this->user->id, 'email' => $this->user->email, 'agent_type' => 'local', 'avatar' => 'https://files.test/me.webp']);
    DB::table('agent_attributes')->insert(['agent_id' => $this->agent, 'registration_status' => 4, 'nao_video_tracker' => 100, 'fire_certificates' => 3]);
    $this->activationStep = fn () => $this->actingAs($this->user)->get('/my-journey')->viewData('page')['props']['journey']['milestones'][4];
});

test('the last step asks for a request for activation with the sale\'s proof of transaction', function () {
    $this->actingAs($this->user)->get('/my-journey')->assertInertia(fn ($page) => $page->component('Portal/Agents/Journey')->has('maxFileKb'));
    expect(($this->activationStep)())->toMatchArray(['key' => 'activation', 'status' => 'current', 'activation' => null]);

    $this->actingAs($this->user)->post('/my-journey/activation-request', ['request_form' => UploadedFile::fake()->image('form.jpg')])
        ->assertSessionHasErrors('proof_of_transaction');
    expect(DB::table('activation_requests')->count())->toBe(0);

    $this->actingAs($this->user)->from('/my-journey')->post('/my-journey/activation-request', [
        'request_form' => UploadedFile::fake()->create('request.pdf', 200, 'application/pdf'),
        'proof_of_transaction' => UploadedFile::fake()->image('pot.jpg'),
        'notes' => 'Unit 5B',
    ])->assertRedirect('/my-journey')->assertSessionHas('success');

    $row = DB::table('activation_requests')->where('agent_id', $this->agent)->first();
    expect($row->request_form)->not->toBeEmpty()->and($row->proof_of_transaction)->not->toBeEmpty()->and($row->notes)->toBe('Unit 5B');
    $step = ($this->activationStep)();
    expect($step['status'])->toBe('waiting')->and($step['activation']['request_form'])->toBe($row->request_form);
});

test('someone without an agent record can\'t send one', function () {
    $other = User::factory()->create();
    $this->actingAs($other)->post('/my-journey/activation-request', [
        'request_form' => UploadedFile::fake()->image('form.jpg'),
        'proof_of_transaction' => UploadedFile::fake()->image('pot.jpg'),
    ])->assertStatus(403);
});
