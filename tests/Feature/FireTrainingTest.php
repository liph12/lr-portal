<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['services.fire.url' => 'https://training.test/api/integration/agent', 'services.fire.key' => 'test-key']);
    $this->user = User::factory()->create(['email' => 'juan@example.test']);
    $this->user->roles()->attach(Role::create(['name' => 'agent', 'label' => 'Agent']));
    $this->agent = DB::table('agents')->insertGetId(['user_id' => $this->user->id, 'email' => 'juan@example.test', 'first_name' => 'Juan', 'last_name' => 'Cruz', 'agent_type' => 'local']);
    DB::table('agent_attributes')->insert(['agent_id' => $this->agent, 'registration_status' => 4, 'fire_certificates' => 0]);

    $course = fn (int $id, array $scores = []) => [
        'id' => $id, 'title' => "Module {$id}", 'description' => 'About it', 'learning_descriptions' => ['Point one'],
        'speaker' => ['name' => 'Dr. Ong', 'avatar' => 'https://training.test/profile/presentation/DR. EDUARDO G. ONG, REB.png', 'contact' => ''], 'presentation' => "https://training.test/pdf/{$id}.pdf",
        'video' => '<iframe width="1000px" src="https://www.youtube.com/embed/abc'.$id.'" frameborder="0"></iframe>', 'scores' => $scores,
    ];
    Http::fake([
        'training.test/api/integration/agent/register-or-resolve' => Http::response(['member' => ['id' => 77, 'emailaddress' => 'juan@example.test'], 'requires_endorsement' => false]),
        'training.test/api/integration/agent/current-courses*' => Http::response(['data' => [$course(1, [['score' => 9, 'dateTaken' => 'Oct 1, 2026']]), $course(2)]]),
        'training.test/api/integration/agent/course-exam*' => Http::response(['course' => $course(2), 'exam' => [
            ['id' => 1, 'courseid' => 2, 'questionNo' => 1, 'question' => 'First?', 'choices' => [['id' => 1, 'choice' => 'A', 'choiceDesc' => 'Yes'], ['id' => 2, 'choice' => 'B', 'choiceDesc' => 'No']]],
            ['id' => 2, 'courseid' => 2, 'questionNo' => 2, 'question' => 'Second?', 'choices' => [['id' => 3, 'choice' => 'A', 'choiceDesc' => 'Yes'], ['id' => 4, 'choice' => 'B', 'choiceDesc' => 'No']]],
        ]]),
        'training.test/api/integration/agent/store-exam-answers' => Http::response(['results' => [['question' => 1, 'correct' => true], ['question' => 2, 'correct' => true]], 'totalPassed' => 2]),
        'training.test/api/integration/agent/rental-score*' => Http::response(['message' => 'No rental exam passed yet.', 'success' => false], 403),
        'training.test/api/integration/agent/rent-exam' => Http::response([
            ['id' => 31, 'question' => ' What does a Rent Manager do? ', 'choices' => ['Sells', 'Manages rentals', 'Builds', 'Lends', 'All of these']],
            ['id' => 32, 'question' => 'Where are rentals listed?', 'choices' => ['Rent.ph', 'Nowhere', 'A wall', 'TV']],
        ]),
        'training.test/api/integration/agent/submit-rent-exam' => Http::response([
            ['id' => 32, 'question' => 'Where are rentals listed?', 'choice' => 'Rent.ph', 'correct' => true],
            ['id' => 31, 'question' => 'What does a Rent Manager do?', 'choice' => 'All of these', 'correct' => false],
        ]),
    ]);
});

