<?php

use App\Services\Legacy\LegacyCutoffImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    Schema::connection('legacy')->create('sales_cutoff_dates', function (Blueprint $t) {
        $t->id();
        $t->string('month_year')->nullable();
        $t->date('date')->nullable();
        $t->timestamps();
    });
    Schema::connection('legacy')->create('settings', fn (Blueprint $t) => $t->string('cut_off_time')->nullable());
    DB::connection('legacy')->table('settings')->insert(['cut_off_time' => '5:00 PM']);
    DB::connection('legacy')->table('sales_cutoff_dates')->insert([
        ['month_year' => '2026-08', 'date' => '2026-09-02'],
        ['month_year' => '2026-09', 'date' => '2026-10-02'],
        ['month_year' => 'junk', 'date' => '2026-10-02'],
    ]);
});

test('cutoff dates import with the legacy cutoff time, skip junk, and re-run as updates', function () {
    (new LegacyCutoffImporter)->run(true);
    expect(DB::table('sales_cutoffs')->count())->toBe(0);

    $first = (new LegacyCutoffImporter)->run();
    $again = (new LegacyCutoffImporter)->run();

    expect(DB::table('sales_cutoffs')->orderBy('month')->pluck('cutoff_at', 'month')->all())
        ->toBe(['2026-08' => '2026-09-02 17:00:00', '2026-09' => '2026-10-02 17:00:00'])
        ->and($first['stats'])->toBe(['imported' => 2, 'updated' => 0])
        ->and($first['skipped'])->toHaveCount(1)
        ->and($again['stats'])->toBe(['imported' => 0, 'updated' => 2]);
});
