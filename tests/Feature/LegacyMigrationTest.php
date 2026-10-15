<?php

use App\Models\Role;
use App\Models\User;
use App\Services\Legacy\LegacyDumpFilter;
use App\Services\Legacy\LegacyMigrationLauncher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
});

test('every legacy command is an import step or a tool, and every step exists — a new importer can\'t be forgotten', function () {
    $commands = array_keys(Artisan::all());
    $steps = array_keys(config('legacy.steps'));
    $legacy = array_filter($commands, fn ($c) => str_starts_with($c, 'legacy:'));

    expect(array_diff($legacy, $steps, config('legacy.not_in_migration')))->toBe([])
        ->and(array_diff($steps, $commands))->toBe([])
        // Brokers move role holders by team leadership, so teams come first; everything follows the members.
        ->and(array_search('legacy:import-teams', $steps))->toBeLessThan(array_search('legacy:import-brokers', $steps))
        ->and($steps[0])->toBe('legacy:import-members');
});

test('a dump loses every statement of the excluded tables and keeps the rest', function () {
    $dump = <<<'SQL'
    -- Table structure for table `activity_tracker`
    DROP TABLE IF EXISTS `activity_tracker`;
    CREATE TABLE `activity_tracker` (
      `id` int NOT NULL,
      `logs` text
    ) ENGINE=InnoDB;
    LOCK TABLES `activity_tracker` WRITE;
    /*!40000 ALTER TABLE `activity_tracker` DISABLE KEYS */;
    INSERT INTO `activity_tracker` VALUES (1,'a;b'),(2,'c');
    /*!40000 ALTER TABLE `activity_tracker` ENABLE KEYS */;
    UNLOCK TABLES;
    CREATE TABLE `members` (
      `id` int NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO `members` (`id`) VALUES
    (1),
    (2);
    INSERT INTO `personal_access_tokens` (`id`) VALUES
    (1);
    ALTER TABLE `inbox_improved`
      ADD PRIMARY KEY (`id`);
    ALTER TABLE `members`
      ADD PRIMARY KEY (`id`);
    SQL;
    $filter = new LegacyDumpFilter(['activity_tracker', 'inbox_improved', 'personal_access_tokens']);
    $kept = implode('', array_filter(array_map(fn ($l) => $filter->line($l."\n"), explode("\n", $dump)), fn ($l) => $l !== null));
    // Dump comments stay (they do nothing); statements are what count.
    $kept = preg_replace('/^--.*\n/m', '', $kept);

    expect($kept)->not->toContain('activity_tracker')->not->toContain('personal_access_tokens')->not->toContain('inbox_improved')
        ->toContain("CREATE TABLE `members`")->toContain("(2);")->toContain("ALTER TABLE `members`\n  ADD PRIMARY KEY")
        ->and($filter->skippedStatements)->toBe(8);
});

test('legacy:migrate runs the steps in order, stops at a failure, and resumes from it', function () {
    config(['legacy.steps' => ['test:first' => 'First', 'test:breaks' => 'Breaks', 'test:last' => 'Last']]);
    $fail = true;
    Artisan::command('test:first', fn () => $this->line('first ok'));
    Artisan::command('test:breaks', function () use (&$fail) {
        $this->line($fail ? 'boom' : 'fixed');

        return $fail ? 1 : 0;
    });
    Artisan::command('test:last', fn () => $this->line('last ok'));
    $steps = fn () => collect(json_decode(DB::table('legacy_migration_runs')->latest('id')->value('steps'), true))->pluck('status', 'command')->all();

    $this->artisan('legacy:migrate --only=nope')->assertFailed();
    $this->artisan('legacy:migrate --no-interaction')->assertFailed();
    expect($steps())->toBe(['test:first' => 'done', 'test:breaks' => 'failed', 'test:last' => 'waiting'])
        ->and(DB::table('legacy_migration_runs')->value('error'))->toContain('test:breaks');

    $fail = false;
    $this->artisan('legacy:migrate --from=test:breaks --no-interaction')->assertSuccessful();
    expect($steps())->toBe(['test:first' => 'waiting', 'test:breaks' => 'done', 'test:last' => 'done'])
        ->and(DB::table('legacy_migration_runs')->latest('id')->value('status'))->toBe('done');

    // Wiping is command-line only.
    $this->artisan('legacy:migrate --fresh --run=1')->assertFailed();
});

test('a rehearsal only runs on a development MySQL database', function () {
    // Tests run on SQLite: it refuses before touching anything.
    $this->artisan('legacy:rehearse')->expectsOutputToContain('needs MySQL')->assertFailed();
});

test('developers see the page and start a run; one run at a time; nobody else gets in', function () {
    $launched = [];
    app()->instance(LegacyMigrationLauncher::class, new class($launched) extends LegacyMigrationLauncher
    {
        public function __construct(private array &$launched) {}

        public function launch(int $runId): void
        {
            $this->launched[] = $runId;
        }
    });

    $this->actingAs($this->superadmin)->get('/superadmin/settings/legacy-migration')
        ->assertInertia(fn ($page) => $page->component('SuperAdmin/Settings/LegacyMigration/Index')
            ->has('steps', count(config('legacy.steps')))->where('running', false)->where('latest', null)
            ->where('excluded', ['activity_tracker', 'inbox_improved', 'personal_access_tokens']));

    $this->actingAs($this->superadmin)->post('/superadmin/settings/legacy-migration')->assertSessionHas('success');
    expect($launched)->toHaveCount(1)->and(DB::table('legacy_migration_runs')->value('status'))->toBe('queued');
    $this->actingAs($this->superadmin)->post('/superadmin/settings/legacy-migration')->assertSessionHas('error');
    expect($launched)->toHaveCount(1);

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::create(['name' => 'admin', 'label' => 'Admin']));
    $this->actingAs($admin)->get('/superadmin/settings/legacy-migration')->assertForbidden();
});

