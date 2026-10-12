<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// What the tree sends when a card is opened: a partial reload of `branch` only.
function branchHeaders(): array
{
    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'Portal/Genealogy/Index',
        'X-Inertia-Partial-Data' => 'branch',
    ];
}

beforeEach(function () {
    $roles = collect(['superadmin' => 'Superadmin', 'secretary' => 'Secretary', 'team_leader' => 'Team Leader', 'unit_manager' => 'Unit Manager', 'agent' => 'Agent'])
        ->map(fn ($label, $name) => Role::create(['name' => $name, 'label' => $label]));
    $genealogy = Permission::where('name', 'view_genealogy')->value('id');
    $roles->each(fn ($role) => $role->permissions()->attach($genealogy));
    $this->roles = $roles;

    // Name, role, area, sponsor, registration step.
    $this->person = function (string $name, string $role, ?string $area, ?int $sponsor = null, int $step = 4) use ($roles) {
        $user = User::factory()->create(['name' => $name]);
        $user->roles()->attach($roles[$role]);
        $id = DB::table('agents')->insertGetId(['user_id' => $user->id, 'email' => $user->email, 'area' => $area]);
        DB::table('agent_attributes')->insert(['agent_id' => $id, 'referral_id' => $sponsor, 'registration_status' => $step]);

        return [$user, $id];
    };

    [$this->superadmin] = ($this->person)('Sam Admin', 'superadmin', null);
    // Tina (Cebu) → Uma (Davao) → Abe (Davao); Tina → Ben (Cebu); Uma → Una (unfinished sign-up).
    [$this->tinaUser, $this->tina] = ($this->person)('Tina Leader', 'team_leader', 'cebu');
    [$this->umaUser, $this->uma] = ($this->person)('Uma Manager', 'unit_manager', 'davao', $this->tina);
    [$this->abeUser, $this->abe] = ($this->person)('Abe Agent', 'agent', 'davao', $this->uma);
    [, $this->ben] = ($this->person)('Ben Agent', 'agent', 'cebu', $this->tina);
    ($this->person)('Una Unfinished', 'agent', 'davao', $this->uma, 2);
    [$this->secretaryUser, $this->secretary] = ($this->person)('Sela Secretary', 'secretary', 'davao');
    DB::table('offices')->insert(['id' => 5, 'name' => 'Davao', 'province' => 'Davao Del Sur', 'area' => 'davao', 'secretary_agent_id' => $this->secretary]);
});

test('everyone opens their own tree: direct recruits with their downline counts, unfinished sign-ups left out', function () {
    $this->actingAs($this->tinaUser)->get('/genealogy')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Portal/Genealogy/Index')
            ->where('root.id', $this->tina)
            ->where('root.role', 'Team Leader')
            ->where('upline', [])
            ->where('canPick', false)
            ->where('firstBranch.total', 2)
            // Biggest downline first: Uma has one fully registered recruit, Ben none.
            ->where('firstBranch.nodes.0.name', 'Uma Manager')
            ->where('firstBranch.nodes.0.recruits', 1)
            ->where('firstBranch.nodes.1.name', 'Ben Agent'));

    // Expanding a card loads its recruits (partial reload of `branch`).
    $this->actingAs($this->tinaUser)
        ->get("/genealogy?parent={$this->uma}", branchHeaders())
        ->assertJsonPath('props.branch.total', 1)
        ->assertJsonPath('props.branch.nodes.0.name', 'Abe Agent');
});

test('a downline member can be opened as the top of the tree, with the sponsors above shown up to the reader', function () {
    $this->actingAs($this->tinaUser)->get("/genealogy?agent={$this->abe}")
        ->assertInertia(fn ($page) => $page->where('root.id', $this->abe)->where('upline', [['id' => $this->tina, 'name' => 'Tina Leader'], ['id' => $this->uma, 'name' => 'Uma Manager']]));

    // Uma sees only from herself down: not her sponsor, not a sibling branch.
    $this->actingAs($this->umaUser)->get("/genealogy?agent={$this->abe}")
        ->assertInertia(fn ($page) => $page->where('upline', [['id' => $this->uma, 'name' => 'Uma Manager']]));
    $this->actingAs($this->umaUser)->get("/genealogy?agent={$this->tina}")->assertForbidden();
    $this->actingAs($this->umaUser)->get("/genealogy?agent={$this->ben}")->assertForbidden();
    $this->actingAs($this->abeUser)
        ->get("/genealogy?parent={$this->tina}", branchHeaders())
        ->assertForbidden();
});

