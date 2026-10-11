<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;

class ProjectPropertyType extends Model
{
    // Seeded ids (ProjectPropertyTypeSeeder); mirrored in resources/js/helpers/projectSaleFields.ts.
    public const CONDO = 1;
    public const HOUSE_AND_LOT = 10;
    public const TOWNHOUSE = 11;
    public const LOT_ONLY = 14;

    // Which measurements a unit of each type has; any other type records none.
    public const WITH_UNIT_TYPE = [self::CONDO];
    public const WITH_FLOOR_AREA = [self::CONDO, self::HOUSE_AND_LOT, self::TOWNHOUSE];
    public const WITH_LOT_AREA = [self::HOUSE_AND_LOT, self::TOWNHOUSE, self::LOT_ONLY];

    /**
     * The unit_type / floor_area / lot_area values that apply to the type; the rest become null.
     *
     * @param  array<string, mixed>  $data
     * @return array{unit_type: ?string, floor_area: mixed, lot_area: mixed}
     */
    public static function measurements(int $typeId, array $data): array
    {
        return [
            'unit_type' => in_array($typeId, self::WITH_UNIT_TYPE, true) ? ($data['unit_type'] ?? null) : null,
            'floor_area' => in_array($typeId, self::WITH_FLOOR_AREA, true) ? ($data['floor_area'] ?? null) : null,
            'lot_area' => in_array($typeId, self::WITH_LOT_AREA, true) ? ($data['lot_area'] ?? null) : null,
        ];
    }
}
