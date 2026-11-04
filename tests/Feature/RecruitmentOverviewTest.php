<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use App\Mail\RecruitAnalysisReport;
use App\Services\RecruitAnalysisService;
use App\Services\RecruitProgressService;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-10-11 09:00:00');
    $this->viewReports = Permission::firstOrCreate(['name' => 'view_reports'], ['label' => 'View Reports']);
    $roles = collect(['superadmin', 'team_leader', 'agent'])->mapWithKeys(fn ($n) => [$n => Role::create(['name' => $n, 'label' => ucfirst($n)])]);
    grantReports($roles['agent']);
    grantReports($roles['team_leader']);
    $this->superadmin = User::factory()->create();
    $this->superadmin->roles()->attach($roles['superadmin']);

    // [name, signed up, status, NAO %, FIRE certificates, has a sale?, on the team?]
    $people = [
        ['Ann', '2026-03-01', 'active', 100, 3, false, true],
        ['Ben', '2026-04-01', 'active', 40, 1, false, true],
        ['Cy', '2026-05-01', 'inactive', 100, 5, false, false],
        ['Dee', '2026-06-01', 'active', 100, 3, true, true],   // has a sale: past onboarding
        ['Eve', '2025-12-01', 'resigned', 0, 0, false, true],  // signed up before the range
    ];
    $this->agents = [];
    foreach ($people as [$name, $signedUp, $status, $nao, $fire, $sold, $onTeam]) {
        $user = User::factory()->create(['name' => $name, 'status' => $status]);
        $user->roles()->attach($roles['agent']);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'created_at' => "{$signedUp} 10:00:00"]);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'nao_video_tracker' => $nao, 'fire_certificates' => $fire, 'registration_status' => 4]);
        if ($sold) {
            AgentTransaction::create(['agent_id' => $id, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'pending']);
        }
        $this->agents[$name] = ['id' => $id, 'user' => $user, 'onTeam' => $onTeam];
    }

    $leader = User::factory()->create(['name' => 'Lead']);
    $leader->roles()->attach($roles['team_leader']);
    $leaderAgent = DB::table('agents')->insertGetId(['user_id' => $leader->id, 'email' => $leader->email, 'created_at' => '2020-01-01 00:00:00']);
    DB::table('agent_attributes')->insert(['agent_id' => $leaderAgent, 'registration_status' => 4]);
    $this->leader = $leader;
    $team = DB::table('teams')->insertGetId(['name' => 'Alpha', 'agent_id' => $leaderAgent, 'status' => 'active']);
    foreach ($this->agents as $a) {
        if ($a['onTeam']) {
            DB::table('team_agents')->insert(['team_id' => $team, 'agent_id' => $a['id'], 'joined_at' => '2025-01-01', 'status' => 'active']);
        }
    }
});

afterEach(fn () => Carbon::setTestNow());

test('cards: only the sign-up range — recruits, NAO finished and FIRE as percentages; no all-time member count', function () {
    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->component('Portal/Reports/Recruits')
            ->missing('summary.members')
            ->where('summary.recruits.by_status', ['active' => 3, 'inactive' => 1])
            // The table's status filter still offers every status.
            ->where('statuses', ['active', 'inactive', 'resigned', 'terminated'])
            ->where('summary.recruits.total', 4)
            // Ann, Ben, Cy (Dee sold, Eve signed up earlier)
            ->where('summary.trainees', 3)
            ->where('summary.nao', ['finished' => 2, 'not_finished' => 1, 'finished_pct' => 66.7, 'average_pct' => 80])
            ->where('summary.fire.complete_pct', 66.7)
            ->where('summary.fire.levels.1', ['label' => '1 of 3 (33%)', 'count' => 1, 'pct' => 33.3])
            ->where('trainees.total', 3));
});

test('agents who never finished the registration stepper are left out of every count', function () {
    DB::table('agent_attributes')->where('agent_id', $this->agents['Ann']['id'])->update(['registration_status' => 3]);
    DB::table('agent_attributes')->where('agent_id', $this->agents['Ben']['id'])->update(['registration_status' => null]);

    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page
            ->where('summary.recruits.total', 2)
            ->where('summary.trainees', 1)
            ->where('trainees.total', 1));
    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('summary.kpis.recruits', 2));
});

