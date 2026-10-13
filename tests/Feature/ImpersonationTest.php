<?php

use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;
use App\Services\ImpersonationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['name' => 'Super Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->agent = User::factory()->create(['name' => 'Ana Agent']);
    $this->agent->roles()->attach(Role::create(['name' => 'agent', 'label' => 'Agent']));
});

test('a superadmin signs in as an agent, sees what they see, and returns', function () {
    $this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}")->assertRedirect(route('dashboard.index'));

    $this->assertAuthenticatedAs($this->agent);
    expect(session(ImpersonationService::SESSION_KEY))->toBe($this->superadmin->id);

    $this->get('/dashboard/main')->assertInertia(fn ($page) => $page
        ->where('auth.name', 'Ana Agent')
        ->where('auth.role', 'Agent')
        ->where('auth.impersonator', ['id' => $this->superadmin->id, 'name' => 'Super Admin'])
        ->where('auth.can.impersonate', false));
    $this->get('/superadmin/settings')->assertForbidden();

    $this->delete('/impersonate')->assertRedirect(route('dashboard.index'));
    $this->assertAuthenticatedAs($this->superadmin);
    expect(session()->has(ImpersonationService::SESSION_KEY))->toBeFalse();

    expect(ActivityLog::where('action', 'auth.impersonation_started')->value('properties'))->toMatchArray(['impersonator_id' => $this->superadmin->id])
        ->and(ActivityLog::where('action', 'auth.impersonation_stopped')->exists())->toBeTrue();
});

test('actions taken while signed in as someone record who really did them', function () {
    $this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}");
    $this->post('/view-as', ['role' => 'agent']);

    expect(ActivityLog::latest('id')->first()->properties)->toMatchArray(['impersonated_by' => $this->superadmin->id]);
});

test('only superadmins can do it, never on superadmins or inactive users, and not from inside another account', function () {
    $other = User::factory()->create();
    $other->roles()->attach(Role::where('name', 'superadmin')->first());
    $inactive = User::factory()->create(['status' => 'inactive']);
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));

    $this->actingAs($admin)->post("/impersonate/{$this->agent->id}")->assertForbidden();
    $this->actingAs($this->superadmin)->post("/impersonate/{$other->id}")->assertSessionHasErrors('user');
    $this->actingAs($this->superadmin)->post("/impersonate/{$inactive->id}")->assertSessionHasErrors('user');
    $this->assertAuthenticatedAs($this->superadmin);

    // Nothing to return from: just home, still themselves.
    $this->actingAs($this->agent)->delete('/impersonate')->assertRedirect(route('dashboard.index'));
    $this->assertAuthenticatedAs($this->agent);
});

test('returning twice (double click, another tab) lands back on the dashboard instead of an error page at /impersonate', function () {
    $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    $inertia = ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) $version, 'Referer' => url('/dashboard/main')];

    $this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}");
    $this->delete('/impersonate', [], $inertia)->assertStatus(303)->assertRedirect(route('dashboard.index'));

    // The second click: already back. It must not become the Error page with url /impersonate (a GET-less route that
    // every later reload of "the current page" would then request).
    $second = $this->delete('/impersonate', [], $inertia);
    $second->assertStatus(303)->assertRedirect(route('dashboard.index'));
    $this->assertAuthenticatedAs($this->superadmin);

    // A browser that already has /impersonate in its history: a refresh or back goes home, not to a 405.
    $this->get('/impersonate')->assertRedirect(route('dashboard.index'));
});

test('any write refused in the browser goes back to the page it came from, with the reason as a toast', function () {
    $version = app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());

    $this->actingAs($this->agent)
        ->post("/impersonate/{$this->superadmin->id}", [], ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) $version, 'Referer' => url('/dashboard/main')])
        ->assertRedirect(url('/dashboard/main'))
        ->assertSessionHas('error');
});

test('a slow request still on the old session can\'t switch the browser back after returning', function () {
    // The real store: the bug lives in database sessions and the cookie each response sends.
    config(['session.driver' => 'database']);
    app('session')->forgetDrivers();
    $cookie = config('session.cookie');
    // Between requests, as a browser would: a fresh guard and session object (the test app otherwise reuses them).
    $next = function ($response, ?string $previous = null) use ($cookie) {
        app('auth')->forgetGuards();
        app('session')->driver()->flush();
        $sent = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === $cookie);

        return $sent ? \Illuminate\Cookie\CookieValuePrefix::remove(decrypt($sent->getValue(), false)) : $previous;
    };

    // Signed in as the agent: session A.
    $a = $next($this->actingAs($this->superadmin)->post("/impersonate/{$this->agent->id}"));
    $slowRequestSees = DB::table('sessions')->where('id', $a)->value('payload');

    // "Return to my account": session B.
    $returned = $this->withCookie($cookie, $a)->delete('/impersonate');
    $b = $next($returned, $a);
    expect($b)->not->toBe($a);

    // A background request that started on A before the return (it loaded A's data) finishes now.
    DB::table('sessions')->updateOrInsert(['id' => $a], ['payload' => $slowRequestSees, 'last_activity' => time(), 'user_id' => $this->agent->id]);
    $late = $this->withCookie($cookie, $a)->get('/dashboard/main');

    // It must not hand session A back to the browser, nor keep A alive; the page is asked for again (with B).
    $late->assertRedirect(url('/dashboard/main'));
    expect($next($late, $b))->toBe($b)
        ->and(DB::table('sessions')->where('id', $a)->exists())->toBeFalse();

    // The browser stays on B: the superadmin.
    $next($late);
    $this->withCookie($cookie, $b)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.id', $this->superadmin->id)->where('auth.impersonator', null));
});

test('starting works the same way: a slow request still on the superadmin\'s session can\'t pull the browser back', function () {
    config(['session.driver' => 'database']);
    app('session')->forgetDrivers();
    $cookie = config('session.cookie');
    $next = function ($response, ?string $previous = null) use ($cookie) {
        app('auth')->forgetGuards();
        app('session')->driver()->flush();
        $sent = collect($response->headers->getCookies())->first(fn ($c) => $c->getName() === $cookie);

        return $sent ? \Illuminate\Cookie\CookieValuePrefix::remove(decrypt($sent->getValue(), false)) : $previous;
    };

    // The superadmin's own signed-in session S, then "sign in as" the agent: session A.
    $s = \Illuminate\Support\Str::random(40);
    $superadminSees = base64_encode(serialize(['_token' => \Illuminate\Support\Str::random(40), 'login_web_'.sha1(\Illuminate\Auth\SessionGuard::class) => $this->superadmin->id]));
    DB::table('sessions')->insert(['id' => $s, 'payload' => $superadminSees, 'last_activity' => time(), 'user_id' => $this->superadmin->id]);
    $a = $next($this->withCookie($cookie, $s)->post("/impersonate/{$this->agent->id}"), $s);
    expect($a)->not->toBe($s);

    // A prefetch / poll that loaded S before the switch finishes now.
    DB::table('sessions')->updateOrInsert(['id' => $s], ['payload' => $superadminSees, 'last_activity' => time(), 'user_id' => $this->superadmin->id]);
    $late = $this->withCookie($cookie, $s)->get('/reports');
    $late->assertRedirect(url('/reports'));
    expect($next($late, $a))->toBe($a);

    // Still the agent.
    $this->withCookie($cookie, $a)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.id', $this->agent->id)->where('auth.impersonator.id', $this->superadmin->id));
});
