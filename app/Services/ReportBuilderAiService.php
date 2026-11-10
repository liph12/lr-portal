<?php

namespace App\Services;

use App\Models\Entities\Developer;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

// Report Builder's "Ask AI" bar: a free-text request ("condo sales in Cebu last quarter by developer") becomes a
// SalesReportService filter set. OpenAI only extracts intent and best-guess names — it never sees or invents IDs;
// every name it returns (developer, team, sub-team, branch, agent) is resolved here against the real tables, reusing
// the same lookups the navbar search and sale forms already use. A name that doesn't resolve is dropped, not guessed.
class ReportBuilderAiService
{
    public const PERMISSION = 'use_ai_report_builder';

    private const PER_HOUR = 20;

    public function __construct(private OpenAiClient $ai, private GroupSearchService $groups) {}

    public function configured(): bool
    {
        return $this->ai->configured();
    }

    /**
     * @return array{filters: array<string, mixed>, summary: ?string, warnings: string[], error: ?string}
     */
    public function interpret(string $prompt, User $user): array
    {
        $result = ['filters' => [], 'summary' => null, 'warnings' => [], 'error' => null];

        if (! $this->configured()) {
            return [...$result, 'error' => "The AI report builder isn't set up yet (OPENAI_API_KEY)."];
        }
        if (! RateLimiter::attempt("report-builder-ai:{$user->id}", self::PER_HOUR, fn () => true, 3600)) {
            return [...$result, 'error' => "That's a lot of requests in an hour — please try again a little later."];
        }

        try {
            $data = $this->ask($prompt);
            [$filters, $warnings] = $this->resolve($data, $user);

            return [...$result, 'filters' => $filters, 'summary' => $data['summary'], 'warnings' => $warnings];
        } catch (Throwable $e) {
            Log::warning('Report builder AI request failed', ['error' => $e->getMessage()]);

            return [...$result, 'error' => "Couldn't make sense of that request just now. Try rephrasing, or set the filters by hand below."];
        }
    }

    /**
     * Turns the model's best-guess names into the real filter values `SalesReportService::filters()` reads, dropping
     * (and warning about) any name that matches nothing.
     *
     * @param  array<string, mixed>  $data
     * @return array{0: array<string, mixed>, 1: string[]}
     */
    private function resolve(array $data, User $user): array
    {
        $filters = [];
        $warnings = [];

        foreach (['view', 'category', 'status'] as $key) {
            if ($data[$key] ?? null) {
                $filters[$key] = $data[$key];
            }
        }
        foreach (['from', 'to'] as $key) {
            if (is_string($data[$key] ?? null) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $data[$key])) {
                $filters[$key] = $data[$key];
            }
        }
        foreach (['unit_type', 'project_name'] as $key) {
            $value = trim((string) ($data[$key] ?? ''));
            if ($value !== '') {
                $filters[$key] = $value;
            }
        }

        $named = [
            'developer_id' => ['developer_name', fn (string $term) => $this->resolveDeveloper($term), 'developer'],
            'team_id' => ['team_name', fn (string $term) => $this->resolveGroup($user, $term, 'team'), 'team'],
            'sub_team_id' => ['sub_team_name', fn (string $term) => $this->resolveGroup($user, $term, 'sub_team'), 'sub-team'],
            'area' => ['area_name', fn (string $term) => $this->resolveGroup($user, $term, 'area'), 'branch'],
            'agent_id' => ['agent_name', fn (string $term) => $this->resolveAgent($term), 'agent'],
            'property_type_id' => ['property_type', fn (string $term) => $this->resolvePropertyType($term), 'property type'],
        ];
        foreach ($named as $filterKey => [$sourceKey, $resolver, $label]) {
            $term = trim((string) ($data[$sourceKey] ?? ''));
            if ($term === '') {
                continue;
            }
            if (($id = $resolver($term)) !== null) {
                $filters[$filterKey] = $id;
            } else {
                $warnings[] = "couldn't find a {$label} named \"{$term}\"";
            }
        }

