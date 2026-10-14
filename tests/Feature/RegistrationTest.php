<?php

use App\Mail\RegistrationCodeMail;
use App\Models\Entities\Agent;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    Mail::fake();
    $this->agentRole = Role::create(['name' => 'agent', 'label' => 'Agent']);

    // The sponsor: on team Alpha and in its sub-team Alpha One, in Cebu.
    $sponsorUser = User::factory()->create(['name' => 'Sam Sponsor']);
    $this->sponsor = DB::table('agents')->insertGetId(['user_id' => $sponsorUser->id, 'email' => $sponsorUser->email, 'area' => 'cebu']);
    $lead = DB::table('agents')->insertGetId(['user_id' => User::factory()->create()->id, 'email' => 'lead@example.com']);
    $this->team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $lead, 'status' => 'active']);
    $this->sub = DB::table('sub_teams')->insertGetId(['name' => 'Alpha One', 'team_id' => $this->team, 'agent_id' => $lead, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $this->team, 'agent_id' => $this->sponsor, 'joined_at' => '2024-01-01', 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $this->sub, 'agent_id' => $this->sponsor, 'joined_at' => '2024-01-01', 'status' => 'active']);
    // The sponsor's referral code (the link is /register?ref={code}).
    $this->ref = Agent::find($this->sponsor)->referralCode();

    $this->details = [
        'first_name' => 'Nina', 'middle_name' => 'B', 'last_name' => 'Newton', 'gender' => 'Female', 'marital_status' => 'Single',
        'birthdate' => '1995-05-05', 'citizenship' => 'Filipino', 'mobile' => '09171234567', 'facebook' => 'https://facebook.com/nina',
        'tin' => '123-456-789-000', 'address' => '12 Mango Ave', 'barangay' => 'Lahug', 'city' => 'Cebu City', 'province' => 'Cebu',
        'postal_code' => '6000', 'education' => ['Bachelor of Science in Accountancy (BSA)'], 'professions' => ['Accountant'],
        'hobbies' => ['Chess', 'Baking'], 'skills' => 'Negotiation', 'password' => 'secret123', 'password_confirmation' => 'secret123',
    ];

    // The code from the last email sent.
    $this->code = function () {
        $code = null;
        Mail::assertSent(RegistrationCodeMail::class, function ($mail) use (&$code) {
            $code = $mail->code;

            return true;
        });

        return $code;
    };
});

test('the referral link names the sponsor and the team they\'ll join; a missing or bad link names nobody', function () {
    $this->get("/register?ref={$this->ref}")
        ->assertInertia(fn ($page) => $page->component('User/Auth/Register')->where('referral', $this->ref)
            ->where('sponsor', ['id' => $this->sponsor, 'name' => 'Sam Sponsor', 'avatar' => null, 'branch' => 'Cebu', 'team' => 'Alpha', 'sub_team' => 'Alpha One'])
            ->where('email', null));

    // The link is remembered for the rest of the visit; a new visitor without one sees nobody.
    $this->get('/register')->assertInertia(fn ($page) => $page->where('sponsor.id', $this->sponsor));
    $this->flushSession();
    $this->get('/register')->assertInertia(fn ($page) => $page->where('sponsor', null));
    $this->get('/register?ref=nosuchcode')->assertInertia(fn ($page) => $page->where('sponsor', null));
    // The agent id isn't a referral code: counting through ids reveals nobody.
    $this->get("/register?ref={$this->sponsor}")->assertInertia(fn ($page) => $page->where('sponsor', null));
});

test('a code is sent only once the sponsor is confirmed, to an email not in use, and not twice in a minute', function () {
    $this->post('/register/code', ['ref' => $this->ref, 'email' => 'nina@example.com'])->assertSessionHasErrors('confirm_sponsor');
    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => User::first()->email])->assertSessionHasErrors('email');
    $this->post('/register/code', ['ref' => 'nosuchcode', 'confirm_sponsor' => true, 'email' => 'nina@example.com'])->assertSessionHasErrors('ref');
    Mail::assertNothingSent();

    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => 'Nina@Example.com'])->assertSessionHasNoErrors();
    Mail::assertSent(RegistrationCodeMail::class, fn ($mail) => $mail->hasTo('nina@example.com') && strlen($mail->code) === 6);
    $this->get("/register?ref={$this->ref}")->assertInertia(fn ($page) => $page->where('email', 'nina@example.com'));

    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => 'nina@example.com'])->assertSessionHasErrors('email');
});

test('the steps can\'t be skipped: a wrong code is refused, and details need a confirmed email', function () {
    $this->get('/register/details')->assertRedirect('/register');
    $this->post('/register', $this->details)->assertForbidden();

    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => 'nina@example.com']);
    $wrong = ($this->code)() === '000000' ? '111111' : '000000';
    $this->post('/register/verify', ['code' => $wrong])->assertSessionHasErrors('code');
    $this->get('/register/details')->assertRedirect("/register?ref={$this->ref}");
});

