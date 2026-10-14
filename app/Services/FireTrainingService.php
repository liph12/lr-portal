<?php

namespace App\Services;

use App\Models\Entities\Agent;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

// FIRE (Filipinohomes Institute of Real Estate), from realestatetraining.ph's integration API (services.fire: url + x-api-key, called from the server only, so
// the key never reaches a browser). The agent's training account is resolved by email (created there the first time), then:
// the modules with their video, slides and best score, a module's exam (questions and A–D choices — the API sends no answers),
// and submitting answers, which the site grades. A pass is 7 of 10; agents.fire_certificates follows the site's count of passes.
class FireTrainingService
{
    public const PASS_SCORE = 7;

    // Module 12, Rent.ph's "Become a Rent Manager": not in current-courses; its own exam (rent-exam / submit-rent-exam), score
    // (rental-score) and training videos.
    public const RENT_MODULE = 12;

    private const RENT_VIDEOS = [
        ['title' => 'Creating Rental Opportunities Amidst COVID-19', 'src' => 'https://www.youtube.com/embed/FPTwL4WOQ-o'],
        ['title' => 'Rent Manager Opportunity', 'src' => 'https://realestatetraining.ph/video/eduardoManahan.mp4'],
    ];

    // Passing an exam: 7 of 10, i.e. 70% (the Rent.ph exam has 15 questions → 11).
    public static function passScore(int $questions): int
    {
        return $questions === 10 ? self::PASS_SCORE : (int) ceil($questions * 0.7);
    }

    public function __construct(private ActivityLogger $activity) {}

    /**
     * The agent's account on the training site, made there if it doesn't exist yet (remembered for a day).
     *
     * @return array{member_id: ?int, requires_endorsement: bool}
     */
    public function resolve(Agent $agent): array
    {
        $agent->loadMissing('user:id,name,email');
        $email = $this->email($agent);

        return Cache::remember('fire-member:'.sha1($email), now()->addDay(), function () use ($agent, $email) {
            $sponsorId = DB::table('agent_attributes')->where('agent_id', $agent->id)->value('referral_id');
            $sponsor = $sponsorId ? Agent::with('user:id,name')->find($sponsorId) : null;
            $body = $this->call(fn () => $this->client()->post('register-or-resolve', [
                'emailaddress' => $email,
                'firstname' => $agent->first_name ?: strtok((string) $agent->user?->name, ' '),
                'lastname' => $agent->last_name ?: '',
                'photo' => $agent->avatar,
                'invitedBy' => $sponsor ? (trim("{$sponsor->first_name} {$sponsor->last_name}") ?: $sponsor->user?->name) : null,
            ]));

            return ['member_id' => isset($body['member']['id']) ? (int) $body['member']['id'] : null, 'requires_endorsement' => (bool) ($body['requires_endorsement'] ?? false)];
        });
    }

    /**
     * Every module with what to watch and read, and how the agent did.
     *
     * @return array<int, array<string, mixed>>
     */
    public function modules(Agent $agent): array
    {
        $body = $this->call(fn () => $this->client()->get('current-courses', ['email' => $this->email($agent)]));

        return [...array_map(fn (array $course) => $this->module($course), $body['data'] ?? []), $this->rentModule($agent)];
    }

    // Passes made on the training site before (or outside) the portal count too: agents.fire_certificates follows them.
    public function syncPasses(Agent $agent, array $modules): void
    {
        // The FIRE count is the site's courses; Rent.ph's module is its own certificate.
        $passed = count(array_filter($modules, fn ($m) => $m['passed'] && $m['id'] !== self::RENT_MODULE));
        DB::table('agent_attributes')->where('agent_id', $agent->id)->where('fire_certificates', '<', $passed)->update(['fire_certificates' => $passed, 'updated_at' => now()]);
    }

    /**
     * One module and its exam, without answers.
     *
     * @return array{module: array<string, mixed>, questions: array<int, array{number: int, question: string, choices: array<int, array{value: string, text: string}>}>}
     */
    public function exam(Agent $agent, int $moduleId): array
    {
        if ($moduleId === self::RENT_MODULE) {
            return ['module' => $this->rentModule($agent), 'questions' => array_map(fn (array $q) => [
                'number' => $q['id'],
                'question' => $q['question'],
                'choices' => array_map(fn ($text, $i) => ['value' => chr(65 + $i), 'text' => $text], $q['choices'], array_keys($q['choices'])),
            ], $this->rentQuestions())];
        }
        $body = $this->call(fn () => $this->client()->get('course-exam', ['id' => $moduleId, 'email' => $this->email($agent)]));
        if (empty($body['course'])) {
            throw new RuntimeException('That FIRE module was not found.');
        }

        return [
            'module' => $this->module($body['course']),
            'questions' => array_values(array_map(fn (array $q) => [
                'number' => (int) $q['questionNo'],
                'question' => (string) $q['question'],
                'choices' => array_values(array_map(fn (array $c) => ['value' => (string) $c['choice'], 'text' => (string) $c['choiceDesc']], $q['choices'] ?? [])),
            ], $body['exam'] ?? [])),
        ];
    }

