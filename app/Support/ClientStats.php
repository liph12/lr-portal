<?php

namespace App\Support;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Client splits shared by the sales reports and /statistics. Each takes a query of sale rows exposing client_country,
// client_gender, client_age and value.
final class ClientStats
{
    // A believable buyer's age; 0, 5, 10 or 100+ are typos and are left out of the age split.
    public const MIN_AGE = 18;
    public const MAX_AGE = 99;

    // Lower bound => label; each band runs up to the next bound.
    private const AGE_BANDS = [18 => '18–24', 25 => '25–34', 35 => '35–44', 45 => '45–54', 55 => '55–64', 65 => '65+'];

    private const TOP_COUNTRIES = 10;

    /**
     * Top countries by value ("PH" and legacy "Philippines" merged), the rest as "Other countries".
     *
     * @return array<int, array{name: string, code: ?string, sales: int, value: float}>
     */
    public static function countries(Builder $sales): array
    {
        $merged = [];
        DB::query()->fromSub($sales, 's')
            ->groupBy('s.client_country')
            ->selectRaw('s.client_country as raw, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
            ->get()
            ->each(function ($r) use (&$merged) {
                ['name' => $name, 'code' => $code] = Countries::resolve($r->raw);
                $key = $name ?? 'Not specified';
                $merged[$key] ??= ['name' => $key, 'code' => $code, 'sales' => 0, 'value' => 0.0];
                $merged[$key]['sales'] += (int) $r->sales;
                $merged[$key]['value'] += (float) $r->value;
            });

        usort($merged, fn ($a, $b) => $b['value'] <=> $a['value']);
        $top = array_slice($merged, 0, self::TOP_COUNTRIES);
        $rest = array_slice($merged, self::TOP_COUNTRIES);

        if ($rest) {
            $top[] = ['name' => 'Other countries', 'code' => null, 'sales' => array_sum(array_column($rest, 'sales')), 'value' => array_sum(array_column($rest, 'value'))];
        }

        return $top;
    }

    /**
     * Always Male, Female, Not specified (in that order, so each keeps its colour).
     *
     * @return array<int, array{name: string, sales: int, value: float}>
     */
    public static function genders(Builder $sales): array
    {
        $rows = ['Male' => ['name' => 'Male', 'sales' => 0, 'value' => 0.0], 'Female' => ['name' => 'Female', 'sales' => 0, 'value' => 0.0], 'Not specified' => ['name' => 'Not specified', 'sales' => 0, 'value' => 0.0]];

        DB::query()->fromSub($sales, 's')
            ->groupBy('s.client_gender')
            ->selectRaw('s.client_gender as gender, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
            ->get()
            ->each(function ($r) use (&$rows) {
                $key = match (strtolower(trim((string) $r->gender))) {
                    'male', 'm' => 'Male',
                    'female', 'f' => 'Female',
                    default => 'Not specified',
                };
                $rows[$key]['sales'] += (int) $r->sales;
                $rows[$key]['value'] += (float) $r->value;
            });

        return array_values($rows);
    }

    /**
     * Age bands of sales with a valid client age (MIN_AGE–MAX_AGE); `excluded` counts the rest (none recorded, or not a
     * real age) so the chart can say what it's based on.
     *
     * @return array{rows: array<int, array{name: string, sales: int, value: float}>, counted: int, excluded: int}
     */
    public static function ages(Builder $sales): array
    {
        $rows = collect(self::AGE_BANDS)->mapWithKeys(fn ($label) => [$label => ['name' => $label, 'sales' => 0, 'value' => 0.0]])->all();
        $excluded = 0;

        DB::query()->fromSub($sales, 's')
            ->groupBy('s.client_age')
            ->selectRaw('s.client_age as age, COUNT(*) as sales, COALESCE(SUM(s.value), 0) as value')
            ->get()
            ->each(function ($r) use (&$rows, &$excluded) {
                $age = $r->age === null ? null : (int) $r->age;
                if (! self::isValidAge($age)) {
                    $excluded += (int) $r->sales;

                    return;
                }
                $label = self::AGE_BANDS[max(array_filter(array_keys(self::AGE_BANDS), fn ($from) => $from <= $age))];
                $rows[$label]['sales'] += (int) $r->sales;
                $rows[$label]['value'] += (float) $r->value;
            });

        $rows = array_values($rows);

        return ['rows' => $rows, 'counted' => array_sum(array_column($rows, 'sales')), 'excluded' => $excluded];
    }

    public static function isValidAge(?int $age): bool
    {
        return $age !== null && $age >= self::MIN_AGE && $age <= self::MAX_AGE;
    }
}