test('global partners are left out of recruits: they don\'t take NAO or FIRE', function () {
    DB::table('agents')->where('id', $this->agents['Ann']['id'])->update(['agent_type' => 'global_partner']);

    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('summary.recruits.total', 3)->where('summary.trainees', 2));
    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('summary.kpis.recruits', 3));
});

test('the trainees table filters by NAO, FIRE and status, and caps FIRE at 100%', function () {
    $range = 'from=2026-01-01&to=2026-10-11';

    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&nao=not_finished")
        ->assertInertia(fn ($page) => $page->where('trainees.total', 1)->where('trainees.data.0.name', 'Ben'));
    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&fire=complete&sort=name&dir=asc")
        ->assertInertia(fn ($page) => $page->where('trainees.total', 2)
            ->where('trainees.data.1', fn ($r) => $r['name'] === 'Cy' && $r['fire'] === 5 && $r['fire_pct'] === 100));
    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&status=inactive")
        ->assertInertia(fn ($page) => $page->where('trainees.total', 1));
});

test('team leaders see their team under Reports › Recruits and My Team; plain agents don\'t get it', function () {
    $range = 'from=2026-01-01&to=2026-10-11';

    $this->actingAs($this->leader)->get("/reports/recruits?{$range}")
        ->assertInertia(fn ($page) => $page
            ->where('scope.name', 'Alpha')
            ->where('summary.trainees', 2)); // Ann and Ben (Cy isn't on the team, Dee sold)

    $this->actingAs($this->leader)->get("/my-team/recruits?{$range}")
        ->assertInertia(fn ($page) => $page->component('Portal/MyTeam/Recruits')->where('summary.trainees', 2)->where('group.name', 'Alpha'));

    // A plain agent: only the recruits they sponsored (none here), whatever team the URL asks for.
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits?{$range}&team_id=1")
        ->assertInertia(fn ($page) => $page->where('summary.recruits.total', 0)->where('scope.name', 'Ann'));
});

test('the trainees table shows each recruit\'s upline, team and sub-team', function () {
    $ann = $this->agents['Ann']['id'];
    $ben = $this->agents['Ben']['id'];
    DB::table('agent_attributes')->where('agent_id', $ben)->update(['referral_id' => $ann]);
    DB::table('agent_attributes')->where('agent_id', $this->agents['Cy']['id'])->update(['referral_id' => 99999]);
    $unit = DB::table('sub_teams')->insertGetId(['team_id' => DB::table('teams')->value('id'), 'name' => 'Alpha Unit', 'agent_id' => $ann, 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $unit, 'agent_id' => $ben, 'joined_at' => '2026-04-01', 'status' => 'active']);

    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11&sort=name&dir=asc')
        ->assertInertia(fn ($page) => $page
            ->where('trainees.data.1', fn ($r) => $r['name'] === 'Ben' && $r['sponsor'] === ['id' => $ann, 'name' => 'Ann', 'email' => $this->agents['Ann']['user']->email] && $r['team'] === 'Alpha' && $r['sub_team'] === 'Alpha Unit')
            // A sponsor who isn't in the portal keeps their number.
            ->where('trainees.data.2', fn ($r) => $r['name'] === 'Cy' && $r['sponsor'] === ['id' => 99999, 'name' => null, 'email' => null] && $r['team'] === null));
});

