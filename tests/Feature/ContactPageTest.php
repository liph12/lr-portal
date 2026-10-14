<?php

use App\Mail\ContactInquiryReceived;
use App\Models\Entities\Agent;
use App\Models\Entities\ContactInquiry;
use App\Models\User;
use App\Services\ContactLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(fn () => Mail::fake());

function contactAgent(string $first, string $last, array $overrides = []): Agent
{
    $user = User::factory()->create(['name' => "{$first} {$last}", 'email' => fake()->unique()->safeEmail()]);

    return Agent::create(array_merge([
        'user_id' => $user->id,
        'first_name' => $first,
        'last_name' => $last,
        'email' => $user->email,
        'mobile' => '09171234567',
        'city' => 'Cebu City',
        'state' => 'Cebu',
    ], $overrides));
}

function inquiryPayload(array $overrides = []): array
{
    return array_merge([
        'inquirer_role' => 'Interested Buyer',
        'inquiry_type' => 'General Inquiry',
        'first_name' => 'Juan',
        'middle_name' => 'Dela',
        'last_name' => 'Cruz',
        'email' => 'juan@example.com',
        'contact_number' => '09181234567',
        'message' => 'Is the condo near IT Park still available?',
        'consent' => true,
    ], $overrides);
}

test('slugs come from the name and get a number when the name is taken', function () {
    $links = app(ContactLinkService::class);

    expect($links->slugFor(contactAgent('Mark', 'Sargado')))->toBe('mark-sargado')
        ->and($links->slugFor(contactAgent('Mark', 'Sargado')))->toBe('mark-sargado-2')
        ->and($links->slugFor(contactAgent('Mark', 'Sargado')))->toBe('mark-sargado-3')
        ->and($links->slugFor(contactAgent('Ana', 'Reyes')))->toBe('ana-reyes');
});

test('a slug is assigned once and kept after a rename', function () {
    $links = app(ContactLinkService::class);
    $agent = contactAgent('Mark', 'Sargado');

    $slug = $links->slugFor($agent);
    $agent->update(['first_name' => 'Marco']);

    expect($links->slugFor($agent->fresh()))->toBe($slug)
        ->and($agent->fresh()->contact_slug)->toBe('mark-sargado');
});

test('the dashboard shares the contact link and creates the agent record if needed', function () {
    $user = User::factory()->create(['name' => 'Philip Libres']);

    $this->actingAs($user)
        ->get('/dashboard/main')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Portal/Dashboard/Index')
            ->where('auth.contact_slug', 'philip-libres'));

    expect($user->agent()->value('contact_slug'))->toBe('philip-libres');
});

test('the public contact page shows the agent card without signing in', function () {
    $agent = contactAgent('Mark', 'Sargado');
    $agent->forceFill(['is_broker' => true])->save();
    app(ContactLinkService::class)->slugFor($agent);

    $this->get('/contact/mark-sargado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Contact/Show')
            ->where('slug', 'mark-sargado')
            ->where('agent.name', 'Mark Sargado')
            ->where('agent.title', 'Licensed Real Estate Broker')
            ->where('agent.mobile', '09171234567')
            ->where('agent.address', 'Cebu City, Cebu')
            ->where('options.roles', ContactInquiry::ROLES));
});

test('the public card leaves the middle name out', function () {
    $agent = contactAgent('Juan', 'Cruz', ['middle_name' => 'Dela']);
    app(ContactLinkService::class)->slugFor($agent);

    $this->get('/contact/juan-cruz')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('agent.name', 'Juan Cruz'));

    expect($this->get('/contact/juan-cruz/vcard')->getContent())
        ->toContain('FN:Juan Cruz')
        ->toContain('N:Cruz;Juan;Dela;;');
});

test('the agent card is shown in Title Case whatever the record holds', function () {
    $agent = contactAgent('mark lawrince', 'SARGADO', ['city' => 'bayugan city', 'state' => 'AGUSAN DEL SUR']);
    app(ContactLinkService::class)->slugFor($agent);

    $this->get('/contact/mark-lawrince-sargado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('agent.name', 'Mark Lawrince Sargado')
            ->where('agent.address', 'Bayugan City, Agusan Del Sur'));

    expect($this->get('/contact/mark-lawrince-sargado/vcard')->getContent())
        ->toContain('N:Sargado;Mark Lawrince;;;')
        ->toContain('FN:Mark Lawrince Sargado');
});

test('a signed-in visitor gets their account in the header, a guest does not', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);

    $this->get('/contact/mark-sargado')
        ->assertInertia(fn ($page) => $page->where('auth', null));

    $this->actingAs(User::factory()->create(['name' => 'Ana Reyes']))
        ->get('/contact/mark-sargado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('auth.name', 'Ana Reyes')->where('auth.home', route('dashboard.index')));
});

