<?php

use App\Models\ActivityLog;
use App\Models\Entities\ShortLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

test('the QR maker lists your own short links and where they live', function () {
    $mine = ShortLink::create(['user_id' => $this->user->id, 'code' => 'abc234', 'url' => 'https://example.com/listing?id=1']);
    ShortLink::create(['user_id' => User::factory()->create()->id, 'code' => 'theirs', 'url' => 'https://example.com/other']);

    $this->actingAs($this->user)->get('/dashboard/qr-maker')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/QrMaker/Index')
            ->where('short_base', url('/url'))
            ->has('links', 1)
            ->where('links.0.id', $mine->id)
            ->where('links.0.short_url', url('/url/abc234'))
            ->where('links.0.clicks', 0));
});

test('shortening makes a code on this domain and logs it', function () {
    $this->actingAs($this->user)->from('/dashboard/qr-maker')
        ->post('/dashboard/qr-maker/links', ['url' => 'example.com/open-house?utm_source=fb&fbclid=xyz'])
        ->assertRedirect('/dashboard/qr-maker')
        ->assertSessionHas('success');

    $link = ShortLink::sole();
    expect($link->user_id)->toBe($this->user->id)
        ->and($link->url)->toBe('https://example.com/open-house?utm_source=fb&fbclid=xyz')
        ->and(strlen($link->code))->toBe(6)
        ->and(ActivityLog::where('action', 'short_link.created')->exists())->toBeTrue();
});

test('the same address is not shortened twice for one user', function () {
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/page']);
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/page']);

    expect(ShortLink::count())->toBe(1);
});

test('a chosen alias becomes the code and must be free and allowed', function () {
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/page', 'alias' => ' Open-House-Cebu '])
        ->assertSessionHasNoErrors();
    expect(ShortLink::where('code', 'open-house-cebu')->exists())->toBeTrue();

    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/again', 'alias' => 'open-house-cebu'])
        ->assertSessionHasErrors('alias');
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/again', 'alias' => 'dashboard'])
        ->assertSessionHasErrors('alias');
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'https://example.com/again', 'alias' => 'Bad Alias!'])
        ->assertSessionHasErrors('alias');
});

test('only web addresses are accepted, and never a short link itself', function () {
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'javascript:alert(1)'])->assertSessionHasErrors('url');
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => 'not a url'])->assertSessionHasErrors('url');
    $this->actingAs($this->user)->post('/dashboard/qr-maker/links', ['url' => url('/url/abc234')])->assertSessionHasErrors('url');
});

test('a short link opens its address for anyone and counts the visit', function () {
    $link = ShortLink::create(['user_id' => $this->user->id, 'code' => 'abc234', 'url' => 'https://example.com/listing?id=1']);

    $this->get('/url/abc234')->assertRedirect('https://example.com/listing?id=1');
    $this->get('/url/abc234')->assertRedirect('https://example.com/listing?id=1');

    expect($link->fresh()->clicks)->toBe(2)->and($link->fresh()->last_clicked_at)->not->toBeNull();
    $this->get('/url/nothere')->assertNotFound();
});

test('you may remove your own short links but not another\'s', function () {
    $mine = ShortLink::create(['user_id' => $this->user->id, 'code' => 'abc234', 'url' => 'https://example.com/a']);
    $theirs = ShortLink::create(['user_id' => User::factory()->create()->id, 'code' => 'xyz789', 'url' => 'https://example.com/b']);

    $this->actingAs($this->user)->delete("/dashboard/qr-maker/links/{$theirs->id}")->assertForbidden();
    $this->actingAs($this->user)->from('/dashboard/qr-maker')->delete("/dashboard/qr-maker/links/{$mine->id}")->assertRedirect('/dashboard/qr-maker');

    expect(ShortLink::count())->toBe(1)->and(ShortLink::find($mine->id))->toBeNull();
});