test('recruits progress: recruits vs recruits who sold, their sales, NAO / FIRE, by team and by sponsor', function () {
    $ann = $this->agents['Ann']['id'];
    DB::table('agent_attributes')->whereIn('agent_id', [$this->agents['Ben']['id'], $this->agents['Cy']['id']])->update(['referral_id' => $ann]);
    // Dee's sale becomes a valid ₱5M project sale (her other, pending record already makes her a "recruit who sold").
    $t = AgentTransaction::create(['agent_id' => $this->agents['Dee']['id'], 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
    DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => 5_000_000, 'reservation_date' => '2026-06-15', 'project_name' => 'X']);
    $range = 'from=2026-01-01&to=2026-10-11';

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}")
        ->assertInertia(fn ($page) => $page->component('Portal/Reports/RecruitsProgress')
            ->where('groups', ['teams', 'sub_teams', 'areas', 'sponsors', 'recruits'])
            ->where('summary.kpis', fn ($k) => $k['recruits'] === 4 && $k['sold'] === 1 && (float) $k['conversion'] === 25.0
                && (float) $k['value'] === 5_000_000.0 && $k['trainees'] === 3 && (float) $k['nao'] === 66.7 && (float) $k['fire'] === 66.7)
            // Alpha: Ann, Ben, Dee; Cy has no team, so isn't ranked (the KPIs above still count her).
            ->where('rows.data', fn ($rows) => collect($rows)->pluck('recruits', 'name')->all() == ['Alpha' => 3]));

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&group=sponsors")
        // Ann sponsored Ben and Cy (Ann and Dee have no sponsor, so they aren't ranked); Ann is on Alpha.
        ->assertInertia(fn ($page) => $page->where('rows.total', 1)
            ->where('rows.data.0', fn ($r) => $r['name'] === 'Ann' && $r['recruits'] === 2 && $r['id'] === $ann && $r['team'] === 'Alpha'));

    // A team leader: their team only, grouped by unit manager or sponsor (not by team).
    $this->actingAs($this->leader)->get("/reports/recruits-progress?{$range}&group=teams")
        ->assertInertia(fn ($page) => $page->where('groups', ['sub_teams', 'areas', 'sponsors', 'recruits'])->where('filters.group', 'sub_teams')->where('summary.kpis.recruits', 3)->where('scope.name', 'Alpha'));

    // A plain agent: the recruits they sponsored (Ben and Cy), grouped by team / unit manager / location, never widened.
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits-progress?{$range}&sponsor_id={$this->agents['Dee']['id']}")
        ->assertInertia(fn ($page) => $page->where('groups', ['recruits', 'teams', 'sub_teams', 'areas'])->where('summary.kpis.recruits', 2)->where('scope.name', 'Ann'));
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits?{$range}")
        ->assertInertia(fn ($page) => $page->where('summary.recruits.total', 2));
});

test('the recruits panel counts NAO / FIRE / overall progress, and clicking a team or sponsor narrows everything', function () {
    $ann = $this->agents['Ann']['id'];
    $team = DB::table('teams')->value('id');
    DB::table('agent_attributes')->whereIn('agent_id', [$this->agents['Ben']['id'], $this->agents['Cy']['id']])->update(['referral_id' => $ann]);
    $range = 'from=2026-01-01&to=2026-10-11';

    // Trainees (no sale): Ann NAO 100 / FIRE 3, Ben 40 / 1, Cy 100 / 5.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}")
        ->assertInertia(fn ($page) => $page
            ->where('selection', null)
            ->where('summary.kpis.nao_status', ['not_started' => 0, 'in_progress' => 1, 'finished' => 2])
            ->where('summary.kpis.fire_status', ['not_started' => 0, 'in_progress' => 1, 'finished' => 2])
            ->where('summary.kpis.overall_status', ['not_started' => 0, 'in_progress' => 1, 'finished' => 2]));

    // Clicking Alpha: its own panel (Ann, Ben, Dee → trainees Ann, Ben), grouped one level down.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&team_id={$team}")
        ->assertInertia(fn ($page) => $page
            ->where('selection.name', 'Alpha')
            ->where('groups', ['sub_teams', 'areas', 'sponsors', 'recruits'])
            ->where('summary.kpis.recruits', 3)
            ->where('summary.kpis.trainees', 2)
            ->where('summary.kpis.overall_status', ['not_started' => 0, 'in_progress' => 1, 'finished' => 1]));

    // Clicking a sponsor: just their recruits, grouped by anything but sponsor.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&sponsor_id={$ann}")
        ->assertInertia(fn ($page) => $page->where('selection.type', 'sponsor')->where('selection.name', 'Ann')->where('groups', ['recruits', 'teams', 'sub_teams', 'areas'])->where('summary.kpis.recruits', 2));

    // "View" opens those same recruits.
    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&sponsor_id={$ann}")
        ->assertInertia(fn ($page) => $page->where('selection.name', 'Ann')->where('trainees.total', 2));

    // A team leader can't click their way out of their team: a sponsor selection is still limited to it.
    $this->actingAs($this->leader)->get("/reports/recruits-progress?{$range}&sponsor_id={$ann}&team_id=999")
        ->assertInertia(fn ($page) => $page->where('summary.kpis.recruits', 1)); // Ben (Cy isn't on Alpha)
});

