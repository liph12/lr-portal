<?php

use App\Models\User;
use App\Services\Legacy\LegacyTeamImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $legacy = Schema::connection('legacy');

    $legacy->create('sales_team', function (Blueprint $t) {
        $t->integer('id');
        $t->string('teamname');
        $t->string('status')->default('active');
        $t->text('dateest')->nullable();
        $t->text('teamlogo')->nullable();
        $t->text('created_at')->nullable();
        $t->text('updated_at')->nullable();
    });
    $legacy->create('sales_team_members', function (Blueprint $t) {
        $t->id();
        foreach (['teamid', 'memid', 'isleader', 'activeTeam', 'agentid'] as $c) {
            $t->integer($c)->default(0);
        }
        foreach (['datejoined', 'dateresigned', 'created_at', 'updated_at'] as $c) {
            $t->text($c)->nullable();
        }
    });
    $legacy->create('salesteam_subteam', function (Blueprint $t) {
        $t->integer('sid');
        $t->string('teamName');
        $t->integer('LeadID');
        $t->integer('tteamID');
        $t->string('status')->default('active');
        $t->text('created_at')->nullable();
        $t->text('updated_at')->nullable();
    });
    $legacy->create('salesteam_subteam_members', function (Blueprint $t) {
        $t->id();
        foreach (['subTeamID', 'memID', 'agentid', 'isLeader'] as $c) {
            $t->integer($c)->default(0);
        }
        foreach (['created_at', 'updated_at', 'dateresigned'] as $c) {
            $t->text($c)->nullable();
        }
    });

    foreach ([100, 200, 300, 400] as $id) {
        DB::table('agents')->insert(['id' => $id, 'user_id' => User::factory()->create()->id, 'email' => "a{$id}@example.com"]);
    }

    $this->team = fn (int $id, string $status = 'active') => DB::connection('legacy')->table('sales_team')
        ->insert(['id' => $id, 'teamname' => "Team {$id}", 'status' => $status, 'dateest' => '2020-01-01']);
    $this->member = fn (array $attrs) => DB::connection('legacy')->table('sales_team_members')->insertGetId(array_merge([
        'datejoined' => '2023-01-01', 'dateresigned' => '2032-12-31', 'activeTeam' => 1, 'isleader' => 0, 'agentid' => 999,
    ], $attrs));

    $this->import = fn (bool $dryRun = false) => (new LegacyTeamImporter)->run($dryRun);
});

test('the team leader is the current isleader, linked by members.id rather than the old agentid', function () {
    ($this->team)(1);
    ($this->member)(['teamid' => 1, 'memid' => 100, 'isleader' => 1, 'datejoined' => '2020-01-01', 'dateresigned' => '2021-06-30']);
    ($this->member)(['teamid' => 1, 'memid' => 200, 'isleader' => 1, 'datejoined' => '2021-07-01', 'agentid' => 100]);

    ($this->import)();

    $team = DB::table('teams')->find(1);
    expect($team->agent_id)->toBe(200)->and($team->name)->toBe('Team 1')->and($team->status)->toBe('active');
});

test('a team without a current leader keeps its most recent one; a team that never had one is skipped', function () {
    ($this->team)(1, 'resigned');
    ($this->member)(['teamid' => 1, 'memid' => 100, 'isleader' => 1, 'datejoined' => '2019-01-01', 'activeTeam' => 0]);
    ($this->member)(['teamid' => 1, 'memid' => 300, 'isleader' => 1, 'datejoined' => '2021-01-01', 'dateresigned' => '2022-01-01']);
    ($this->team)(2);
    ($this->member)(['teamid' => 2, 'memid' => 400]);

    $result = ($this->import)();

    expect(DB::table('teams')->where('id', 1)->value('agent_id'))->toBe(300)
        ->and(DB::table('teams')->where('id', 2)->exists())->toBeFalse()
        ->and($result['stats'])->toMatchArray(['teams' => 1, 'teams_with_past_leader' => 1])
        ->and($result['skipped'][0][0])->toBe(2);
});

test('a transferred agent is active only on the team they joined last', function () {
    ($this->team)(1);
    ($this->team)(2);
    ($this->member)(['teamid' => 1, 'memid' => 200, 'isleader' => 1]);
    ($this->member)(['teamid' => 2, 'memid' => 300, 'isleader' => 1]);
    // Both rows still say activeTeam = 1 with a future end date, as in the legacy data.
    ($this->member)(['teamid' => 1, 'memid' => 100, 'datejoined' => '2022-03-01']);
    ($this->member)(['teamid' => 2, 'memid' => 100, 'datejoined' => '2024-05-10']);

    ($this->import)();

    $history = DB::table('team_agents')->where('agent_id', 100)->orderBy('joined_at')->get();
    expect($history)->toHaveCount(2)
        ->and($history[0]->team_id)->toBe(1)
        ->and($history[0]->status)->toBe('inactive')
        ->and($history[0]->transferred_at)->toBe('2024-05-10')
        ->and($history[1]->team_id)->toBe(2)
        ->and($history[1]->status)->toBe('active')
        ->and($history[1]->transferred_at)->toBeNull();
});