test('FIRE training: the account is resolved with the agent, the modules list with video, slides and how they did', function () {
    $this->actingAs($this->user)->get('/fire')->assertInertia(fn ($page) => $page
        ->component('Portal/Fire/Index')
        ->where('endorsement', false)->where('error', null)
        ->where('modules.0.passed', true)->where('modules.0.best_score', 9)
        ->where('modules.0.video', ['src' => 'https://www.youtube.com/embed/abc1', 'kind' => 'youtube'])
        ->where('modules.0.slides', 'https://training.test/pdf/1.pdf')
        ->where('modules.0.speaker.avatar', 'https://training.test/profile/presentation/DR.%20EDUARDO%20G.%20ONG%2C%20REB.png')
        ->where('modules.1.passed', false)->where('modules.1.best_score', null));

    // Module 1 was passed on the site already: the agent's count follows.
    expect((int) DB::table('agent_attributes')->where('agent_id', $this->agent)->value('fire_certificates'))->toBe(1);

    Http::assertSent(fn (Request $r) => str_ends_with($r->url(), 'register-or-resolve')
        && $r->header('x-api-key') === ['test-key'] && $r['emailaddress'] === 'juan@example.test' && $r['firstname'] === 'Juan' && $r['lastname'] === 'Cruz');
});

test('an exam shows its questions and choices; answers go to the site, and the passes are recorded on the agent', function () {
    $this->actingAs($this->user)->get('/fire/2/exam')->assertInertia(fn ($page) => $page
        ->component('Portal/Fire/Exam')
        ->has('questions', 2)->where('questions.0.choices.1', ['value' => 'B', 'text' => 'No'])
        ->missing('questions.0.answer')->where('result', null));

    $this->actingAs($this->user)->post('/fire/2/exam', ['answers' => [['question' => 1, 'answer' => 'Z']]])->assertSessionHasErrors('answers.0.answer');
    // Shown in a shuffled order — here question 2 first: the results are numbered as the agent saw them.
    $this->actingAs($this->user)->post('/fire/2/exam', ['answers' => [['question' => 2, 'answer' => 'B'], ['question' => 1, 'answer' => 'A']]])
        ->assertRedirect(route('fire.exam', 2))
        ->assertSessionHas('fire_result', fn ($r) => $r['results'][0] === ['question' => 2, 'position' => 1, 'correct' => true] && $r['results'][1]['position'] === 2);

    Http::assertSent(fn (Request $r) => str_ends_with($r->url(), 'store-exam-answers') && $r['course_id'] === 2 && $r['email'] === 'juan@example.test' && $r['answers'][0] === ['question' => 2, 'answer' => 'B']);
    expect((int) DB::table('agent_attributes')->where('agent_id', $this->agent)->value('fire_certificates'))->toBe(2);
});

test('the exam opens in a new question order', function () {
    $orders = collect(range(1, 12))->map(fn () => collect($this->actingAs($this->user)->get('/fire/2/exam')->viewData('page')['props']['questions'])->pluck('number')->implode(','));
    expect($orders->unique()->count())->toBeGreaterThan(1)
        ->and($orders->every(fn ($o) => collect(explode(',', $o))->sort()->values()->all() === ['1', '2']))->toBeTrue();
});

test('module 12 is Rent.ph\'s Become a Rent Manager: its videos, its own exam (every choice kept) and its own submission', function () {
    $this->actingAs($this->user)->get('/fire')->assertInertia(fn ($page) => $page
        ->where('modules.2.id', 12)->where('modules.2.title', 'Become a Rent Manager')->where('modules.2.brand', 'rentph')
        ->where('modules.2.speaker', null)->has('modules.2.videos', 2)->where('modules.2.videos.1.kind', 'file')
        ->where('modules.2.passed', false));

    $this->actingAs($this->user)->get('/fire/12/exam')->assertInertia(fn ($page) => $page
        ->has('questions', 2)->where('passScore', 2)
        ->where('questions', fn ($qs) => collect($qs)->firstWhere('number', 31)['choices'][4] === ['value' => 'E', 'text' => 'All of these']));

    $this->actingAs($this->user)->post('/fire/12/exam', ['answers' => [['question' => 32, 'answer' => 'A'], ['question' => 31, 'answer' => 'E']]])
        ->assertSessionHas('fire_result', fn ($r) => $r['score'] === 1 && $r['total'] === 2 && ! $r['passed'] && $r['results'][0] === ['question' => 32, 'position' => 1, 'correct' => true]);
    Http::assertSent(fn (Request $r) => str_ends_with($r->url(), 'submit-rent-exam') && $r['email'] === 'juan@example.test'
        && $r['answers'] === [['id' => 32, 'question' => 'Where are rentals listed?', 'answer' => 'Rent.ph'], ['id' => 31, 'question' => 'What does a Rent Manager do?', 'answer' => 'All of these']]);
});