test('the back office picks anyone; an office secretary picks within their area and the downlines below it', function () {
    $this->actingAs($this->superadmin)->get("/genealogy?agent={$this->ben}")->assertInertia(fn ($page) => $page->where('root.id', $this->ben)->where('canPick', true));
    $this->actingAs($this->superadmin)->getJson('/genealogy/search?q=agent&role=agent')
        ->assertJsonCount(2, 'agents')
        ->assertJsonPath('agents.0.name', 'Abe Agent');
    $this->actingAs($this->superadmin)->getJson('/genealogy/search?q=a&role=team_leader')->assertJsonCount(0, 'agents');
    $this->actingAs($this->superadmin)->getJson('/genealogy/search?q=leader&role=team_leader')->assertJsonPath('agents.0.id', $this->tina);

    // Davao's secretary: Uma and Abe (Davao), not Tina or Ben (Cebu).
    $this->actingAs($this->secretaryUser)->get("/genealogy?agent={$this->uma}")->assertOk();
    $this->actingAs($this->secretaryUser)->get("/genealogy?agent={$this->ben}")->assertForbidden();
    $this->actingAs($this->secretaryUser)->getJson('/genealogy/search?q=agent')
        ->assertJson(fn ($json) => $json->where('agents', fn ($agents) => collect($agents)->pluck('name')->all() === ['Abe Agent']));

    // Agents can't pick at all.
    $this->actingAs($this->abeUser)->getJson('/genealogy/search?q=tina')->assertForbidden();
});

test('without view_genealogy there is no genealogy', function () {
    $this->roles['agent']->permissions()->detach();

    $this->actingAs($this->abeUser)->get('/genealogy')->assertForbidden();
});

test('an agent named as their own sponsor in legacy data is not their own recruit', function () {
    DB::table('agent_attributes')->where('agent_id', $this->ben)->update(['referral_id' => $this->ben]);
    [, $carl] = ($this->person)('Carl Agent', 'agent', 'cebu', $this->ben);

    $this->actingAs($this->superadmin)->get("/genealogy?agent={$this->ben}")
        ->assertInertia(fn ($page) => $page->where('root.recruits', 1)->where('firstBranch.total', 1)->where('firstBranch.nodes.0.id', $carl)->where('upline', []));
});

test('each card shows the viewer\'s number of recruits, best downlines first, and loads the rest in steps', function () {
    // Tina gets three more recruits; Ben gets one, so the order is Uma (1), Ben (1), then the newcomers (0) by name.
    foreach (['Xena', 'Yuri', 'Zack'] as $name) {
        ($this->person)("{$name} Agent", 'agent', 'cebu', $this->tina);
    }
    ($this->person)('Bea Agent', 'agent', 'cebu', $this->ben);
    $this->roles['team_leader']->permissions()->attach(Permission::where('name', User::PREFERENCES_PERMISSION)->value('id'));

    // Default: the smallest step (5) — all five fit.
    $this->actingAs($this->tinaUser)->get('/genealogy')
        ->assertInertia(fn ($page) => $page->where('perBranch', 5)->where('layout', 'vertical')->where('firstBranch.total', 5)->has('firstBranch.nodes', 5)->where('canSaveSize', true));

    // The canvas control saves the step; a bad value is refused.
    $this->actingAs($this->tinaUser)->put('/settings/preferences/genealogy', ['genealogy_per_branch' => 10])->assertRedirect();
    $this->actingAs($this->tinaUser)->put('/settings/preferences/genealogy', ['genealogy_per_branch' => 3])->assertSessionHasErrors('genealogy_per_branch');
    $this->actingAs($this->tinaUser)->put('/settings/preferences/genealogy', ['genealogy_layout' => 'horizontal'])->assertRedirect();
    $this->actingAs($this->tinaUser)->put('/settings/preferences/genealogy', ['genealogy_layout' => 'diagonal'])->assertSessionHasErrors('genealogy_layout');
    $this->actingAs($this->tinaUser)->get('/genealogy')->assertInertia(fn ($page) => $page->where('perBranch', 10)->where('layout', 'horizontal'));

    // "Show more": the next ones after those already shown.
    $this->actingAs($this->tinaUser)
        ->get("/genealogy?parent={$this->tina}&offset=2&limit=5", branchHeaders())
        ->assertJsonPath('props.branch.offset', 2)
        ->assertJsonPath('props.branch.total', 5)
        ->assertJson(fn ($json) => $json->where('props.branch.nodes', fn ($nodes) => collect($nodes)->pluck('name')->all() === ['Xena Agent', 'Yuri Agent', 'Zack Agent'])->etc());
});
