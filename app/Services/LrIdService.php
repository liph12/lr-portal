<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;

// Dashboard › Generate LR ID: the official agent ID card (front and back) is drawn in the browser from the agent's own
// record; this provides what goes on it, the photo in a same-origin form the canvas may use, and logs downloads.
class LrIdService
{
    // How long a freshly generated card is valid for; the expiry date on the back counts from today.
    public const VALID_MONTHS = 12;

    public function __construct(
        private ActivityLogger $activity,
        private ContactLinkService $links,
        private ProfileService $profiles,
    ) {}

    /**
     * What the card shows. The ID number is the agent's record id (the legacy member id lives on with it).
     *
     * @return array{id: int, first_name: string, middle_name: ?string, last_name: string, title: string, email: ?string, photo: ?string, profile_url: string, expires_on: string}
     */
    public function card(User $user): array
    {
        $agent = $this->profiles->agentFor($user);
        $card = $this->links->card($agent);
        // The name is printed in capitals; the middle name is sent apart so the agent can leave it off the card.
        $upper = fn (?string $value): string => mb_strtoupper(trim((string) $value));

        return [
            'id' => $agent->id,
            'first_name' => $upper($agent->first_name) ?: $upper($card['name']),
            'middle_name' => $upper($agent->middle_name) ?: null,
            'last_name' => $upper($agent->last_name),
            'title' => $card['title'],
            'email' => $card['email'],
            // Photos live on another host (S3, the old site); the canvas may only export same-origin images, so the
            // path is relative: whatever host the app is opened on, the photo comes from it.
            'photo' => $agent->avatar ? route('dashboard.lr-id.photo', absolute: false) : null,
            'profile_url' => url('/business-profile/'.$this->links->slugFor($agent)),
            'expires_on' => now()->addMonths(self::VALID_MONTHS)->toDateString(),
        ];
    }

    /**
     * The agent's profile photo fetched server-side, so the browser gets it from this origin.
     *
     * @return array{0: string, 1: string}|null [bytes, content type]
     */
    public function photo(User $user): ?array
    {
        $url = $user->agent()->value('avatar');
        if (! $url) {
            return null;
        }

        try {
            $response = Http::timeout(10)->get($url);
        } catch (\Throwable) {
            return null;
        }

        $type = (string) $response->header('Content-Type');
        if (! $response->successful() || ! str_starts_with($type, 'image/')) {
            return null;
        }

        return [$response->body(), $type];
    }

    public function downloaded(User $user): void
    {
        $agent = $this->profiles->agentFor($user);

        $this->activity->describe('lr_id.downloaded', 'Downloaded LR ID', $agent, ['agent_id' => $agent->id]);
    }
}