test('not started means 0, in progress means some, finished means NAO 100 / FIRE 3+', function () {
    DB::table('agent_attributes')->where('agent_id', $this->agents['Ben']['id'])->update(['nao_video_tracker' => 0, 'fire_certificates' => 0]);

    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page
            ->where('summary.kpis.nao_status', ['not_started' => 1, 'in_progress' => 0, 'finished' => 2])
            ->where('summary.kpis.overall_status', ['not_started' => 1, 'in_progress' => 0, 'finished' => 2]));
});

test('recruits progress by location, and clicking a location narrows to it with its own header', function () {
    DB::table('agents')->whereIn('id', [$this->agents['Ann']['id'], $this->agents['Ben']['id']])->update(['area' => 'cebu']);
    DB::table('agents')->where('id', $this->agents['Cy']['id'])->update(['area' => 'davao']);
    $range = 'from=2026-01-01&to=2026-10-11';

    // Dee has no area, so she isn't ranked.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&group=areas")
        ->assertInertia(fn ($page) => $page->where('rows.data', fn ($rows) => collect($rows)->pluck('recruits', 'name')->all() == ['Cebu' => 2, 'Davao' => 1]));

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&area=cebu")
        ->assertInertia(fn ($page) => $page
            ->where('selection.type', 'area')
            ->where('selection.name', 'Cebu')
            ->where('groups', ['teams', 'sub_teams', 'sponsors', 'recruits'])
            ->where('summary.kpis.recruits', 2));

    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&area=cebu")
        ->assertInertia(fn ($page) => $page->where('selection.name', 'Cebu')->where('trainees.total', 2));
});

test('a drill-down reload brings back the selected team\'s header, tabs and numbers', function () {
    $team = DB::table('teams')->value('id');

    // What the page asks for when a row is clicked (a partial reload of these props).
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?from=2026-01-01&to=2026-10-11&team_id={$team}")
        ->assertInertia(fn ($page) => $page->reloadOnly(['rows', 'filters', 'summary', 'selection', 'groups'], fn ($reload) => $reload
            ->where('selection.name', 'Alpha')
            ->where('groups', ['sub_teams', 'areas', 'sponsors', 'recruits'])
            ->where('summary.kpis.recruits', 3)));
});

test('the PDF download asks for every row of the tab, which a normal visit never sends', function () {
    $range = 'from=2026-01-01&to=2026-10-11';

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&per_page=25")
        ->assertInertia(fn ($page) => $page->missing('pdfRows')
            ->reloadOnly(['pdfRows'], fn ($reload) => $reload
                ->where('pdfRows.total', 1)
                ->where('pdfRows.data', fn ($rows) => collect($rows)->pluck('recruits', 'name')->all() == ['Alpha' => 3])));

    // A plain agent's recruits list them one by one.
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits-progress?{$range}&group=recruits")
        ->assertInertia(fn ($page) => $page->reloadOnly(['pdfRows'], fn ($reload) => $reload->has('pdfRows.data')));
});

test('clicking a person opens their recruits: a team leader\'s team, a unit manager\'s sub-team, an agent\'s own recruits', function () {
    // Lead › Ann › Ben › Cy; Ann leads a sub-team of Alpha.
    $id = fn (string $name) => $this->agents[$name]['id'];
    $leadAgent = DB::table('agents')->where('user_id', $this->leader->id)->value('id');
    DB::table('agent_attributes')->where('agent_id', $id('Ann'))->update(['referral_id' => $leadAgent]);
    DB::table('agent_attributes')->where('agent_id', $id('Ben'))->update(['referral_id' => $id('Ann')]);
    DB::table('agent_attributes')->where('agent_id', $id('Cy'))->update(['referral_id' => $id('Ben')]);
    $alpha = DB::table('teams')->where('name', 'Alpha')->value('id');
    $annSub = DB::table('sub_teams')->insertGetId(['name' => 'Ann One', 'team_id' => $alpha, 'agent_id' => $id('Ann'), 'status' => 'active']);
    $range = 'from=2026-01-01&to=2026-10-11';

    $open = fn (User $reader, int $person) => $this->actingAs($reader)->get("/reports/recruits?{$range}&person={$person}");

    $open($this->superadmin, $leadAgent)->assertInertia(fn ($page) => $page->where('filters.team_id', $alpha)->where('selection.type', 'team')->where('filters.from', '2026-01-01'));
    $open($this->superadmin, $id('Ann'))->assertInertia(fn ($page) => $page->where('filters.sub_team_id', $annSub)->where('selection.type', 'sub_team'));
    $open($this->superadmin, $id('Ben'))->assertInertia(fn ($page) => $page->where('filters.sponsor_id', $id('Ben'))
        ->where('trainees.data', fn ($rows) => collect($rows)->pluck('id')->all() === [$id('Cy')]));

    // Recruits Progress drills the same way.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&person={$id('Ben')}")
        ->assertInertia(fn ($page) => $page->where('filters.sponsor_id', $id('Ben'))->where('selection.type', 'sponsor'));

    // A team leader opens a unit manager inside their team: that sub-team (still within Alpha).
    $open($this->leader, $id('Ann'))->assertInertia(fn ($page) => $page->where('filters.sub_team_id', $annSub)->where('filters.team_id', $alpha));

    // An agent reading their own recruits goes down their downline, never sideways.
    $ben = $this->agents['Ben']['user'];
    $ben->update(['status' => 'active']);
    $open($ben, $id('Cy'))->assertInertia(fn ($page) => $page->where('filters.sponsor_id', $id('Cy')));
    $open($ben, $id('Eve'))->assertInertia(fn ($page) => $page->where('filters.sponsor_id', $id('Ben')));
});