test('unknown slugs and deactivated agents are not found', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);
    User::whereKey($agent->user_id)->update(['status' => User::STATUS_INACTIVE]);

    $this->get('/contact/mark-sargado')->assertNotFound();
    $this->get('/contact/nobody-here')->assertNotFound();
});

test('a visitor can send an inquiry which is stored for the agent', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);

    $this->from('/contact/mark-sargado')
        ->post('/contact/mark-sargado', inquiryPayload(['first_name' => 'juan', 'middle_name' => 'DELA', 'last_name' => 'cRuZ']))
        ->assertRedirect('/contact/mark-sargado')
        ->assertSessionHas('success');

    $inquiry = ContactInquiry::sole();
    expect($inquiry->agent_id)->toBe($agent->id)
        ->and($inquiry->fullName())->toBe('Juan Dela Cruz')
        ->and($inquiry->inquiry_type)->toBe('General Inquiry')
        ->and($inquiry->consented_at)->not->toBeNull();

    Mail::assertQueued(ContactInquiryReceived::class, fn ($mail) => $mail->hasTo($agent->email)
        && $mail->hasReplyTo('juan@example.com')
        && $mail->inquiry->is($inquiry));
});

test('the inquiry email reads well', function () {
    $agent = contactAgent('mark', 'SARGADO');
    app(ContactLinkService::class)->slugFor($agent);
    $inquiry = $agent->inquiries()->create(inquiryPayload(['consent' => null]) + ['consented_at' => now()]);

    $html = (new ContactInquiryReceived($inquiry))->render();

    expect($html)->toContain('Hi Mark')
        ->toContain('Juan Dela Cruz')
        ->toContain('Is the condo near IT Park still available?')
        ->toContain('juan@example.com')
        ->toContain('General Inquiry');
});

test('an inquiry needs the required fields and the consent box', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);

    $this->from('/contact/mark-sargado')
        ->post('/contact/mark-sargado', inquiryPayload([
            'first_name' => '',
            'email' => 'not-an-email',
            'contact_number' => 'abc',
            'inquiry_type' => 'Something else',
            'consent' => false,
        ]))
        ->assertRedirect('/contact/mark-sargado')
        ->assertSessionHasErrors(['first_name', 'email', 'contact_number', 'inquiry_type', 'consent']);

    expect(ContactInquiry::count())->toBe(0);
});

test('only a real email address is accepted and it is stored lowercase', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);

    foreach (['juan', 'juan@', '@example.com', 'juan@example', 'juan @example.com', 'juan@exa mple.com'] as $bad) {
        $this->from('/contact/mark-sargado')
            ->post('/contact/mark-sargado', inquiryPayload(['email' => $bad]))
            ->assertSessionHasErrors('email');
    }
    expect(ContactInquiry::count())->toBe(0);

    $this->post('/contact/mark-sargado', inquiryPayload(['email' => '  Juan.Cruz@Example.COM ']))
        ->assertSessionHasNoErrors();
    expect(ContactInquiry::sole()->email)->toBe('juan.cruz@example.com');
});

test('save contact downloads a vCard', function () {
    $agent = contactAgent('Mark', 'Sargado');
    app(ContactLinkService::class)->slugFor($agent);

    $response = $this->get('/contact/mark-sargado/vcard')
        ->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="mark-sargado.vcf"');

    expect($response->getContent())
        ->toContain('FN:Mark Sargado')
        ->toContain('TEL;TYPE=CELL:09171234567')
        ->toContain('ADR;TYPE=WORK:;;Cebu City\\, Cebu;;;;');
});

test('the business profile shows about, social links and the way to the inquiry form', function () {
    $agent = contactAgent('mark', 'SARGADO');
    $agent->profile()->create([
        'about' => 'Web Developer of Filipinohomes',
        'facebook' => 'facebook.com/mark.sargado',
        'instagram' => 'instagram.com/marksargado',
        'twitter' => '',
        'linkedin' => 'https://linkedin.com/in/marksargado',
        'whatsapp' => '0910 193 0243',
    ]);
    app(ContactLinkService::class)->slugFor($agent);

    $this->get('/business-profile/mark-sargado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('BusinessProfile/Show')
            ->where('slug', 'mark-sargado')
            ->where('agent.name', 'Mark Sargado')
            ->where('agent.about', 'Web Developer of Filipinohomes')
            ->where('agent.socials.facebook', 'https://facebook.com/mark.sargado')
            ->where('agent.socials.instagram', 'https://instagram.com/marksargado')
            ->where('agent.socials.twitter', null)
            ->where('agent.socials.linkedin', 'https://linkedin.com/in/marksargado')
            ->where('agent.socials.whatsapp', 'https://wa.me/639101930243'));

    $this->get('/business-profile/nobody')->assertNotFound();
});

test('the dashboard links use the slug for both public pages', function () {
    $this->actingAs(User::factory()->create(['name' => 'Philip Libres']))
        ->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->where('auth.contact_slug', 'philip-libres'));
});
