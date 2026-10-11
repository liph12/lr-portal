<?php

namespace App\Support;

// Which area (office) an agent belongs to, from their state or city (config/areas.php). Matching ignores case,
// spaces and punctuation, and goes from most to least specific:
//   1. the value is an area's own name ("Pampanga" → Pampanga, even though Metro Manila also lists it);
//   2. the value is one of an area's listed places ("Negros Occidental" → Bacolod);
//   3. the value contains an area's name ("Davao Del Sur" → Davao, "Cagayan de Oro City" → Cagayan);
//   4. the value contains a listed place ("Eastern Samar" → Leyte).
// Agents based abroad (a country code other than PH) are "abroad" regardless of what they typed as state.
final class Areas
{
    public const ABROAD = 'abroad';

    /** @var array{names: array<string, string>, places: array<string, string>}|null */
    private static ?array $index = null;

    public static function forAgent(?string $state, ?string $city, ?string $countryCode): ?string
    {
        if ($countryCode !== null && $countryCode !== '' && $countryCode !== 'PH') {
            return self::ABROAD;
        }

        return self::match($state) ?? self::match($city);
    }

    public static function name(?string $area): string
    {
        return config("areas.{$area}.name") ?? 'Unassigned';
    }

    private static function match(?string $value): ?string
    {
        $key = self::key((string) $value);

        if (strlen($key) < 3) {
            return null;
        }

        $index = self::index();

        if (isset($index['names'][$key])) {
            return $index['names'][$key];
        }
        if (isset($index['places'][$key])) {
            return $index['places'][$key];
        }
        foreach ($index['names'] as $name => $area) {
            if (str_contains($key, $name)) {
                return $area;
            }
        }
        foreach ($index['places'] as $place => $area) {
            if (str_contains($key, $place)) {
                return $area;
            }
        }

        return null;
    }

    /**
     * @return array{names: array<string, string>, places: array<string, string>}
     */
    private static function index(): array
    {
        if (self::$index !== null) {
            return self::$index;
        }

        $names = $places = [];
        foreach (config('areas') as $area => $definition) {
            if ($area === self::ABROAD) {
                continue;
            }
            $names[self::key($definition['name'])] = $area;
            foreach ($definition['places'] as $place) {
                // First listed wins, so a place under two areas keeps its first one.
                $places[self::key($place)] ??= $area;
            }
        }

        // Longer names first, so "metromanila" is tried before "manila"-like shorter ones.
        uksort($names, fn ($a, $b) => strlen($b) <=> strlen($a));
        uksort($places, fn ($a, $b) => strlen($b) <=> strlen($a));

        return self::$index = ['names' => $names, 'places' => $places];
    }

    private static function key(string $value): string
    {
        return preg_replace('/[^a-z]/', '', strtolower($value));
    }
}
