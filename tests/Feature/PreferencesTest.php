<?php

use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // The migration gives every role use_preferences; a role made later only has it if ticked.
    $this->role = Role::create(['name' => 'agent', 'label' => 'Agent']);
    $this->role->permissions()->attach(Permission::where('name', User::PREFERENCES_PERMISSION)->value('id'));
    $this->user = User::factory()->create();
    $this->user->roles()->attach($this->role);
});

function preferencesPayload(array $overrides = []): array
{
    return array_replace_recursive(['theme' => 'dark', 'font_size' => 'large', 'links' => ['default' => 'tab', 'sections' => ['/reports' => 'spa']]], $overrides);
}

test('every user starts on the defaults and saves their own preferences', function () {
    $this->actingAs($this->user)->get('/settings/preferences')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Portal/Settings/Preferences')
            ->where('auth.preferences.theme', null)
            ->where('auth.preferences.font_size', 'default')
            ->where('auth.preferences.links.default', 'spa')
            ->where('auth.preferences.links.sections', []));

    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload())->assertRedirect()->assertSessionHasNoErrors();

    expect($this->user->fresh()->preferences())->toBe(['theme' => 'dark', 'font_size' => 'large', 'links' => ['default' => 'tab', 'sections' => ['/reports' => 'spa']]]);
    expect(ActivityLog::where('action', 'preferences.updated')->exists())->toBeTrue();
    $this->actingAs($this->user)->get('/dashboard/main')
        ->assertInertia(fn ($page) => $page->where('auth.preferences.font_size', 'large')->where('auth.preferences.links.sections./reports', 'spa'));
});

test('the navbar theme switch saves only the theme', function () {
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload());
    $this->actingAs($this->user)->put('/settings/preferences/theme', ['theme' => 'system'])->assertRedirect();

    expect($this->user->fresh()->preferences())->toMatchArray(['theme' => 'system', 'font_size' => 'large']);
    $this->actingAs($this->user)->put('/settings/preferences/theme', ['theme' => 'neon'])->assertSessionHasErrors('theme');
});

test('preferences only take known values and menu paths', function () {
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload(['font_size' => 'huge']))->assertSessionHasErrors('font_size');
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload(['links' => ['default' => 'popup']]))->assertSessionHasErrors('links.default');
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload(['links' => ['sections' => ['/reports' => 'window']]]))->assertSessionHasErrors('links.sections./reports');
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload(['links' => ['sections' => ['javascript:alert(1)' => 'tab']]]))->assertSessionHasErrors('links.sections');
    expect($this->user->fresh()->preferences)->toBeNull();
});

test('without use_preferences there is no page and everything stays at its default', function () {
    $this->role->permissions()->detach();

    $this->actingAs($this->user)->get('/settings/preferences')->assertForbidden();
    $this->actingAs($this->user)->put('/settings/preferences', preferencesPayload())->assertForbidden();
    $this->actingAs($this->user)->put('/settings/preferences/theme', ['theme' => 'dark'])->assertForbidden();
    $this->actingAs($this->user)->get('/dashboard/main')->assertInertia(fn ($page) => $page->where('auth.preferences', null));
});
