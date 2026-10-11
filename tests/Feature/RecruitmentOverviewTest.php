<?php

use App\Models\Entities\AgentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

test('cards: members by status, recruits in range, NAO finished and FIRE as percentages', function () {
    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->component('Portal/Reports/Recruits')
            ->where('summary.members.total', 6)
            ->where('summary.members.by_status', ['active' => 4, 'inactive' => 1, 'resigned' => 1, 'terminated' => 0])
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
            ->where('summary.members.total', 4)
            ->where('summary.recruits.total', 2)
            ->where('summary.trainees', 1)
            ->where('trainees.total', 1));
    $this->actingAs($this->superadmin)->get('/reports/recruits-progress?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('summary.kpis.recruits', 2));
});

test('global partners are left out of recruits: they don\'t take NAO or FIRE', function () {
    DB::table('agents')->where('id', $this->agents['Ann']['id'])->update(['agent_type' => 'global_partner']);

    $this->actingAs($this->superadmin)->get('/reports/recruits?from=2026-01-01&to=2026-10-11')
        ->assertInertia(fn ($page) => $page->where('summary.members.total', 5)->where('summary.recruits.total', 3)->where('summary.trainees', 2));
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
            ->where('summary.members.total', 4)
            ->where('summary.trainees', 2)); // Ann and Ben (Cy isn't on the team, Dee sold)

    $this->actingAs($this->leader)->get("/my-team/recruits?{$range}")
        ->assertInertia(fn ($page) => $page->component('Portal/MyTeam/Recruits')->where('summary.trainees', 2)->where('group.name', 'Alpha'));

    // A plain agent: only the recruits they sponsored (none here), whatever team the URL asks for.
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits?{$range}&team_id=1")
        ->assertInertia(fn ($page) => $page->where('summary.members.total', 0)->where('scope.name', 'Ann'));
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
            ->where('groups', ['teams', 'sub_teams', 'areas', 'sponsors'])
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
        ->assertInertia(fn ($page) => $page->where('groups', ['sub_teams', 'areas', 'sponsors'])->where('filters.group', 'sub_teams')->where('summary.kpis.recruits', 3)->where('scope.name', 'Alpha'));

    // A plain agent: the recruits they sponsored (Ben and Cy), grouped by team / unit manager / location, never widened.
    $this->actingAs($this->agents['Ann']['user'])->get("/reports/recruits-progress?{$range}&sponsor_id={$this->agents['Dee']['id']}")
        ->assertInertia(fn ($page) => $page->where('groups', ['teams', 'sub_teams', 'areas'])->where('summary.kpis.recruits', 2)->where('scope.name', 'Ann'));
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
            ->where('groups', ['sub_teams', 'areas', 'sponsors'])
            ->where('summary.kpis.recruits', 3)
            ->where('summary.kpis.trainees', 2)
            ->where('summary.kpis.overall_status', ['not_started' => 0, 'in_progress' => 1, 'finished' => 1]));

    // Clicking a sponsor: just their recruits, grouped by anything but sponsor.
    $this->actingAs($this->superadmin)->get("/reports/recruits-progress?{$range}&sponsor_id={$ann}")
        ->assertInertia(fn ($page) => $page->where('selection.type', 'sponsor')->where('selection.name', 'Ann')->where('groups', ['teams', 'sub_teams', 'areas'])->where('summary.kpis.recruits', 2));

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
            ->where('groups', ['teams', 'sub_teams', 'sponsors'])
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
            ->where('groups', ['sub_teams', 'areas', 'sponsors'])
            ->where('summary.kpis.recruits', 3)));
});
