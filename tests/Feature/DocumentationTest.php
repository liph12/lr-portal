<?php

use App\Models\Entities\AgentDocument;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Legacy\LegacyDocumentImporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->superadmin = User::factory()->create(['name' => 'Sam Admin']);
    $this->superadmin->roles()->attach(Role::create(['name' => 'superadmin', 'label' => 'Superadmin']));
    $this->staffRole = Role::create(['name' => 'staff', 'label' => 'Staff']);
    $this->staff = User::factory()->create();
    $this->staff->roles()->attach($this->staffRole);

    $agentUser = User::factory()->create(['name' => 'Ana Reyes']);
    $this->agent = DB::table('agents')->insertGetId(['user_id' => $agentUser->id, 'email' => $agentUser->email]);

    $doc = fn (string $type, string $status, bool $current, string $date) => AgentDocument::forceCreate([
        'agent_id' => $this->agent, 'type' => $type, 'file_url' => "https://files.test/{$type}-{$date}.pdf", 'file_name' => "{$type}.pdf",
        'status' => $status, 'is_current' => $current, 'created_at' => $date, 'updated_at' => $date,
    ]);
    $this->oldPrc = $doc('prc', 'valid', false, '2025-01-10');
    $this->prc = $doc('prc', 'pending', true, '2026-03-01');
    $this->contract = $doc('contract', 'for_reupload', true, '2026-02-01');
});

test('documentation lists each agent\'s latest documents by default, every upload on request', function () {
    $this->actingAs($this->superadmin)->get('/superadmin/documentation')
        ->assertInertia(fn ($page) => $page->component('Portal/Documentation/Index')
            ->where('documents.total', 2)
            ->where('documents.data.0.type', 'prc')
            ->where('documents.data.0.name', 'Ana Reyes')
            ->where('counts', ['pending' => 1, 'valid' => 0, 'for_reupload' => 1])
            ->where('document', null));

    $this->actingAs($this->superadmin)->get('/superadmin/documentation?scope=all&status=valid')
        ->assertInertia(fn ($page) => $page->where('documents.total', 1)->where('documents.data.0.id', $this->oldPrc->id)->where('counts.valid', 1));

    // ?document= opens the review panel with the older uploads of the same type.
    $this->actingAs($this->superadmin)->get("/superadmin/documentation?document={$this->prc->id}")
        ->assertInertia(fn ($page) => $page
            ->where('document.agent.name', 'Ana Reyes')
            ->where('document.history', fn ($h) => collect($h)->pluck('id')->all() === [$this->oldPrc->id]));
});

test('only roles granted manage_documents get in', function () {
    $this->actingAs($this->staff)->get('/staff/documentation')->assertForbidden();
    $this->actingAs($this->staff)->patch("/staff/documentation/{$this->prc->id}", ['status' => 'valid'])->assertForbidden();

    $this->staffRole->permissions()->attach(Permission::where('name', 'manage_documents')->value('id'));
    $this->actingAs($this->staff->fresh())->get('/staff/documentation')->assertOk();
});

test('a review sets status, remarks and reviewer; sending back needs remarks; one latest per type', function () {
    $this->actingAs($this->superadmin)->patch("/superadmin/documentation/{$this->prc->id}", ['status' => 'for_reupload', 'remarks' => ''])
        ->assertSessionHasErrors('remarks');

    $this->actingAs($this->superadmin)->patch("/superadmin/documentation/{$this->prc->id}", ['status' => 'valid', 'remarks' => 'Clear copy.'])
        ->assertSessionHasNoErrors();
    expect($this->prc->fresh())->status->toBe('valid')->remarks->toBe('Clear copy.')->reviewed_by->toBe($this->superadmin->id)
        ->and($this->prc->fresh()->reviewed_at)->not->toBeNull()
        ->and(DB::table('activity_logs')->where('action', 'document.review')->exists())->toBeTrue();

    // Making the old upload the latest one demotes the current one.
    $this->actingAs($this->superadmin)->patch("/superadmin/documentation/{$this->oldPrc->id}", ['status' => 'valid', 'is_current' => true]);
    expect($this->oldPrc->fresh()->is_current)->toBeTrue()
        ->and($this->prc->fresh()->is_current)->toBeFalse()
        ->and($this->contract->fresh()->is_current)->toBeTrue();
});