test('only fully registered recruits (registration step 4) count, on both pages', function () {
    $range = 'from=2026-01-01&to=2026-10-11';
    $before = fn () => [
        $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}")->viewData('page')['props']['summary']['recruits']['total'],
        $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}")->viewData('page')['props']['summary']['kpis']['recruits'],
    ];
    [$recruits, $progress] = $before();

    // Signed up in the range but stopped at step 3 of the registration stepper.
    $user = User::factory()->create(['name' => 'Half Way']);
    $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'created_at' => '2026-05-05 10:00:00']);
    DB::table('agent_attributes')->insert(['agent_id' => $id, 'registration_status' => 3]);

    expect($before())->toBe([$recruits, $progress]);
    $this->actingAs($this->superadmin)->get("/reports/recruits?{$range}&q=Half")->assertInertia(fn ($page) => $page->where('trainees.total', 0));
});

test('inside a sub-team (or one person\'s recruits) the table lists the recruits themselves', function () {
    $ann = $this->agents['Ann']['id'];
    $ben = $this->agents['Ben']['id'];
    $alpha = DB::table('teams')->where('name', 'Alpha')->value('id');
    $sub = DB::table('sub_teams')->insertGetId(['name' => 'Ann One', 'team_id' => $alpha, 'agent_id' => $ann, 'status' => 'active']);
    DB::table('sub_team_agents')->insert(['sub_team_id' => $sub, 'agent_id' => $ben, 'joined_at' => '2026-04-01', 'status' => 'active']);
    DB::table('agent_attributes')->where('agent_id', $ben)->update(['referral_id' => $ann]);

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?from=2026-01-01&to=2026-10-11&sub_team_id={$sub}")
        ->assertInertia(fn ($page) => $page->where('filters.group', 'recruits')
            ->where('groups.0', 'recruits')
            ->where('rows.total', 1)
            ->where('rows.data.0', fn ($r) => $r['id'] === $ben && $r['name'] === 'Ben' && $r['sponsor'] === 'Ann'
                && $r['team'] === 'Alpha' && $r['sub_team'] === 'Ann One' && $r['sold'] === false && $r['nao'] === 40 && $r['fire'] === 1));
});

test('a team\'s row and drill-down show its whole total sales (old members too) beside what its new recruits sold', function () {
    $range = 'from=2026-01-01&to=2026-10-11';
    $team = DB::table('teams')->where('name', 'Alpha')->value('id');
    $sale = function (int $agent, float $price, string $date) {
        $t = AgentTransaction::create(['agent_id' => $agent, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => $date, 'project_name' => 'Mivela']);
    };
    // Eve signed up before the range (an old member): her 9M counts for the team, not for the new recruits. Ann's 1M counts for both.
    $sale($this->agents['Eve']['id'], 9_000_000, '2026-05-10');
    $sale($this->agents['Ann']['id'], 1_000_000, '2026-06-10');

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&group=teams")
        ->assertInertia(fn ($page) => $page->where('rows.data.0', fn ($r) => $r['name'] === 'Alpha' && (float) $r['value'] === 1_000_000.0 && (float) $r['total_sales'] === 10_000_000.0));
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&team_id={$team}")
        ->assertInertia(fn ($page) => $page->where('summary.kpis.value', 1_000_000)->where('summary.kpis.total_sales', 10_000_000));
    // One sponsor's recruits aren't a group with sales of their own.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&group=sponsors")
        ->assertInertia(fn ($page) => $page->where('rows.data', fn ($rows) => collect($rows)->every(fn ($r) => $r['total_sales'] === null)));
});

