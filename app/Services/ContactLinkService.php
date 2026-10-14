<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Support\Areas;
use App\Support\SocialLinks;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

// The public contact page: /contact/{slug}. A slug is made from the agent's name the first time it's needed and never
// changes afterwards, so a link that was already shared keeps working after a rename.
class ContactLinkService
{
    public const MAX_SLUG = 120;

    public function slugFor(Agent $agent): string
    {
        if ($agent->contact_slug) {
            return $agent->contact_slug;
        }

        $base = $this->baseSlug($agent);

        // Two agents with the same name: the later one gets -2, -3, … A clash with a concurrent request is retried.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $agent->contact_slug = $this->nextFree($base);

            try {
                $agent->save();

                return $agent->contact_slug;
            } catch (UniqueConstraintViolationException) {
                continue;
            }
        }

        $agent->contact_slug = $base.'-'.Str::lower(Str::random(6));
        $agent->save();

        return $agent->contact_slug;
    }

    // The slug behind "Your links" (/contact/{slug}, /business-profile/{slug}); null until the account has an agent
    // record (created on first profile use).
    public function slugForUser(User $user): ?string
    {
        $agent = $user->agent;

        return $agent ? $this->slugFor($agent) : null;
    }

    /**
     * What the public business profile shows: the contact card plus the About text and social links.
     *
     * @return array<string, mixed>
     */
    public function profile(Agent $agent): array
    {
        $profile = $agent->profile;
        $joined = $agent->lr_joined_at ?: $agent->created_at;

        return [
            ...$this->card($agent),
            'about' => trim((string) $profile?->about) ?: null,
            'area' => $agent->area ? Areas::name($agent->area) : null,
            'province' => self::titleCase($agent->state) ?: null,
            'joined_year' => $joined ? substr((string) $joined, 0, 4) : null,
            'socials' => [
                'facebook' => SocialLinks::facebook($profile?->facebook),
                'instagram' => self::link($profile?->instagram),
                'twitter' => self::link($profile?->twitter),
                'linkedin' => self::link($profile?->linkedin),
                'whatsapp' => self::whatsapp($profile?->whatsapp),
            ],
        ];
    }

    // A pasted profile link, with https:// added when it was left out; anything that isn't a link is dropped.
    public static function link(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || ! preg_match('~^(https?://)?([a-z0-9.-]+\.[a-z]{2,})(/\S*)?$~i', $value, $m)) {
            return null;
        }

        return 'https://'.$m[2].($m[3] ?? '');
    }

    // wa.me wants the number in international form; a local 09… number is Philippine.
    public static function whatsapp(?string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (strlen($digits) < 10) {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            $digits = '63'.substr($digits, 1);
        }

        return 'https://wa.me/'.$digits;
    }

    // Only agents whose account can still sign in have a public page.
    public function resolve(string $slug): ?Agent
    {
        return Agent::query()
            ->where('contact_slug', $slug)
            ->whereHas('user', fn ($q) => $q->where('status', User::STATUS_ACTIVE))
            ->with('user')
            ->first();
    }

    /**
     * What the public page shows about the agent.
     *
     * @return array<string, mixed>
     */
    public function card(Agent $agent): array
    {
        return [
            'name' => $this->displayName($agent),
            'title' => $agent->is_broker ? 'Licensed Real Estate Broker' : 'Real Estate Salesperson',
            'avatar' => $agent->avatar,
            'mobile' => $agent->mobile ?: $agent->phone,
            'email' => $agent->email ?: $agent->user?->email,
            'address' => $this->location($agent),
        ];
    }

    // vCard 3.0 for "Save contact": one line per field, nothing the card doesn't show.
    public function vcard(Agent $agent): string
    {
        $card = $this->card($agent);
        $escape = fn (?string $v) => str_replace([';', ',', "\n"], ['\;', '\,', '\n'], (string) $v);

        $lines = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            'N:'.$escape(self::titleCase($agent->last_name)).';'.$escape(self::titleCase($agent->first_name)).';'.$escape(self::titleCase($agent->middle_name)).';;',
            'FN:'.$escape($card['name']),
            'ORG:Leuterio Realty',
            'TITLE:'.$escape($card['title']),
        ];
        if ($card['mobile']) {
            $lines[] = 'TEL;TYPE=CELL:'.$escape($card['mobile']);
        }
        if ($card['email']) {
            $lines[] = 'EMAIL:'.$escape($card['email']);
        }
        if ($card['address']) {
            $lines[] = 'ADR;TYPE=WORK:;;'.$escape($card['address']).';;;;';
        }
        if ($card['avatar']) {
            $lines[] = 'PHOTO;VALUE=URI:'.$card['avatar'];
        }
        $lines[] = 'URL:'.url('/contact/'.$agent->contact_slug);
        $lines[] = 'END:VCARD';

        return implode("\r\n", $lines)."\r\n";
    }

    // Legacy records mix cases ("SARGADO", "cebu city"); the public page shows every name and place in Title Case.
    public static function titleCase(?string $value): string
    {
        return mb_convert_case(trim(preg_replace('/\s+/', ' ', (string) $value)), MB_CASE_TITLE, 'UTF-8');
    }

    // First and last name only: the middle name stays out of the public card (it is still in the vCard's N field).
    public function displayName(Agent $agent): string
    {
        $name = self::titleCase("{$agent->first_name} {$agent->last_name}");

        return $name !== '' ? $name : self::titleCase($agent->user?->name);
    }

    private function location(Agent $agent): ?string
    {
        $parts = array_filter([self::titleCase($agent->city), self::titleCase($agent->state)]);

        return $parts ? implode(', ', $parts) : null;
    }

    private function baseSlug(Agent $agent): string
    {
        $name = trim("{$agent->first_name} {$agent->last_name}") ?: (string) $agent->user?->name;
        $slug = Str::slug($name);

        if ($slug === '') {
            $slug = 'agent-'.$agent->id;
        }

        // Leave room for the "-99" suffix inside the column.
        return Str::limit($slug, self::MAX_SLUG - 4, '');
    }

    private function nextFree(string $base): string
    {
        $taken = Agent::query()
            ->where('contact_slug', $base)
            ->orWhere('contact_slug', 'like', $base.'-%')
            ->pluck('contact_slug')
            ->all();

        if (! in_array($base, $taken, true)) {
            return $base;
        }

        $max = 1;
        foreach ($taken as $slug) {
            if (preg_match('/^'.preg_quote($base, '/').'-(\d+)$/', $slug, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        return $base.'-'.($max + 1);
    }
}