        return [$filters, $warnings];
    }

    private function resolveDeveloper(string $term): ?int
    {
        $id = Developer::query()
            ->where('name', 'like', $this->like($term))
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [$this->prefix($term)])
            ->orderBy('name')
            ->value('id');

        return $id !== null ? (int) $id : null;
    }

    private function resolveAgent(string $term): ?int
    {
        $like = $this->like($term);
        $id = DB::table('users')
            ->join('agents', 'agents.user_id', '=', 'users.id')
            ->where('users.status', 'active')
            ->where(fn ($q) => $q->where('users.name', 'like', $like)->orWhere('users.email', 'like', $like))
            ->orderByRaw('CASE WHEN users.name LIKE ? THEN 0 ELSE 1 END', [$this->prefix($term)])
            ->orderBy('users.name')
            ->value('agents.id');

        return $id !== null ? (int) $id : null;
    }

    private function resolvePropertyType(string $name): ?int
    {
        $id = DB::table('project_property_types')->where('name', $name)->value('id');

        return $id !== null ? (int) $id : null;
    }

    // Teams, sub-teams and branches: the same reach-aware search behind the navbar (unrestricted for Report
    // Builder's only audience, superadmin); the first match of the wanted type.
    private function resolveGroup(User $user, string $term, string $type): int|string|null
    {
        return collect($this->groups->search($user, $term))->firstWhere('type', $type)['id'] ?? null;
    }

    private function like(string $term): string
    {
        return '%'.addcslashes($term, '%_\\').'%';
    }

    private function prefix(string $term): string
    {
        return addcslashes($term, '%_\\').'%';
    }

    /**
     * @return array<string, mixed>
     */
    private function ask(string $prompt): array
    {
        $today = CarbonImmutable::today()->toFormattedDateString();
        $propertyTypes = DB::table('project_property_types')->orderBy('name')->pluck('name')->filter()->values()->all();
        $propertyTypeList = implode(', ', $propertyTypes);
        $views = implode(', ', SalesReportService::VIEWS);
        $categories = implode(', ', SalesReportService::CATEGORIES);

        $system = <<<TXT
You translate a free-text request about a real-estate brokerage's sales report into a filter set. Today is {$today}.

Fields you can set (omit nothing — use null for anything not mentioned or not inferrable):
- view: how to group the breakdown table. One of: {$views}. Pick "developers" for "by developer", "teams" for "by team", "projects" for "by project", etc. Null if not clear — it defaults to "agents".
- category: one of {$categories}, or null for every category.
- status: "valid", "pending", "invalid", "cancelled", "all", or null (defaults to valid sales only).
- from / to: explicit dates as YYYY-MM-DD, resolving any relative phrase ("last quarter", "this year", "since March") against today's date. Null if no range is mentioned (defaults to this year to today).
- developer_name, team_name, sub_team_name, area_name (a branch/office, e.g. "Cebu"), agent_name (a person): the best-guess name exactly as written or corrected for an obvious typo, or null if not mentioned. Never invent a name that isn't in the request.
- property_type: exactly one of: {$propertyTypeList}, matched from how the user describes it ("condo" → "Condominiums"), or null.
- unit_type: free text (e.g. "2 Bedrooms", "Studio"), or null — there's no fixed list.
- project_name: a specific project's name if one is named, or null.
- summary: one short sentence (plain language, no field names) describing what you understood, to show the user — e.g. "Showing condo sales in Cebu from Jul 1 to Sep 30, 2026, grouped by developer." If nothing in the request mapped to a filter, say so plainly.
TXT;

        $nullableText = fn (string $what) => ['type' => ['string', 'null'], 'description' => $what];
        $nullableEnum = fn (array $values, string $what) => ['type' => ['string', 'null'], 'enum' => [...$values, null], 'description' => $what];
        $object = fn (array $properties) => ['type' => 'object', 'properties' => $properties, 'required' => array_keys($properties), 'additionalProperties' => false];

        return $this->ai->json($system, $prompt, 'report_builder_filters', $object([
            'view' => $nullableEnum(SalesReportService::VIEWS, 'Breakdown grouping, or null.'),
            'category' => $nullableEnum(SalesReportService::CATEGORIES, 'Sale category, or null for every category.'),
            'status' => $nullableEnum([...SalesReportService::STATUSES, 'all'], 'Sale status, or null for the default (valid only).'),
            'from' => $nullableText('Start date as YYYY-MM-DD, or null.'),
            'to' => $nullableText('End date as YYYY-MM-DD, or null.'),
            'developer_name' => $nullableText('A developer\'s best-guess name, or null.'),
            'team_name' => $nullableText('A team\'s best-guess name, or null.'),
            'sub_team_name' => $nullableText('A sub-team\'s best-guess name, or null.'),
            'area_name' => $nullableText('A branch/office name, or null.'),
            'agent_name' => $nullableText('A person\'s best-guess name, or null.'),
            'property_type' => $nullableEnum($propertyTypes, 'Exactly one of the listed property types, or null.'),
            'unit_type' => $nullableText('A unit type as typed (e.g. "2 Bedrooms"), or null.'),
            'project_name' => $nullableText('A specific project\'s name, or null.'),
            'summary' => ['type' => 'string', 'description' => 'One short sentence describing what was understood.'],
        ]), maxTokens: 800);
    }
}