test('Recruits KPI: every team in reach — even one with no new recruits — with its new recruits\' share of its total sales', function () {
    $range = 'from=2026-01-01&to=2026-10-11';
    $sale = function (int $agent, float $price, string $date) {
        $t = AgentTransaction::create(['agent_id' => $agent, 'sale_type' => 'project', 'commission_status' => 'Unclaimed', 'sale_status' => 'valid']);
        DB::table('agent_project_transactions')->insert(['agent_transaction_id' => $t->id, 'total_contract_price' => $price, 'reservation_date' => $date, 'project_name' => 'Mivela']);
    };
    // Alpha: Eve (old member) 9M + Ann (new recruit) 1M = 10M, 10% from new recruits. Bravo: only an old member's 5M.
    $sale($this->agents['Eve']['id'], 9_000_000, '2026-05-10');
    $sale($this->agents['Ann']['id'], 1_000_000, '2026-06-10');
    $oldUser = User::factory()->create(['name' => 'Old Timer']);
    $old = DB::table('agents')->insertGetId(['user_id' => $oldUser->id, 'email' => $oldUser->email, 'created_at' => '2019-01-01 00:00:00']);
    $bravo = DB::table('teams')->insertGetId(['name' => 'Bravo', 'agent_id' => $old, 'status' => 'active']);
    DB::table('team_agents')->insert(['team_id' => $bravo, 'agent_id' => $old, 'joined_at' => '2019-01-01', 'status' => 'active']);
    $sale($old, 5_000_000, '2026-07-01');

    $this->actingAs($this->superadmin)->get("/reports/recruits-kpi?{$range}")
        ->assertInertia(fn ($page) => $page->component('Portal/Reports/RecruitsKpi')->where('groups', ['teams', 'sub_teams'])
            ->where('rows', fn ($rows) => collect($rows)->pluck('name')->all() === ['Alpha', 'Bravo']
                && (float) $rows[0]['total_sales'] === 10_000_000.0 && (float) $rows[0]['value'] === 1_000_000.0 && (float) $rows[0]['share'] === 10.0 && $rows[0]['recruits'] === 3
                && $rows[1]['recruits'] === 0 && (float) $rows[1]['total_sales'] === 5_000_000.0 && (float) $rows[1]['share'] === 0.0));

    // A team leader: their own team's sub-teams; a plain agent: no team totals.
    $this->actingAs($this->leader)->get("/reports/recruits-kpi?{$range}")->assertInertia(fn ($page) => $page->where('groups', ['sub_teams']));
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits-kpi?{$range}")->assertForbidden();
});