test('resigned dates in the past, activeTeam = 0 and closed teams all mean inactive', function () {
    ($this->team)(1);
    ($this->team)(2, 'resigned');
    ($this->member)(['teamid' => 1, 'memid' => 100, 'isleader' => 1]);
    ($this->member)(['teamid' => 1, 'memid' => 200, 'dateresigned' => '2024-02-15']);
    ($this->member)(['teamid' => 1, 'memid' => 300, 'activeTeam' => 0]);
    ($this->member)(['teamid' => 2, 'memid' => 400, 'isleader' => 1]);

    ($this->import)();

    $status = DB::table('team_agents')->pluck('status', 'agent_id')->all();
    expect($status)->toBe([100 => 'active', 200 => 'inactive', 300 => 'inactive', 400 => 'inactive'])
        ->and(DB::table('team_agents')->where('agent_id', 200)->value('transferred_at'))->toBe('2024-02-15');
});

test('sub-teams use LeadID as leader and their members follow the same rules', function () {
    ($this->team)(1);
    ($this->member)(['teamid' => 1, 'memid' => 100, 'isleader' => 1]);
    DB::connection('legacy')->table('salesteam_subteam')->insert([
        ['sid' => 7, 'teamName' => 'Unit Alpha', 'LeadID' => 200, 'tteamID' => 1, 'status' => 'active', 'created_at' => '2023-01-01 00:00:00'],
        ['sid' => 8, 'teamName' => 'Unit Beta', 'LeadID' => 300, 'tteamID' => 1, 'status' => 'inactive', 'created_at' => '2023-01-01 00:00:00'],
        ['sid' => 9, 'teamName' => 'Unit Ghost', 'LeadID' => 555, 'tteamID' => 1, 'status' => 'active', 'created_at' => '2023-01-01 00:00:00'],
    ]);
    DB::connection('legacy')->table('salesteam_subteam_members')->insert([
        ['subTeamID' => 7, 'memID' => 400, 'created_at' => '2023-02-01 09:00:00', 'dateresigned' => '2032-12-31'],
        ['subTeamID' => 8, 'memID' => 400, 'created_at' => '2024-08-01 09:00:00', 'dateresigned' => '2032-12-31'],
        ['subTeamID' => 7, 'memID' => 200, 'created_at' => '', 'dateresigned' => '2032-12-31'],
    ]);

    $result = ($this->import)();

    $alpha = DB::table('sub_teams')->find(7);
    $rows = DB::table('sub_team_agents')->where('agent_id', 400)->orderBy('joined_at')->get();

    expect($alpha->agent_id)->toBe(200)->and($alpha->team_id)->toBe(1)
        ->and(DB::table('sub_teams')->where('id', 9)->exists())->toBeFalse()
        // Moved to Unit Beta last, but Beta is closed, so 400 is active on no sub-team.
        ->and($rows->pluck('status')->all())->toBe(['inactive', 'inactive'])
        ->and($rows[0]->transferred_at)->toBe('2024-08-01')
        ->and(DB::table('sub_team_agents')->where('agent_id', 200)->value('status'))->toBe('active')
        ->and($result['stats'])->toMatchArray(['sub_teams' => 2, 'sub_team_memberships' => 3]);
});

test('duplicate rows merge, unknown agents are left out, a dry run saves nothing and re-runs do not duplicate', function () {
    ($this->team)(1);
    ($this->member)(['teamid' => 1, 'memid' => 100, 'isleader' => 1]);
    ($this->member)(['teamid' => 1, 'memid' => 200]);
    ($this->member)(['teamid' => 1, 'memid' => 200]);
    ($this->member)(['teamid' => 1, 'memid' => 123456]);

    ($this->import)(true);
    expect(DB::table('teams')->count())->toBe(0)->and(DB::table('team_agents')->count())->toBe(0);

    $first = ($this->import)();
    $again = ($this->import)();

    expect(DB::table('team_agents')->count())->toBe(2)
        ->and($first['stats'])->toMatchArray(['duplicates_merged' => 1, 'memberships_without_agent' => 1])
        ->and($again['stats'])->toMatchArray(['already_imported' => 1, 'team_memberships' => 0]);
});
