<?php

namespace App\Services;

use App\Models\Entities\ShortLink;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

// Dashboard › QR Code Maker: short links on the portal's own domain. A long or machine-made address in a QR code looks like a
// scam to the person scanning it; a short one under the LR domain reads as the company's — so agents may put one in front of
// any link they share, with a readable alias if they like.
class ShortLinkService
{
    // Generated codes: lowercase letters and digits that can't be confused with one another (no 0/o, 1/l/i).
    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    public const CODE_LENGTH = 6;

    // How many short links the page lists (the newest first).
    public const LISTED = 50;

    // Names a chosen alias may not take: pages at the root of this site and words kept for the portal.
    public const RESERVED = ['s', 'url', 'login', 'register', 'dashboard', 'profile', 'admin', 'superadmin', 'staff', 'contact', 'business-profile', 'home', 'logout', 'natcon', 'fire', 'lr', 'leuterio'];

    public function __construct(private ActivityLogger $activity) {}

    /**
     * The user's short links for the page.
     *
     * @return array<int, array{id: int, code: string, url: string, short_url: string, title: ?string, clicks: int, created_at: string}>
     */
    public function mine(User $user): array
    {
        return ShortLink::where('user_id', $user->id)->latest('id')->limit(self::LISTED)->get()
            ->map(fn (ShortLink $link) => $this->present($link))->all();
    }

    /**
     * Make a short link, or return the one the user already has for the same address (with no alias asked for).
     *
     * @return array{id: int, code: string, url: string, short_url: string, title: ?string, clicks: int, created_at: string}
     */
    public function shorten(User $user, string $url, ?string $alias = null, ?string $title = null): array
    {
        $url = self::normalize($url);

        if ($alias === null) {
            $existing = ShortLink::where('user_id', $user->id)->where('url', $url)->latest('id')->first();
            if ($existing) {
                return $this->present($existing);
            }
        }

        // A random code can collide; try again with a fresh one (an alias is checked by the request, so it never gets here twice).
        for ($attempt = 0; ; $attempt++) {
            $code = $alias ?? $this->code();
            try {
                $link = ShortLink::create(['user_id' => $user->id, 'code' => $code, 'url' => $url, 'title' => $title ?: null]);
                break;
            } catch (UniqueConstraintViolationException $e) {
                if ($alias !== null || $attempt >= 5) {
                    throw $e;
                }
            }
        }

        $this->activity->describe('short_link.created', 'Created short link /url/'.$link->code, $link, ['url' => $url, 'alias' => $alias !== null]);

        return $this->present($link);
    }

    public function delete(ShortLink $link): void
    {
        $link->delete();

        $this->activity->describe('short_link.deleted', 'Deleted short link /url/'.$link->code, $link, ['url' => $link->url]);
    }

    /**
     * Where a code points, counting the visit; null when there is no such link.
     */
    public function open(string $code): ?string
    {
        $link = ShortLink::where('code', $code)->first();
        if (! $link) {
            return null;
        }

        $link->newQuery()->whereKey($link->id)->update(['clicks' => $link->clicks + 1, 'last_clicked_at' => now()]);

        return $link->url;
    }

    // A pasted address without a scheme is taken as https; whitespace around it is dropped.
    public static function normalize(string $url): string
    {
        $url = trim($url);

        return preg_match('~^[a-z][a-z0-9+.-]*://~i', $url) ? $url : 'https://'.$url;
    }

    // An address on this site is never shortened into itself (a loop), nor are the short links themselves.
    public static function isOwnShortLink(string $url): bool
    {
        return str_starts_with(strtolower(self::normalize($url)), strtolower(url('/url/')));
    }

    private function code(): string
    {
        $code = '';
        $max = strlen(self::ALPHABET) - 1;
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= self::ALPHABET[random_int(0, $max)];
        }

        return $code;
    }

    /**
     * @return array{id: int, code: string, url: string, short_url: string, title: ?string, clicks: int, created_at: string}
     */
    private function present(ShortLink $link): array
    {
        return [
            'id' => $link->id,
            'code' => $link->code,
            'url' => $link->url,
            'short_url' => $link->shortUrl(),
            'title' => $link->title,
            'clicks' => $link->clicks,
            'created_at' => $link->created_at->toDateString(),
        ];
    }
}