    /**
     * Sends the answers for grading; records the site's count of passed modules on the agent.
     *
     * @param  array<int, array{question: int, answer: string}>  $answers
     * @return array{score: int, total: int, passed: bool, results: array<int, array{question: int, position: int, correct: bool}>, total_passed: int}
     */
    public function submit(Agent $agent, int $moduleId, array $answers): array
    {
        if ($moduleId === self::RENT_MODULE) {
            return $this->submitRent($agent, $answers);
        }
        $body = $this->call(fn () => $this->client()->post('store-exam-answers', ['course_id' => $moduleId, 'answers' => $answers, 'email' => $this->email($agent)]));
        // The answers arrive in the order the agent saw the (shuffled) questions: number the results that way, Q1 first.
        $position = array_flip(array_map(fn ($a) => (int) $a['question'], array_values($answers)));
        $results = array_map(fn ($r, $i) => [
            'question' => $q = (int) ($r['question'] ?? $r['questionNo'] ?? $answers[$i]['question'] ?? $i + 1),
            'position' => ($position[$q] ?? $i) + 1,
            'correct' => (bool) ($r['correct'] ?? false),
        ], $body['results'] ?? [], array_keys($body['results'] ?? []));
        usort($results, fn ($a, $b) => $a['position'] <=> $b['position']);
        $score = count(array_filter($results, fn ($r) => $r['correct']));
        $totalPassed = (int) ($body['totalPassed'] ?? 0);

        DB::table('agent_attributes')->updateOrInsert(['agent_id' => $agent->id], ['fire_certificates' => $totalPassed, 'updated_at' => now()]);
        $passed = $score >= self::PASS_SCORE;
        $this->activity->describe('fire.exam_taken', "FIRE module {$moduleId} exam: {$score}/".count($answers).($passed ? ' (passed)' : ''), $agent, ['module' => $moduleId, 'score' => $score, 'total_passed' => $totalPassed]);

        return ['score' => $score, 'total' => count($answers), 'passed' => $passed, 'results' => $results, 'total_passed' => $totalPassed];
    }

    /**
     * Rent.ph's exam sends the chosen choice's text (and the question's), not a letter: map the A–E picks back to it.
     *
     * @param  array<int, array{question: int, answer: string}>  $answers  question = the rent question's id
     */
    private function submitRent(Agent $agent, array $answers): array
    {
        $questions = collect($this->rentQuestions())->keyBy('id');
        $payload = array_values(array_filter(array_map(function ($a) use ($questions) {
            $q = $questions->get((int) $a['question']);

            return $q ? ['id' => $q['id'], 'question' => $q['question'], 'answer' => $q['choices'][ord($a['answer']) - 65] ?? ''] : null;
        }, $answers)));
        $body = $this->call(fn () => $this->client()->post('submit-rent-exam', ['answers' => $payload, 'email' => $this->email($agent)]));

        $position = array_flip(array_map(fn ($a) => (int) $a['question'], array_values($answers)));
        $results = array_map(fn ($r, $i) => [
            'question' => $q = (int) ($r['id'] ?? $payload[$i]['id'] ?? $i + 1),
            'position' => ($position[$q] ?? $i) + 1,
            'correct' => (bool) ($r['correct'] ?? false),
        ], array_values(array_filter($body, 'is_array')), array_keys(array_values(array_filter($body, 'is_array'))));
        usort($results, fn ($a, $b) => $a['position'] <=> $b['position']);
        $score = count(array_filter($results, fn ($r) => $r['correct']));
        $passed = $score >= self::passScore(count($payload));
        $this->activity->describe('fire.exam_taken', "Rent.ph Rent Manager exam: {$score}/".count($payload).($passed ? ' (passed)' : ''), $agent, ['module' => self::RENT_MODULE, 'score' => $score]);

        return ['score' => $score, 'total' => count($payload), 'passed' => $passed, 'results' => $results,
            'total_passed' => (int) DB::table('agent_attributes')->where('agent_id', $agent->id)->value('fire_certificates')];
    }

