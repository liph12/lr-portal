<?php

namespace App\Console\Commands;

use App\Services\AgentActivityService;
use Illuminate\Console\Command;

class RefreshAgentActivity extends Command
{
    protected $signature = 'agents:refresh-activity {--dry-run : Only count what would change}';

    protected $description = 'Mark agents dormant after 6 months without a sale (and active again once they sell)';

    public function handle(AgentActivityService $activity): int
    {
        if ($this->option('dry-run')) {
            $this->table(['Result', 'Agents'], collect($activity->preview())->map(fn ($n, $k) => [str_replace('_', ' ', $k), number_format($n)])->values());

            return self::SUCCESS;
        }

        $this->table(['Activity', 'Agents'], collect($activity->refresh())->map(fn ($n, $k) => [$k, number_format($n)])->values());

        return self::SUCCESS;
    }
}
