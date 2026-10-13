<?php

use App\Models\ActivityLog;
use App\Models\Entities\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    config(['filesystems.profile_photos_disk' => 's3']);

    $this->user = User::factory()->create([
        'name' => 'Philip Libres',
        'email' => 'philip@example.com',
        'password' => 'OldPass123',
    ]);
});

function profilePayload(array $overrides = []): array
{
    return array_merge([
        'first_name' => 'Philip',
        'middle_name' => 'Santos',
        'last_name' => 'Libres',
        'email' => 'philip@example.com',
        'mobile' => '09171234567',
        'phone' => '',
        'gender' => 'Male',
        'marital_status' => 'Single',
        'address' => '123 Osmeña Blvd',
        'city' => 'Cebu City',
        'state' => 'Cebu',
        'about' => 'Top producer since 2020.',
        'facebook' => 'https://facebook.com/philip',
        'instagram' => 'https://instagram.com/philip',
        'twitter' => '',
        'linkedin' => '',
        'whatsapp' => '09171234567',
    ], $overrides);
}

function businessPayload(array $overrides = []): array
{
    return array_merge([
        'about' => 'Top producer since 2020.',
        'mobile' => '09171234567',
        'facebook' => 'https://facebook.com/philip',
        'instagram' => 'https://instagram.com/philip',
        'twitter' => '',
        'linkedin' => '',
        'whatsapp' => '09171234567',
    ], $overrides);
}

function avatarPath(string $url): string
{
    return ltrim(str_replace(rtrim(Storage::disk('s3')->url(''), '/'), '', $url), '/');
}

test('the profile page prefills names from the account when there is no agent record yet', function () {
    $this->actingAs($this->user)
        ->get('/profile')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Profile/Edit')
            ->where('profile.first_name', 'Philip')
            ->where('profile.last_name', 'Libres')
            ->where('profile.email', 'philip@example.com'));
});

test('guests are sent to the login page', function () {
    $this->get('/profile')->assertRedirect('/login');
});

test('saving creates the agent record and keeps the account in sync', function () {
    $this->actingAs($this->user)
        ->post('/profile', profilePayload(['first_name' => 'Phil', 'email' => 'phil@example.com', 'gender' => 'Female']))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Profile saved.');

    $agent = Agent::with('profile')->sole();

    expect($agent->user_id)->toBe($this->user->id)
        ->and($agent->first_name)->toBe('Phil')
        ->and($agent->email)->toBe('phil@example.com')
        ->and($agent->gender)->toBeFalse()
        ->and($agent->city)->toBe('Cebu City')
        ->and($agent->profile->about)->toBe('Top producer since 2020.')
        ->and($agent->profile->facebook)->toBe('https://facebook.com/philip')
        ->and($agent->profile->instagram)->toBe('https://instagram.com/philip')
        ->and($this->user->fresh()->name)->toBe('Phil Libres')
        ->and($this->user->fresh()->email)->toBe('phil@example.com');

    $this->actingAs($this->user)->post('/profile', profilePayload(['city' => 'Mandaue City']));
    expect(Agent::count())->toBe(1)->and(Agent::sole()->city)->toBe('Mandaue City');

    expect(ActivityLog::where('action', 'profile.updated')->count())->toBe(2);
});

test('an email used by someone else is rejected', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->actingAs($this->user)
        ->post('/profile', profilePayload(['email' => 'taken@example.com', 'facebook' => 'not a url']))
        ->assertSessionHasErrors(['email', 'facebook']);

    expect(Agent::count())->toBe(0);
});

