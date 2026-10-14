<?php

use App\Models\ActivityLog;
use App\Models\Entities\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['name' => 'Mark Santos', 'email' => 'mark@example.com']);
    $this->agent = Agent::create([
        'user_id' => $this->user->id,
        'first_name' => 'mark',
        'last_name' => 'santos',
        'email' => 'mark@example.com',
        'avatar' => 'https://photos.example.com/mark.webp',
    ]);
});

test('the LR ID page carries what the card shows', function () {
    $this->travelTo('2026-10-14');

    $this->actingAs($this->user)->get('/dashboard/lr-id')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/LrId/Index')
            ->where('card.id', $this->agent->id)
            ->where('card.first_name', 'MARK')
            ->where('card.middle_name', null)
            ->where('card.last_name', 'SANTOS')
            ->where('card.title', 'Real Estate Salesperson')
            ->where('card.email', 'mark@example.com')
            ->where('card.photo', '/dashboard/lr-id/photo')
            ->where('card.profile_url', url('/business-profile/mark-santos'))
            ->where('card.expires_on', '2027-10-14'));
});

test('a middle name is sent apart, in capitals, so it can be left off the card', function () {
    $this->agent->forceFill(['middle_name' => 'dela cruz'])->save();

    $this->actingAs($this->user)->get('/dashboard/lr-id')
        ->assertInertia(fn ($page) => $page->where('card.middle_name', 'DELA CRUZ'));
});

test('a broker is titled as one and an account without a photo gets none', function () {
    $this->agent->forceFill(['is_broker' => true, 'avatar' => null])->save();

    $this->actingAs($this->user)->get('/dashboard/lr-id')
        ->assertInertia(fn ($page) => $page
            ->where('card.title', 'Licensed Real Estate Broker')
            ->where('card.photo', null));
});

test('the profile photo is served from this origin for the canvas', function () {
    Http::fake(['photos.example.com/*' => Http::response('webp-bytes', 200, ['Content-Type' => 'image/webp'])]);

    $this->actingAs($this->user)->get('/dashboard/lr-id/photo')
        ->assertOk()
        ->assertHeader('Content-Type', 'image/webp')
        ->assertContent('webp-bytes');
});

test('a photo that cannot be fetched is a 404, not an error page', function () {
    Http::fake(['photos.example.com/*' => Http::response('nope', 500)]);

    $this->actingAs($this->user)->get('/dashboard/lr-id/photo')->assertNotFound();
});

test('downloading the card is logged against the agent', function () {
    $this->actingAs($this->user)->from('/dashboard/lr-id')->post('/dashboard/lr-id/downloaded')
        ->assertRedirect('/dashboard/lr-id');

    $log = ActivityLog::where('action', 'lr_id.downloaded')->sole();
    expect($log->user_id)->toBe($this->user->id)
        ->and($log->subject_id)->toBe($this->agent->id);
});

test('guests are sent to sign in', function () {
    $this->get('/dashboard/lr-id')->assertRedirect('/login');
    $this->get('/dashboard/lr-id/photo')->assertRedirect('/login');
});
