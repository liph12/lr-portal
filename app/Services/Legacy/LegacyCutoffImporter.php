<?php

namespace App\Services\Legacy;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Copies legacy `sales_cutoff_dates` (month_year → date) into `sales_cutoffs`. Legacy stored only
 * the day; the time of day comes from `settings.cut_off_time` (5:00 PM). Re-running updates
 * months that already exist.
 */
class LegacyCutoffImporter
{
    private const DEFAULT_TIME = '17:00';

    /**
     * @return array{stats: array<string, int>, skipped: array<int, array{0: int|string, 1: string}>}
     */
    public function run(bool $dryRun = false): array
    {
        $legacy = DB::connection('legacy');
        $time = $this->time($legacy->getSchemaBuilder()->hasTable('settings') ? $legacy->table('settings')->value('cut_off_time') : null);
        $stats = ['imported' => 0, 'updated' => 0];
        $skipped = [];

        DB::beginTransaction();

        try {
            foreach ($legacy->table('sales_cutoff_dates')->orderBy('id')->get() as $row) {
                $month = trim((string) $row->month_year);

                if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) || ! $row->date || str_starts_with((string) $row->date, '0000')) {
                    $skipped[] = [$row->id, 'missing or invalid month/date'];
                    continue;
                }

                $exists = DB::table('sales_cutoffs')->where('month', $month)->exists();
                DB::table('sales_cutoffs')->updateOrInsert(
                    ['month' => $month],
                    ['cutoff_at' => Carbon::parse($row->date)->format('Y-m-d')." {$time}:00", 'created_at' => $row->created_at, 'updated_at' => $row->updated_at],
                );
                $stats[$exists ? 'updated' : 'imported']++;
            }

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $stats, 'skipped' => $skipped];
    }

    private function time(?string $value): string
    {
        try {
            return $value ? Carbon::parse($value)->format('H:i') : self::DEFAULT_TIME;
        } catch (Throwable) {
            return self::DEFAULT_TIME;
        }
    }
}
