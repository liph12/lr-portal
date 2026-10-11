<?php

namespace App\Support;

// Turns what agents typed as their Facebook into a link, or null when it isn't one (legacy data is mixed: full URLs,
// URLs without https://, bare usernames, display names with spaces, other sites, "n/a").
final class SocialLinks
{
    private const FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com', 'www.fb.com', 'fb.me'];

    private const BLANKS = ['n/a', 'na', 'none', 'null', '-', '.', 'no', 'nil'];

    public static function facebook(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '' || in_array(strtolower($value), self::BLANKS, true)) {
            return null;
        }

        // A link (with https://, a path, or a Facebook host): only Facebook's own hosts. Otherwise "juan.cruz" is a
        // username, not a website.
        $looksLikeLink = str_contains($value, '://') || str_contains($value, '/') || preg_match('~^(www\.|m\.|web\.)?(facebook\.com|fb\.com|fb\.me)$~i', $value);
        if ($looksLikeLink && preg_match('~^(https?://)?([a-z0-9.-]+\.[a-z]{2,})(/.*)?$~i', $value, $m)) {
            $host = strtolower($m[2]);

            return in_array($host, self::FACEBOOK_HOSTS, true) && ($m[3] ?? '') !== '' ? 'https://'.$host.$m[3] : null;
        }
        if ($looksLikeLink) {
            return null;
        }

        // A bare username (letters, digits, dots); a name with spaces can't be linked reliably.
        return preg_match('/^[A-Za-z0-9.]{3,50}$/', $value) ? 'https://www.facebook.com/'.$value : null;
    }
}