test('certificates: a passed module downloads as an image drawn on its template; others and strangers get nothing', function () {
    $response = $this->actingAs($this->user)->get("/agents/{$this->agent}/certificates/1");
    $response->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    expect($response->headers->get('Content-Disposition'))->toContain('FIRE-Certificate-module-1-juan-cruz.jpg')
        ->and(getimagesizefromstring($response->getContent())[2])->toBe(IMAGETYPE_JPEG);

    // Module 2 isn't passed; module 5 has no template yet; the Rent.ph exam isn't passed (rental-score 403).
    $this->actingAs($this->user)->get("/agents/{$this->agent}/certificates/2")->assertNotFound();
    $this->actingAs($this->user)->get("/agents/{$this->agent}/certificates/5")->assertNotFound();
    $this->actingAs($this->user)->get("/agents/{$this->agent}/certificates/12")->assertNotFound();

    $stranger = User::factory()->create();
    $stranger->roles()->attach(Role::where('name', 'agent')->first());
    $this->actingAs($stranger)->get("/agents/{$this->agent}/certificates/1")->assertNotFound();

    // The journey lists it, loaded after the page.
    $this->actingAs($this->user)->get('/my-journey')->assertInertia(fn ($page) => $page->missing('certificates')
        ->loadDeferredProps(fn ($reload) => $reload->where('certificates.items.0.module', 1)->where('certificates.items.0.url', route('agents.certificate', [$this->agent, 1]))->has('certificates.items', 1)));
});

test('an account the training site flags uploads its endorsement letter first; FIRE stays locked until then', function () {
    config(['services.fire.url' => 'https://flagged.test/api/integration/agent']);
    $accepted = false;
    Http::fake(function (Request $r) use (&$accepted) {
        return match (true) {
            str_ends_with($r->url(), 'register-or-resolve') => Http::response(['member' => ['id' => 77], 'requires_endorsement' => ! $accepted]),
            str_ends_with($r->url(), '77/reupload-endorsement') => Http::response(['member' => ['id' => 77, 'endorsement' => ($accepted = true) ? 'letter.pdf' : null]]),
            default => Http::response(['data' => []]),
        };
    });

    $this->actingAs($this->user)->get('/fire')->assertInertia(fn ($page) => $page
        ->where('endorsement', true)->where('modules', [])
        ->where('endorsementTemplate', config('services.fire.endorsement_template'))->has('maxFileKb'));
    $this->actingAs($this->user)->get('/fire/1')->assertRedirect(route('fire.index'));
    $this->actingAs($this->user)->get('/fire/1/exam')->assertRedirect(route('fire.index'));

    $this->actingAs($this->user)->post('/fire/endorsement', [])->assertSessionHasErrors('endorsementLetter');
    $this->actingAs($this->user)->post('/fire/endorsement', ['endorsementLetter' => UploadedFile::fake()->create('letter.pdf', 120, 'application/pdf')])
        ->assertRedirect(route('fire.index'))->assertSessionHas('success');
    Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '77/reupload-endorsement') && $r->isMultipart()
        && collect($r->data())->contains(fn ($part) => $part['name'] === 'endorsementLetter' && $part['filename'] === 'letter.pdf'));

    $this->actingAs($this->user)->get('/fire')->assertInertia(fn ($page) => $page->where('endorsement', false));
});

test('when the training site is down the page says so instead of failing', function () {
    config(['services.fire.url' => 'https://down.test/api']);
    Http::fake(['down.test/*' => Http::response('oops', 500)]);
    $this->actingAs($this->user)->get('/fire')->assertInertia(fn ($page) => $page->where('modules', [])->where('error', fn ($e) => str_contains($e, "didn't respond")));
});