    /**
     * The Rent.ph exam's questions, with every choice (some have five).
     *
     * @return array<int, array{id: int, question: string, choices: array<int, string>}>
     */
    private function rentQuestions(): array
    {
        $body = $this->call(fn () => $this->client()->get('rent-exam'));

        return array_values(array_map(fn (array $q) => [
            'id' => (int) $q['id'],
            'question' => trim((string) $q['question']),
            'choices' => array_values(array_map('strval', $q['choices'] ?? [])),
        ], array_filter($body, 'is_array')));
    }

    /**
     * Module 12: Rent.ph's "Become a Rent Manager" — its two training videos, and whether its exam is passed (rental-score
     * answers 403 "No rental exam passed yet" until then).
     *
     * @return array<string, mixed>
     */
    private function rentModule(Agent $agent): array
    {
        try {
            $response = $this->client()->get('rental-score', ['email' => $this->email($agent)]);
            $score = $response->successful() ? $response->json('score') : null;
        } catch (Throwable) {
            $score = null;
        }

        return [
            'id' => self::RENT_MODULE,
            'title' => 'Become a Rent Manager',
            'brand' => 'rentph',
            'description' => 'Rent.ph’s training for Rent Managers: watch the videos, then pass the exam.',
            'learning' => [],
            'speaker' => null,
            'slides' => null,
            'video' => null,
            'videos' => array_map(fn ($v) => $v + ['kind' => str_contains($v['src'], 'youtube.com/') ? 'youtube' : 'file'], self::RENT_VIDEOS),
            'best_score' => $score !== null ? (int) $score : null,
            'taken_on' => null,
            'passed' => $score !== null,
        ];
    }

    /**
     * @param  array<string, mixed>  $course
     * @return array<string, mixed>
     */
    private function module(array $course): array
    {
        $scores = array_map(fn ($s) => (int) ($s['score'] ?? 0), $course['scores'] ?? []);
        $best = $scores ? max($scores) : null;
        $taken = collect($course['scores'] ?? [])->sortByDesc('score')->first();
        // The video comes as an <iframe> (YouTube) or a file address.
        $video = (string) ($course['video'] ?? '');
        $src = preg_match('/src="([^"]+)"/', $video, $m) ? $m[1] : (filter_var($video, FILTER_VALIDATE_URL) ? $video : null);

        return [
            'id' => (int) $course['id'],
            'title' => (string) $course['title'],
            'description' => (string) ($course['description'] ?? ''),
            'learning' => array_values(array_filter(array_map(fn ($l) => is_string($l) ? $l : (string) ($l['description'] ?? ''), $course['learning_descriptions'] ?? []))),
            'speaker' => isset($course['speaker']['name']) ? ['name' => (string) $course['speaker']['name'], 'avatar' => $this->photoUrl($course['speaker']['avatar'] ?? null)] : null,
            'slides' => ($course['presentation'] ?? null) ?: null,
            'video' => $src ? ['src' => $src, 'kind' => str_contains($src, 'youtube.com/') ? 'youtube' : 'file'] : null,
            'best_score' => $best,
            'taken_on' => $taken['dateTaken'] ?? null,
            'passed' => $best !== null && $best >= self::PASS_SCORE,
        ];
    }

    // Speaker photos are named after the speaker ("DR. EDUARDO G. ONG.png"): encode the file name so the link works.
    private function photoUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }
        $slash = strrpos($url, '/');

        return $slash === false ? $url : substr($url, 0, $slash + 1).rawurlencode(rawurldecode(substr($url, $slash + 1)));
    }

    private function email(Agent $agent): string
    {
        return strtolower(trim((string) ($agent->email ?: $agent->user?->email)));
    }

    private function client(): PendingRequest
    {
        $key = config('services.fire.key');
        if (! $key) {
            throw new RuntimeException('FIRE is not set up yet (FIRE_API_KEY).');
        }

        return Http::baseUrl(rtrim((string) config('services.fire.url'), '/').'/')
            ->withHeaders(['x-api-key' => $key, 'X-Requested-With' => 'XMLHttpRequest'])
            ->acceptJson()->asJson()->timeout(20);
    }

    // The site's reply, or a readable failure.
    private function call(callable $request): array
    {
        try {
            $response = $request();
        } catch (Throwable) {
            throw new RuntimeException("The FIRE site can't be reached right now. Please try again in a moment.");
        }
        if (! $response->successful()) {
            throw new RuntimeException("The FIRE site didn't respond as expected (HTTP {$response->status()}). Please try again later.");
        }

        return (array) $response->json();
    }
}
