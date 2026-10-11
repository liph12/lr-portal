<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

// Branch offices and their secretaries: a secretary's reach is the area(s) of the offices they're assigned to — it
// comes from offices.secretary_agent_id, not the role, so it follows the data like team leadership does.
class OfficeService
{
    /** @var array<int, array<int, string>> */
    private array $areas = [];

    /**
     * Area keys of the offices this user is the secretary of (none for everyone else).
     *
     * @return array<int, string>
     */
    public function areasFor(User $user): array
    {
        return $this->areas[$user->id] ??= DB::table('offices as o')->join('agents as a', 'a.id', '=', 'o.secretary_agent_id')
            ->where('a.user_id', $user->id)->whereNotNull('o.area')->distinct()->orderBy('o.area')->pluck('o.area')->all();
    }
}
