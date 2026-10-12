<?php

namespace App\Services;

use App\Models\User;

class UserPreferenceService
{
    public function __construct(private ActivityLogger $activity) {}

    /**
     * @param  array{theme: string, font_size: string, genealogy_per_branch: int, genealogy_layout: string, links: array{default: string, sections: array<string, string>}}  $data  validated UpdatePreferencesRequest input
     */
    public function update(User $user, array $data): void
    {
        $user->forceFill(['preferences' => [
            'theme' => $data['theme'],
            'font_size' => $data['font_size'],
            'genealogy_per_branch' => (int) $data['genealogy_per_branch'],
            'genealogy_layout' => $data['genealogy_layout'],
            'links' => ['default' => $data['links']['default'], 'sections' => $data['links']['sections']],
        ]])->save();

        $this->activity->describe('preferences.updated', 'Changed their preferences', $user);
    }

    /**
     * @param  array{genealogy_per_branch?: int|string, genealogy_layout?: string}  $data  validated UpdateGenealogyPreferenceRequest input
     */
    public function setGenealogy(User $user, array $data): void
    {
        $changes = array_filter([
            'genealogy_per_branch' => isset($data['genealogy_per_branch']) ? (int) $data['genealogy_per_branch'] : null,
            'genealogy_layout' => $data['genealogy_layout'] ?? null,
        ], fn ($value) => $value !== null);

        $user->forceFill(['preferences' => $changes + ($user->preferences ?? [])])->save();
    }

    public function setTheme(User $user, string $theme): void
    {
        $user->forceFill(['preferences' => ['theme' => $theme] + ($user->preferences ?? [])])->save();
    }

    // Shared as auth.preferences: only for users allowed to use Preferences; everyone else gets the defaults.
    public function sharedFor(User $user): ?array
    {
        if (! $user->can(User::PREFERENCES_PERMISSION)) {
            return null;
        }
        $preferences = $user->preferences();
        // An object even when empty, so the UI can always index it by path.
        $preferences['links']['sections'] = (object) $preferences['links']['sections'];

        return $preferences;
    }
}
