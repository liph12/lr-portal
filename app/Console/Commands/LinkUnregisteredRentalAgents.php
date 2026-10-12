<?php

namespace App\Console\Commands;

use App\Services\UnregisteredAgentLinker;
use Illuminate\Console\Command;

// Links rentals credited to an agent who had no LR account to the account now matching their email or mobile (new
// accounts link themselves; imports write agents without model events, so run this after one). Safe to re-run.
class LinkUnregisteredRentalAgents extends Command
{
    protected $signature = 'rentals:link-unregistered-agents';

    protected $description = 'Link rentals of agents who had no LR account to their new accounts (by email or mobile)';

    public function handle(UnregisteredAgentLinker $linker): int
    {
        $this->info(number_format($linker->linkAll()).' rentals linked.');

        return self::SUCCESS;
    }
}