test('the business profile page has only its own fields and saves them', function () {
    $this->actingAs($this->user)
        ->get('/profile/business')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Profile/Business')
            ->where('business.about', '')
            ->where('slug', null)
            ->missing('business.first_name'));

    $this->actingAs($this->user)
        ->post('/profile/business', businessPayload())
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Business profile saved.');

    $agent = Agent::with('profile')->sole();
    expect($agent->mobile)->toBe('09171234567')
        ->and($agent->profile->about)->toBe('Top producer since 2020.')
        ->and($agent->profile->facebook)->toBe('https://facebook.com/philip')
        ->and($agent->profile->instagram)->toBe('https://instagram.com/philip')
        ->and($agent->profile->whatsapp)->toBe('09171234567')
        ->and(ActivityLog::where('action', 'profile.business_updated')->count())->toBe(1);

    // Both forms edit the same record, so Edit profile shows what the business page saved.
    $this->actingAs($this->user)
        ->get('/profile')
        ->assertInertia(fn ($page) => $page->where('profile.about', 'Top producer since 2020.')->where('profile.mobile', '09171234567'));

    $this->actingAs($this->user)
        ->post('/profile/business', businessPayload(['facebook' => 'not a url']))
        ->assertSessionHasErrors(['facebook']);
});

test('a photo is cropped square, compressed to webp and stored as a full url', function () {
    $this->actingAs($this->user)
        ->post('/profile/photo', ['photo' => UploadedFile::fake()->image('me.jpg', 1600, 900)])
        ->assertSessionHasNoErrors();

    $url = Agent::sole()->avatar;
    $path = avatarPath($url);

    expect($url)->toBe(Storage::disk('s3')->url($path))
        ->and($path)->toStartWith("avatars/{$this->user->id}/")
        ->and($path)->toEndWith('.webp');

    $image = imagecreatefromstring(Storage::disk('s3')->get($path));
    expect(imagesx($image))->toBe(512)->and(imagesy($image))->toBe(512);

    $this->actingAs($this->user)
        ->get('/profile')
        ->assertInertia(fn ($page) => $page->where('auth.avatar', $url));
});

test('replacing a photo deletes the old one, and removing deletes it too', function () {
    $this->actingAs($this->user)->post('/profile/photo', ['photo' => UploadedFile::fake()->image('a.png', 400, 400)]);
    $first = avatarPath(Agent::sole()->avatar);

    $this->actingAs($this->user)->post('/profile/photo', ['photo' => UploadedFile::fake()->image('b.jpg', 400, 400)]);
    $second = avatarPath(Agent::sole()->avatar);

    Storage::disk('s3')->assertMissing($first);
    Storage::disk('s3')->assertExists($second);

    $this->actingAs($this->user)->delete('/profile/photo')->assertSessionHas('success');

    expect(Agent::sole()->avatar)->toBeNull();
    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('non-images and tiny images are rejected', function () {
    $this->actingAs($this->user)
        ->post('/profile/photo', ['photo' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf')])
        ->assertSessionHasErrors('photo');

    $this->actingAs($this->user)
        ->post('/profile/photo', ['photo' => UploadedFile::fake()->image('tiny.jpg', 40, 40)])
        ->assertSessionHasErrors(['photo' => 'The photo must be at least 96 × 96 pixels.']);

    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

test('the password changes only with the correct current password', function () {
    $this->actingAs($this->user)
        ->post('/profile/password', [
            'current_password' => 'wrong',
            'password' => 'NewPass456',
            'password_confirmation' => 'NewPass456',
        ])
        ->assertSessionHasErrors(['current_password' => 'Your current password is incorrect.']);

    $this->actingAs($this->user)
        ->post('/profile/password', [
            'current_password' => 'OldPass123',
            'password' => 'NewPass456',
            'password_confirmation' => 'NewPass456',
        ])
        ->assertSessionHasNoErrors();

    expect(Hash::check('NewPass456', $this->user->fresh()->password))->toBeTrue();

    $log = ActivityLog::where('action', 'profile.password_changed')->sole();
    expect($log->payload)->toMatchArray([
        'current_password' => '[redacted]',
        'password' => '[redacted]',
        'password_confirmation' => '[redacted]',
    ]);
});