test('developers, projects and property types come from the legacy copy, and sales missing them are linked afterwards', function () {
    $legacy = Illuminate\Support\Facades\Schema::connection('legacy');
    $legacy->create('developers', function ($t) {
        $t->integer('id');
        $t->string('name')->nullable();
        $t->string('email')->nullable();
        $t->string('street')->nullable();
        $t->string('developer_profile')->nullable();
        $t->string('latitude')->nullable();
        $t->string('longitude')->nullable();
        $t->integer('isbroker')->default(0);
    });
    $legacy->create('projects', function ($t) {
        $t->integer('id');
        $t->integer('devid');
        $t->string('name')->nullable();
        $t->integer('prop_type_id')->default(0);
        $t->string('location')->nullable();
        $t->string('latitude')->nullable();
        $t->string('longitude')->nullable();
        $t->text('logs')->nullable();
    });
    $legacy->create('salesreport', function ($t) {
        $t->integer('id');
        $t->integer('devid');
        $t->integer('projid');
        $t->integer('prop_type_id');
    });
    DB::connection('legacy')->table('developers')->insert([
        ['id' => 22, 'name' => ' Cebu Landmasters Inc. ', 'latitude' => '10.3', 'longitude' => '', 'isbroker' => 0],
        ['id' => 973, 'name' => 'Newer Developer', 'latitude' => null, 'longitude' => null, 'isbroker' => 0],
        ['id' => 500, 'name' => 'A brokerage office', 'latitude' => null, 'longitude' => null, 'isbroker' => 1],
    ]);
    DB::connection('legacy')->table('projects')->insert([
        ['id' => 7, 'devid' => 22, 'name' => 'Mivesa', 'prop_type_id' => 1, 'location' => 'Lahug', 'logs' => '[{"a":1}]'],
        ['id' => 8, 'devid' => 973, 'name' => 'Cut off', 'prop_type_id' => 6, 'location' => null, 'logs' => '[{"a":"trunc'],
        ['id' => 9, 'devid' => 404, 'name' => 'Orphan', 'prop_type_id' => 1, 'location' => null, 'logs' => null],
    ]);

    $stats = app(App\Services\Legacy\LegacyDeveloperImporter::class)->run()['stats'];
    expect($stats)->toMatchArray(['property_types' => 14, 'developers' => 2, 'projects' => 2, 'projects_without_developer' => 1])
        ->and(DB::table('developers')->find(22)->name)->toBe('Cebu Landmasters Inc.')
        ->and(DB::table('developer_projects')->find(8)->project_property_type_id)->toBeNull()
        ->and(DB::table('developer_projects')->find(8)->update_logs)->toBeNull();

    // A sale imported while those tables were empty gets its links; one set since keeps its own.
    $sale = fn (int $id) => DB::table('agent_transactions')->insertGetId(['id' => $id, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert([
        ['agent_transaction_id' => $sale(1), 'project_name' => 'Mivesa', 'developer_id' => null, 'developer_project_id' => null, 'project_property_type_id' => null],
        ['agent_transaction_id' => $sale(2), 'project_name' => 'Kept', 'developer_id' => 973, 'developer_project_id' => null, 'project_property_type_id' => 10],
    ]);
    DB::connection('legacy')->table('salesreport')->insert([['id' => 1, 'devid' => 22, 'projid' => 7, 'prop_type_id' => 1], ['id' => 2, 'devid' => 22, 'projid' => 7, 'prop_type_id' => 1]]);

    expect(app(App\Services\Legacy\LegacyDeveloperImporter::class)->linkSales()['stats'])->toBe(['developer' => 1, 'project' => 2, 'property_type' => 1]);
    $rows = DB::table('agent_project_transactions')->orderBy('agent_transaction_id')->get(['developer_id', 'developer_project_id', 'project_property_type_id']);
    expect((array) $rows[0])->toBe(['developer_id' => 22, 'developer_project_id' => 7, 'project_property_type_id' => 1])
        ->and((array) $rows[1])->toBe(['developer_id' => 973, 'developer_project_id' => 7, 'project_property_type_id' => 10]);
});