test('AI analysis: offered inside a team, written only when asked, from group totals with no one\'s name', function () {
    config(['services.openai.key' => 'test-key', 'services.openai.model' => 'gpt-test']);
    $strategy = ['title' => 'Do more', 'detail' => 'Detail', 'owner' => 'team leader', 'kpi' => '+10%', 'impact' => 'high'];
    $answer = [
        'summary' => 'All good.', 'highlights' => [['text' => 'Fine', 'verdict' => 'good']], 'contribution' => 'Old agents lead.', 'training' => 'NAO ok.',
        'outlook' => [['month' => '2026-10', 'expectation' => 'Flat', 'focus' => 'Close', 'actions' => ['Call']]],
        'strategies' => array_fill(0, 12, $strategy),
    ];
    Http::fake(['api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode($answer)]]]])]);
    $team = DB::table('teams')->value('id');
    $range = 'from=2026-01-01&to=2026-10-11';

    // Not for everyone together, nor a sponsor's recruits: only a team or sub-team.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}")
        ->assertInertia(fn ($page) => $page->where('analysisFor', null));

    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&team_id={$team}")
        ->assertInertia(fn ($page) => $page->where('analysisFor', ['type' => 'team', 'id' => $team])->missing('analysis')
            ->reloadOnly(['analysis'], fn ($reload) => $reload
                ->where('analysis.error', null)
                ->where('analysis.ai.summary', 'All good.')
                ->where('analysis.ai.strategies', fn ($s) => count($s) === 10)
                ->where('analysis.facts.members.new', 3)
                ->where('analysis.facts.forecast', fn ($f) => count($f) === 3)
                ->has('analysis.facts.contribution.old')
                ->has('analysis.facts.contribution.new')));

    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => ! str_contains($request->body(), 'Alpha') && ! collect($this->agents)->keys()->contains(fn ($name) => str_contains($request->body(), "\"{$name}\""))
        && $request['model'] === 'gpt-test' && $request['response_format']['type'] === 'json_schema'
        // The compact brief: one line, series as rows, no field names repeated per month.
        && $request['max_completion_tokens'] > 0 && ! str_contains($request['messages'][1]['content'], "\n")
        && ! str_contains($request['messages'][1]['content'], 'new_value'));

    // The same numbers again are answered from the cache, not a second paid call.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&team_id={$team}")
        ->assertInertia(fn ($page) => $page->reloadOnly(['analysis'], fn ($reload) => $reload->where('analysis.ai.summary', 'All good.')));
    Http::assertSentCount(1);
});

test('AI analysis without a key, or when the call fails, still gives the exact numbers', function () {
    $team = DB::table('teams')->value('id');
    $url = "/reports/recruits-progress?from=2026-01-01&to=2026-10-11&team_id={$team}";

    config(['services.openai.key' => null]);
    $this->actingAs($this->superadmin)->get($url)
        ->assertInertia(fn ($page) => $page->reloadOnly(['analysis'], fn ($reload) => $reload
            ->where('analysis.ai', null)->where('analysis.error', fn ($e) => str_contains($e, 'OPENAI_API_KEY'))->has('analysis.facts.double')));

    config(['services.openai.key' => 'test-key']);
    Http::fake(['api.openai.com/*' => Http::response(['error' => ['message' => 'down']], 500)]);
    $this->actingAs($this->superadmin)->get($url)
        ->assertInertia(fn ($page) => $page->reloadOnly(['analysis'], fn ($reload) => $reload
            ->where('analysis.ai', null)->where('analysis.error', fn ($e) => str_contains($e, 'couldn\'t be written'))->has('analysis.facts.monthly', 12)));
});

test('AI analysis needs its own permission', function () {
    $team = DB::table('teams')->value('id');
    $role = $this->leader->roles()->first();
    $role->permissions()->detach(Permission::where('name', 'report_recruits_ai_analysis')->value('id'));

    $this->actingAs($this->leader)->get("/reports/recruits-progress?from=2026-01-01&to=2026-10-11")
        ->assertInertia(fn ($page) => $page->where('analysisFor', null));
});

function fakeAnalysisAnswer(): void
{
    $strategy = ['title' => 'Add active sellers', 'detail' => 'Old agents delivered ₱4.5M.', 'owner' => 'unit managers', 'kpi' => 'sellers per month: 3 → 6 by Dec 2026', 'impact' => 'high'];
    $answer = [
        'summary' => 'The team\'s sales were ₱5.0M from 2 sales.', 'highlights' => [['text' => 'Old agents\' sales: ₱5.0M.', 'verdict' => 'good']],
        'contribution' => 'Old agents made ₱5.0M in the range.', 'training' => 'NAO is 66.7% finished.',
        'outlook' => [['month' => 'Oct 2026', 'expectation' => 'Forecast sales: ₱1.0M.', 'focus' => 'Close reservations', 'actions' => ['Review the pipeline weekly.']]],
        'strategies' => array_fill(0, 10, $strategy),
    ];
    config(['services.openai.key' => 'test-key']);
    Http::fake(['api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode($answer)]]]])]);
}

test('Send report to all: the team leader gets it, with every superadmin copied', function () {
    fakeAnalysisAnswer();
    Mail::fake();
    $team = DB::table('teams')->value('id');
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?'.http_build_query($range + ['team_id' => $team]))
        ->assertInertia(fn ($page) => $page->where('analysisAudience.leader.email', $this->leader->email)->where('analysisAudience.leader.role', 'Team leader')
            ->where('analysisAudience.superadmins', 1));

    $this->actingAs($this->superadmin)->post('/reports/recruits-progress/analysis/send', $range + ['team_id' => $team, 'audience' => 'all'])
        ->assertRedirect()->assertSessionHas('success', fn ($m) => str_contains($m, $this->leader->email));

    Mail::assertSent(RecruitAnalysisReport::class, fn ($mail) => $mail->hasTo($this->leader->email) && $mail->hasCc($this->superadmin->email));
    $this->assertDatabaseHas('activity_logs', ['action' => 'report.analysis_sent']);
});

test('Send report to superadmins only: the leader doesn\'t get it, and the copy says so', function () {
    fakeAnalysisAnswer();
    Mail::fake();
    $team = DB::table('teams')->value('id');

    $this->actingAs($this->superadmin)->post('/reports/recruits-progress/analysis/send', ['from' => '2026-01-01', 'to' => '2026-10-11', 'team_id' => $team, 'audience' => 'superadmins'])
        ->assertSessionHas('success', fn ($m) => str_contains($m, 'superadmin') && str_contains($m, 'not to the leader'));

    Mail::assertSent(RecruitAnalysisReport::class, function ($mail) {
        $html = $mail->render();

        return $mail->hasTo($this->superadmin->email) && ! $mail->hasTo($this->leader->email) && ! $mail->hasCc($this->leader->email)
            && str_contains($html, 'Superadmins only.') && str_contains($mail->envelope()->subject, '(superadmins only)');
    });
});

test('Send report: the email shows the analysis itself, in the house wording', function () {
    fakeAnalysisAnswer();
    $team = DB::table('teams')->value('id');
    $service = app(RecruitAnalysisService::class);
    $progress = app(RecruitProgressService::class);
    $filters = $progress->filters(['from' => '2026-01-01', 'to' => '2026-10-11'], ['sub_teams']);
    $analysis = $service->analyze($filters, ['team_id' => $team], $progress->summary($filters, ['team_id' => $team])['kpis'], $this->superadmin);

    $leader = ['name' => 'Lead Person', 'email' => 'lead@example.com', 'role' => 'Team leader'];
    $html = (new RecruitAnalysisReport(['group' => 'Alpha', 'leader' => $leader, 'audience' => 'all'], $analysis, url('/reports'), 'Super Admin'))->render();

    expect($html)->toContain('Alpha')->toContain('Hi Lead,')->toContain('Contribution KPI')->toContain('10 strategies')->toContain('Add active sellers')
        ->toContain('Open in Recruits Progress')
        // "made / delivered ₱X" is turned into sales wording before anyone sees it.
        ->toContain('Old agents had sales of ₱5.0M')->not->toContain('delivered ₱');
});

test('Send report: only for those given it (no role by default); "all" needs a leader with an email', function () {
    fakeAnalysisAnswer();
    Mail::fake();
    $team = DB::table('teams')->value('id');
    $range = ['from' => '2026-01-01', 'to' => '2026-10-11'];

    $this->actingAs($this->leader)->get('/reports/recruits-progress?'.http_build_query($range))
        ->assertInertia(fn ($page) => $page->where('analysisAudience', null));
    $this->actingAs($this->leader)->post('/reports/recruits-progress/analysis/send', $range + ['team_id' => $team, 'audience' => 'superadmins']);
    Mail::assertNothingSent();

    $this->leader->forceFill(['email' => 'not-an-email'])->save();
    DB::table('agents')->where('user_id', $this->leader->id)->update(['email' => '']);
    $this->actingAs($this->superadmin)->post('/reports/recruits-progress/analysis/send', $range + ['team_id' => $team, 'audience' => 'all'])
        ->assertSessionHas('error', fn ($m) => str_contains($m, 'no email address'));
    Mail::assertNothingSent();

    // The superadmins can still get it.
    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?'.http_build_query($range + ['team_id' => $team]))
        ->assertInertia(fn ($page) => $page->where('analysisAudience.leader', null)->where('analysisAudience.superadmins', 1));
    $this->actingAs($this->superadmin)->post('/reports/recruits-progress/analysis/send', $range + ['team_id' => $team, 'audience' => 'superadmins'])
        ->assertSessionHas('success');
    Mail::assertSent(RecruitAnalysisReport::class, 1);
});
