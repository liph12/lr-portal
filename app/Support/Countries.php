<?php

namespace App\Support;

// Turns free-typed country names (as found in the legacy data) into the canonical name + ISO code from
// config/countries.php. Unknown names keep their text with no code; blanks stay blank.
final class Countries
{
    // Spellings seen in the legacy data that don't match a canonical name once normalised.
    private const ALIASES = [
        'unitedstatesofamerica' => 'US', 'usa' => 'US', 'us' => 'US', 'america' => 'US',
        'uk' => 'GB', 'england' => 'GB', 'scotland' => 'GB', 'greatbritain' => 'GB',
        'uae' => 'AE', 'unitedaraberimates' => 'AE', 'unitedarabemirate' => 'AE', 'dubai' => 'AE', 'abudhabi' => 'AE',
        'ksa' => 'SA', 'saudi' => 'SA', 'kingdomofsaudiarabia' => 'SA',
        'hongkong' => 'HK', 'hk' => 'HK', 'korea' => 'KR', 'republicofkorea' => 'KR', 'koreasouth' => 'KR', 'korearepublicof' => 'KR',
        'macao' => 'MO', 'unitedarabofemirates' => 'AE', 'korearepublic' => 'KR', 'dubaiuae' => 'AE', 'taiwanprovinceofchina' => 'TW', 'thai' => 'TH',
    ];

    // Philippine places typed where the country should be.
    private const PH_PLACES = ['cebu', 'cebucity', 'manila', 'metromanila', 'davao', 'iloilo', 'bohol', 'aklan', 'misamisoriental', 'cagayandeoro'];

    // Placeholders that mean "no country".
    private const BLANKS = ['na', 'none', 'null', 'nil', 'n', 'p'];

    /** @var array<string, string>|null normalised name => code */
    private static ?array $index = null;

    /**
     * @return array{name: ?string, code: ?string}
     */
    public static function resolve(?string $raw): array
    {
        $text = trim(preg_replace('/\s+/', ' ', (string) $raw));

        if ($text === '' || $text === '0') {
            return ['name' => null, 'code' => null];
        }

        if (in_array(preg_replace('/[^a-z]/', '', strtolower($text)), ['', ...self::BLANKS], true)) {
            return ['name' => null, 'code' => null];
        }

        $code = self::codeFor($text);
        $names = config('countries');

        return [
            'name' => $code ? $names[$code] : mb_substr($text, 0, 100),
            'code' => $code,
        ];
    }

    private static function codeFor(string $text): ?string
    {
        // Already an ISO code (what the sale forms store).
        if (preg_match('/^[A-Z]{2}$/', $text) && isset(config('countries')[$text])) {
            return $text;
        }

        $key = preg_replace('/[^a-z]/', '', strtolower($text));

        if ($key === '') {
            return null;
        }

        // Every way the Philippines was typed: Philippines, phillipines, Phiippines, Pilipinas, Phils., PH, phl,
        // "Manila, Philippines", or just a Philippine place.
        if (in_array($key, ['ph', 'phl', 'phi', 'php', 'phil', 'phils', 'pilipinas'], true)
            || (str_starts_with($key, 'ph') && preg_match('/p+[ie]n/', substr($key, 2)))
            || str_contains($key, 'philip') || preg_match('/^phil+i?p+h?i?n/', $key)
            || in_array($key, self::PH_PLACES, true)
            || (bool) array_filter(self::PH_PLACES, fn ($place) => str_starts_with($key, $place) && str_contains($key, 'phil'))) {
            return 'PH';
        }

        if (self::$index === null) {
            self::$index = [];
            foreach (config('countries') as $code => $name) {
                self::$index[preg_replace('/[^a-z]/', '', strtolower($name))] = $code;
            }
        }

        return self::$index[$key] ?? self::ALIASES[$key] ?? null;
    }
}
