<?php

use App\Models\Entities\DashboardPoster;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('s3');
    config(['filesystems.profile_photos_disk' => 's3']);
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->agent = User::factory()->create();
    $this->agent->roles()->attach(Role::create(['name' => 'agent', 'label' => 'Agent']));
    $this->dashboardPosters = fn (User $user) => collect($this->actingAs($user)->get('/dashboard/main')->viewData('page')['props']['posters'])->pluck('title')->all();
});

test('the NATCON poster comes with the table, and everyone sees what is showing, in order', function () {
    expect(($this->dashboardPosters)($this->agent))->toBe(['National Real Estate Convention 2026']);

    $this->actingAs($this->superadmin)->post('/superadmin/settings/posters', [
        'title' => 'Mid-year awards',
        'image' => UploadedFile::fake()->image('awards.jpg', 1200, 515),
        'link_url' => 'https://example.com/awards',
        'is_active' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();
    $awards = DashboardPoster::where('title', 'Mid-year awards')->first();
    Storage::disk('s3')->assertExists(str_replace(Storage::disk('s3')->url(''), '', $awards->image_url));

    // Scheduled for later and switched-off posters aren't shown.
    DashboardPoster::create(['title' => 'Next month', 'image_url' => '/x.jpg', 'starts_on' => now()->addMonth()->toDateString(), 'is_active' => true, 'sort_order' => 9]);
    DashboardPoster::create(['title' => 'Off', 'image_url' => '/y.jpg', 'is_active' => false, 'sort_order' => 10]);
    DashboardPoster::create(['title' => 'Over', 'image_url' => '/z.jpg', 'ends_on' => now()->subDay()->toDateString(), 'is_active' => true, 'sort_order' => 11]);
    expect(($this->dashboardPosters)($this->agent))->toBe(['National Real Estate Convention 2026', 'Mid-year awards']);

    // Reorder: the new one first.
    $natcon = DashboardPoster::where('title', 'like', 'National%')->value('id');
    $this->actingAs($this->superadmin)->put('/superadmin/settings/posters/order', ['ids' => [$awards->id, $natcon]])->assertRedirect();
    expect(($this->dashboardPosters)($this->agent))->toBe(['Mid-year awards', 'National Real Estate Convention 2026']);

    // Hide one.
    $this->actingAs($this->superadmin)->patch("/superadmin/settings/posters/{$natcon}/active", ['is_active' => false])->assertRedirect();
    expect(($this->dashboardPosters)($this->agent))->toBe(['Mid-year awards']);

    $this->actingAs($this->superadmin)->get('/superadmin/settings/posters')->assertInertia(fn ($page) => $page
        ->component('SuperAdmin/Settings/Posters/Index')->has('posters', 5)->where('posters.1.state', 'hidden')->has('maxImageKb'));
});

test('editing replaces the image (the old stored file goes), deleting removes it, links are checked', function () {
    $this->actingAs($this->superadmin)->post('/superadmin/settings/posters', ['title' => 'Old', 'image' => UploadedFile::fake()->image('a.jpg', 600, 260)]);
    $poster = DashboardPoster::where('title', 'Old')->first();
    $oldPath = str_replace(Storage::disk('s3')->url(''), '', $poster->image_url);

    $this->actingAs($this->superadmin)->post("/superadmin/settings/posters/{$poster->id}", ['_method' => 'put', 'title' => 'New', 'link_url' => 'javascript:alert(1)'])
        ->assertSessionHasErrors('link_url');
    $this->actingAs($this->superadmin)->post("/superadmin/settings/posters/{$poster->id}", [
        '_method' => 'put', 'title' => 'New', 'link_url' => '/natcon', 'image' => UploadedFile::fake()->image('b.jpg', 600, 260),
    ])->assertSessionHasNoErrors();
    $poster->refresh();
    expect($poster->title)->toBe('New')->and($poster->link_url)->toBe('/natcon');
    Storage::disk('s3')->assertMissing($oldPath);

    $newPath = str_replace(Storage::disk('s3')->url(''), '', $poster->image_url);
    $this->actingAs($this->superadmin)->delete("/superadmin/settings/posters/{$poster->id}")->assertRedirect();
    expect(DashboardPoster::find($poster->id))->toBeNull();
    Storage::disk('s3')->assertMissing($newPath);
});

test('only the superadmin manages posters', function () {
    $this->actingAs($this->agent)->get('/superadmin/settings/posters')->assertForbidden();
    $this->actingAs($this->agent)->post('/superadmin/settings/posters', ['title' => 'x', 'image' => UploadedFile::fake()->image('x.jpg')])->assertForbidden();
    expect(DashboardPoster::count())->toBe(1);
});