test('a confirmed email registers a fully registered local agent on the sponsor\'s team and sub-team', function () {
    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => 'nina@example.com']);
    $this->post('/register/verify', ['code' => ($this->code)()])->assertRedirect('/register/details');
    $this->get('/register/details')->assertInertia(fn ($page) => $page->component('User/Auth/RegisterDetails')->where('email', 'nina@example.com')->where('sponsor.team', 'Alpha'));

    $this->post('/register', ['password' => 'short', 'password_confirmation' => 'nope'] + $this->details)->assertSessionHasErrors('password');
    $this->post('/register', $this->details)->assertRedirect(route('dashboard.index'));

    $user = User::where('email', 'nina@example.com')->first();
    $agent = Agent::where('user_id', $user->id)->first();
    $this->assertAuthenticatedAs($user);
    expect($user->name)->toBe('Nina Newton')
        ->and($user->roles()->pluck('name')->all())->toBe(['agent'])
        ->and($agent)->agent_type->toBe('local')->area->toBe('cebu')->citizenship->toBe('Filipino')->barangay->toBe('Lahug')
        ->and(DB::table('agent_attributes')->where('agent_id', $agent->id)->first())->referral_id->toBe($this->sponsor)->registration_status->toBe(Agent::FULLY_REGISTERED)
        ->and($agent->profile->hobbies)->toBe(['Chess', 'Baking'])
        ->and(DB::table('team_agents')->where('agent_id', $agent->id)->where('status', 'active')->value('team_id'))->toBe($this->team)
        ->and(DB::table('sub_team_agents')->where('agent_id', $agent->id)->where('status', 'active')->value('sub_team_id'))->toBe($this->sub)
        ->and(DB::table('agent_credentials')->where('agent_id', $agent->id)->value('tax_identification_no'))->toBe('123-456-789-000');

    // The session's registration is done: the steps start over for anyone else.
    auth()->logout();
    $this->get('/register/details')->assertRedirect('/register');
});

test('each agent gets one lasting referral code, shared with the app as their link', function () {
    expect($this->ref)->toMatch('/^[a-z2-9]{8}$/')
        ->and(Agent::find($this->sponsor)->referralCode())->toBe($this->ref);

    $sponsorUser = User::find(DB::table('agents')->where('id', $this->sponsor)->value('user_id'));
    $sponsorUser->roles()->attach($this->agentRole);
    $this->actingAs($sponsorUser)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.referral_url', url("/register?ref={$this->ref}")));
});

test('a Global Partner link registers a global partner abroad, on the sponsor\'s team, with its own role', function () {
    Role::create(['name' => 'global_partner', 'label' => 'Global Partner']);

    $this->get("/register?ref={$this->ref}&type=international")->assertInertia(fn ($page) => $page->where('type', 'international')->where('sponsor.id', $this->sponsor));
    $this->post('/register/code', ['ref' => $this->ref, 'type' => 'international', 'confirm_sponsor' => true, 'email' => 'gina@example.com'])->assertSessionHasNoErrors();
    $this->post('/register/verify', ['code' => ($this->code)()])->assertRedirect('/register/details');
    $this->get('/register/details')->assertInertia(fn ($page) => $page->where('type', 'international'));

    // Abroad, so a country is needed — and not the Philippines.
    $this->post('/register', $this->details)->assertSessionHasErrors('country');
    $this->post('/register', ['country' => 'PH'] + $this->details)->assertSessionHasErrors('country');
    $this->post('/register', ['country' => 'JP', 'city' => 'Osaka', 'province' => 'Osaka'] + $this->details)->assertRedirect();

    $user = User::where('email', 'gina@example.com')->first();
    $agent = Agent::where('user_id', $user->id)->first();
    expect($user->roles()->pluck('name')->all())->toBe(['global_partner'])
        ->and($agent)->agent_type->toBe('global_partner')->country_code->toBe('JP')->country->toBe('Japan')->area->toBe('abroad')
        ->and(DB::table('agent_attributes')->where('agent_id', $agent->id)->value('referral_id'))->toBe($this->sponsor)
        ->and(DB::table('team_agents')->where('agent_id', $agent->id)->where('status', 'active')->value('team_id'))->toBe($this->team);
});

test('a salesperson can\'t send a country: they\'re in the Philippines', function () {
    $this->post('/register/code', ['ref' => $this->ref, 'confirm_sponsor' => true, 'email' => 'nina@example.com']);
    $this->post('/register/verify', ['code' => ($this->code)()]);
    $this->post('/register', ['country' => 'JP'] + $this->details)->assertSessionHasErrors('country');
});
