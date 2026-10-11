<?php

namespace App\Console\Commands;

use App\Support\Areas;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Re-derives agents.area for everyone (after changing config/areas.php, or for rows written without the model).
class AssignAgentAreas extends Command
{
    protected $signature = 'agents:assign-areas {--dry-run : Show the counts without saving}';

    protected $description = 'Set agents.area from state / city / country using config/areas.php';

    public function handle(): int
    {
        $byArea = [];
        $changes = [];

        DB::table('agents')->select('id', 'state', 'city', 'country_code', 'area')->orderBy('id')
            ->chunkById(5000, function ($agents) use (&$byArea, &$changes) {
                foreach ($agents as $a) {
                    $area = Areas::forAgent($a->state, $a->city, $a->country_code);
                    $byArea[$area ?? 'unassigned'] = ($byArea[$area ?? 'unassigned'] ?? 0) + 1;
                    if ($area !== $a->area) {
                        $changes[$area ?? ''][] = $a->id;
                    }
                }
            });

        if (! $this->option('dry-run')) {
            DB::transaction(function () use ($changes) {
                foreach ($changes as $area => $ids) {
                    foreach (array_chunk($ids, 1000) as $chunk) {
                        DB::table('agents')->whereIn('id', $chunk)->update(['area' => $area === '' ? null : $area]);
                    }
                }
            });
        }

        arsort($byArea);
        $this->table(['Area', 'Agents'], collect($byArea)->map(fn ($n, $area) => [$area === 'unassigned' ? 'Unassigned' : Areas::name($area), number_format($n)])->values());
        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format(array_sum(array_map('count', $changes))).' agents '.($this->option('dry-run') ? 'would change.' : 'updated.'));

        return self::SUCCESS;
    }
}
