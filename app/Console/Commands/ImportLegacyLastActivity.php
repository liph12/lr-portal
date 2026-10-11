<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// users.last_active_at from the legacy account (legacy users.updated_at, matched by email). Keeps a later date already
// recorded here. Safe to re-run.
class ImportLegacyLastActivity extends Command
{
    protected $signature = 'legacy:import-last-activity {--dry-run : Count without saving}';

    protected $description = 'Set users.last_active_at from legacy users.updated_at (by email)';

    public function handle(): int
    {
        // Several legacy accounts can share an email: the latest update wins.
        $latest = [];
        DB::connection('legacy')->table('users')->select('id', 'email', 'updated_at')->whereNotNull('updated_at')->orderBy('id')
            ->lazyById(5000)->each(function ($u) use (&$latest) {
                $email = strtolower(trim((string) $u->email));
                if ($email !== '' && (! isset($latest[$email]) || $u->updated_at > $latest[$email])) {
                    $latest[$email] = $u->updated_at;
                }
            });

        $updated = 0;
        DB::beginTransaction();
        foreach (array_chunk($latest, 1000, true) as $chunk) {
            $users = DB::table('users')->whereIn('email', array_keys($chunk))->get(['id', 'email', 'last_active_at']);
            foreach ($users as $user) {
                $at = $chunk[strtolower($user->email)] ?? null;
                if ($at && (! $user->last_active_at || $at > $user->last_active_at)) {
                    $updated += DB::table('users')->where('id', $user->id)->update(['last_active_at' => $at]);
                }
            }
        }
        $this->option('dry-run') ? DB::rollBack() : DB::commit();

        $this->info(($this->option('dry-run') ? '[DRY RUN] ' : '').number_format(count($latest)).' legacy accounts; '.number_format($updated).' users updated.');

        return self::SUCCESS;
    }
}
