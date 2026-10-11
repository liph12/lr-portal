<?php

namespace App\Services\Legacy;

use App\Models\Entities\Agent;
use App\Support\Countries;

// Country, country code and agent type of a legacy member row — shared by the member import and the
// agent-type backfill so both apply the same rule.
final class LegacyAgentOrigin
{
    public const COLUMNS = ['national_intern', 'country', 'lr_joined', 'created_at'];

    /**
     * @return array{country: ?string, country_code: ?string, agent_type: string}
     */
    public static function of(object $member): array
    {
        ['name' => $country, 'code' => $code] = Countries::resolve($member->country ?? null);

        return [
            'country' => $country,
            'country_code' => $code,
            'agent_type' => Agent::typeFromLegacy($member->national_intern ?? null, self::joinedOn($member), $country, $code),
        ];
    }

    // The legacy join date where it was recorded, else when the member record was created.
    private static function joinedOn(object $member): ?string
    {
        foreach ([$member->lr_joined ?? null, $member->created_at ?? null] as $value) {
            $value = trim((string) $value);
            if ($value !== '' && ! str_starts_with($value, '0000') && strtotime($value) !== false) {
                return date('Y-m-d', strtotime($value));
            }
        }

        return null;
    }
}