test('reviewers comment on a document', function () {
    $this->actingAs($this->superadmin)->post("/superadmin/documentation/{$this->contract->id}/comments", ['body' => ''])->assertSessionHasErrors('body');
    $this->actingAs($this->superadmin)->post("/superadmin/documentation/{$this->contract->id}/comments", ['body' => 'Asked for the signed page.'])->assertSessionHasNoErrors();

    $this->actingAs($this->superadmin)->get("/superadmin/documentation?document={$this->contract->id}")
        ->assertInertia(fn ($page) => $page
            ->where('document.comments.0.body', 'Asked for the signed page.')
            ->where('document.comments.0.author', 'Sam Admin')
            ->where('documents.data', fn ($rows) => collect($rows)->firstWhere('id', $this->contract->id)['comments_count'] === 1));
});

test('the legacy import maps member numbers to agents and keeps only the newest stable document current', function () {
    config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
    DB::purge('legacy');
    $legacy = Schema::connection('legacy');
    $legacy->create('members', function (Blueprint $t) {
        $t->id();
        $t->integer('memberid')->nullable();
    });
    $legacy->create('member_docs', function (Blueprint $t) {
        $t->id();
        $t->integer('agent_id')->nullable();
        foreach (['file_url', 'type', 'status', 'remarks', 'renewed_status', 'logs'] as $c) {
            $t->text($c)->nullable();
        }
        $t->dateTime('updated_at')->nullable();
        $t->dateTime('created_at')->nullable();
    });
    AgentDocument::query()->delete();

    $memberNo = 900123;
    DB::connection('legacy')->table('members')->insert(['id' => $this->agent, 'memberid' => $memberNo]);
    $row = fn (int $id, string $type, string $status, ?string $renewed, ?int $agent = null) => [
        'id' => $id, 'agent_id' => $agent ?? $memberNo, 'file_url' => "https://s3.test/{$id}.pdf", 'type' => $type, 'status' => $status,
        'remarks' => '', 'renewed_status' => $renewed, 'logs' => json_encode(['fileName' => "file {$id}.pdf"]),
        'created_at' => "2026-01-0{$id} 10:00:00", 'updated_at' => "2026-01-0{$id} 10:00:00",
    ];
    DB::connection('legacy')->table('member_docs')->insert([
        $row(1, 'prc', 'valid', 'stable'),
        $row(2, 'prc', 'pending', 'stable'),          // newer stable: this one is current
        $row(3, 'contract', 'for re-upload', null),    // null = an old upload
        $row(4, 'new-entry', 'valid', 'stable'),
        $row(5, 'dhsud', 'valid', 'stable', 424242),   // no such member
    ]);

    $result = (new LegacyDocumentImporter)->run();
    $docs = AgentDocument::orderBy('id')->get()->keyBy('id');

    expect($result['stats'])->toMatchArray(['read' => 5, 'imported' => 4, 'current' => 2, 'stable_superseded' => 1, 'agent_not_found' => 1])
        ->and($docs[1]->is_current)->toBeFalse()
        ->and($docs[2]->is_current)->toBeTrue()
        ->and($docs[2]->agent_id)->toBe($this->agent)
        ->and($docs[3])->status->toBe('for_reupload')->is_current->toBeFalse()->file_name->toBe('file 3.pdf')
        ->and($docs[4]->type)->toBe('new_entry')
        ->and($docs[2]->reviewed_at)->toBeNull()
        ->and($docs[1]->reviewed_at)->not->toBeNull();

    // Idempotent: a second run changes nothing.
    (new LegacyDocumentImporter)->run();
    expect(AgentDocument::count())->toBe(4);
});
