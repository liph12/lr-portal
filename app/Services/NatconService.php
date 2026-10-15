<?php

namespace App\Services;

use App\Models\Entities\NatconEdition;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// NATCON: the national convention's rankings, one edition at a time (NATCON 2026, 2027… — natcon_editions, Settings › NATCON).
// A sale counts if it's valid, reserved in the edition's period and keyed in by its cutoff (a specific moment). Top Rent
// Managers has a period of its own and closes at the end of its cutoff date. Every board is a view of the sales report (so
// cached and paged like reports); qualifiers are agents whose total reaches the edition's amount.
class NatconService
{
    // Keyed by URL slug (/natcon/{slug}); `group` is what a row is: an agent, a team or a sub-team.
    public const BOARDS = [
        'qualifiers' => ['title' => 'NATCON Qualifiers', 'description' => 'Agents whose valid sales in the period reach the qualifier amount.', 'view' => 'agents', 'qualifier' => true, 'group' => 'agents'],
        'top-teams' => ['title' => 'Top Teams', 'description' => 'Teams ranked by their members\' sales in the period.', 'view' => 'teams', 'group' => 'teams'],
        'top-brokerage-sales' => ['title' => 'Top Brokerage Sales', 'description' => 'Agents ranked by brokerage sales in the period.', 'view' => 'brokerage', 'group' => 'agents'],
        'top-rent-managers' => ['title' => 'Top Rent Managers', 'description' => 'Agents ranked by rental sales in the rental period.', 'view' => 'rental', 'group' => 'agents', 'period' => 'rental'],
        'top-brokerage-teams' => ['title' => 'Top Brokerage Teams', 'description' => 'Teams ranked by their members\' brokerage sales.', 'view' => 'teams', 'category' => 'brokerage', 'group' => 'teams'],
        'top-sub-teams' => ['title' => 'Top Sub-Teams', 'description' => 'Sub-teams ranked by their members\' sales, with their team.', 'view' => 'sub_teams', 'group' => 'sub_teams'],
    ];

    // Leaders see only who qualified in the group they lead.
    private const LEADER_BOARDS = ['qualifiers'];

    public function __construct(private SalesReportService $reports, private ActivityLogger $activity, private TeamLeadershipService $leadership) {}

    /**
     * What a reader may see: the back office (superadmin, admin, staff) every board of everyone, with amounts; whoever
     * leads a team / sub-team (from the data) the qualifiers on it; anyone else with an agent record only their own NATCON
     * sales (My NATCON Sales, no boards); nobody else anything (false).
     *
     * @return array{boards: list<string>, lock: array<string, int>, group: ?string, group_type: ?string}|false
     */
    public function reach(User $user): array|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return ['boards' => array_keys(self::BOARDS), 'lock' => [], 'group' => null, 'group_type' => null];
        }
        if (! $current = $this->leadership->current($user, null, null)) {
            return $user->agent()->exists() ? ['boards' => [], 'lock' => [], 'group' => null, 'group_type' => null] : false;
        }

        return [
            'boards' => self::LEADER_BOARDS,
            'lock' => [$current['type'] === 'team' ? 'team_id' : 'sub_team_id' => $current['group']->id],
            'group' => $current['group']->name,
            'group_type' => $current['type'],
        ];
    }

    /**
     * Every edition, newest first, for the switcher.
     *
     * @return list<array{year: int, name: string, is_default: bool}>
     */
    public function editions(): array
    {
        return NatconEdition::orderByDesc('year')->get(['year', 'name', 'is_default'])
            ->map(fn (NatconEdition $e) => ['year' => $e->year, 'name' => $e->name, 'is_default' => $e->is_default])->all();
    }

    /**
     * One edition's settings: the given year, else the default (else the newest). Null when there's no such edition.
     *
     * @return array{id: int, year: int, name: string, is_default: bool, from: string, to: string, cutoff_at: ?string, qualifier_amount: float, rental_from: string, rental_to: string, rental_cutoff: string}|null
     */
    public function edition(?int $year = null): ?array
    {
        $e = $year !== null
            ? NatconEdition::where('year', $year)->first()
            : NatconEdition::orderByDesc('is_default')->orderByDesc('year')->first();

        return $e ? [
            'id' => $e->id, 'year' => $e->year, 'name' => $e->name, 'is_default' => $e->is_default,
            'from' => $e->from->toDateString(), 'to' => $e->to->toDateString(),
            // App time (Asia/Manila), as sales' created_at is compared.
            'cutoff_at' => $e->cutoff_at?->format('Y-m-d H:i:s'),
            'qualifier_amount' => (float) $e->qualifier_amount,
            'rental_from' => $e->rental_from->toDateString(), 'rental_to' => $e->rental_to->toDateString(), 'rental_cutoff' => $e->rental_cutoff->toDateString(),
        ] : null;
    }

    /**
     * @param  array<string, mixed>  $data  validated SaveNatconEditionRequest input
     */
    public function save(?NatconEdition $edition, array $data, User $by): NatconEdition
    {
        $values = [
            'year' => (int) $data['year'], 'name' => trim((string) $data['name']), 'from' => $data['from'], 'to' => $data['to'],
            'cutoff_at' => $data['cutoff_at'] ?: null, 'qualifier_amount' => (float) $data['qualifier_amount'],
            'rental_from' => $data['rental_from'], 'rental_to' => $data['rental_to'], 'rental_cutoff' => $data['rental_cutoff'],
            'updated_by' => $by->id,
        ];
        $edition = DB::transaction(function () use ($edition, $values, $data, $by) {
            $edition ??= new NatconEdition(['created_by' => $by->id]);
            $edition->fill($values)->save();
            // The first one is the default whatever was asked.
            if (! empty($data['is_default']) || NatconEdition::count() === 1) {
                $this->makeDefault($edition);
            }

            return $edition->refresh();
        });

        $this->activity->describe('natcon.edition_saved', "Saved {$edition->name}: {$values['from']} – {$values['to']}, cutoff ".($values['cutoff_at'] ?? 'not set').', qualifier '.number_format($values['qualifier_amount']), null, $values);

        return $edition;
    }

    public function makeDefault(NatconEdition $edition): void
    {
        DB::transaction(function () use ($edition) {
            NatconEdition::where('id', '<>', $edition->id)->update(['is_default' => false]);
            $edition->forceFill(['is_default' => true])->save();
        });
    }

    public function delete(NatconEdition $edition): void
    {
        $edition->delete();
        $this->activity->describe('natcon.edition_deleted', "Deleted {$edition->name}", null, ['year' => $edition->year]);
    }

    /**
     * One agent's own NATCON sales (My NATCON Sales): their valid sales reserved in the NATCON period and encoded by its
     * cutoff — the Qualifiers rule, every category — as the sales report's filters, so the My Sales view shows them.
     *
     * @param  array<string, mixed>  $input  category, q, page, per_page, sort, dir from the URL
     * @return array<string, mixed>
     */
    public function mineFilters(int $agentId, array $input, array $edition): array
    {
        $period = $this->period('qualifiers', $edition);
        $f = $this->reports->lockedFilters(
            ['view' => 'agents', 'list' => 'sales', 'from' => $period['from'], 'to' => $period['to'], 'status' => 'valid']
                + array_intersect_key($input, array_flip(['category', 'q', 'page', 'per_page', 'sort', 'dir'])),
            ['agent_id' => $agentId],
        );

        return [...$f, 'encoded_by' => $period['cutoff_at']];
    }

    /**
     * The reservation dates a board counts and when its sales must have been encoded by (null = no cutoff yet).
     *
     * @param  array<string, mixed>  $edition  edition()
     * @return array{from: string, to: string, cutoff_at: ?string}
     */
    public function period(string $board, array $edition): array
    {
        return (self::BOARDS[$board]['period'] ?? null) === 'rental'
            ? ['from' => $edition['rental_from'], 'to' => $edition['rental_to'], 'cutoff_at' => $edition['rental_cutoff'].' 23:59:59']
            : ['from' => $edition['from'], 'to' => $edition['to'], 'cutoff_at' => $edition['cutoff_at']];
    }

    /**
     * One board's page, ranked by total sales, with each row's rank.
     *
     * @param  array<string, mixed>  $input  q, page, per_page
     * @param  array<string, int>  $lock  the reader's group (reach()['lock'])
     */
    public function board(string $board, array $edition, array $input, array $lock = []): LengthAwarePaginator
    {
        $f = $this->filters($board, $edition, $input + $lock);
        $page = $this->reports->breakdown($f);
        $offset = ($page->currentPage() - 1) * $page->perPage();

        return $page->through(function (array $row) use (&$offset) {
            return ['rank' => ++$offset] + $row;
        });
    }

    /**
     * How many on each board the reader may see (the cards' counts).
     *
     * @param  list<string>  $boards
     * @param  array<string, int>  $lock
     * @return array<string, int>
     */
    public function counts(array $boards, array $edition, array $lock = []): array
    {
        return collect($boards)->mapWithKeys(fn ($board) => [$board => $this->reports->breakdown($this->filters($board, $edition, $lock))->total()])->all();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function filters(string $board, array $edition, array $input): array
    {
        $period = $this->period($board, $edition);
        $def = self::BOARDS[$board];
        $f = $this->reports->filters([
            'from' => $period['from'], 'to' => $period['to'], 'status' => 'valid', 'view' => $def['view'], 'category' => $def['category'] ?? null,
            'q' => $input['q'] ?? null, 'page' => $input['page'] ?? 1, 'per_page' => $input['per_page'] ?? null, 'sort' => 'value', 'dir' => 'desc',
            // A leader's group: their members' sales while on it (the report's team / sub-team drill-down rule).
            'team_id' => $input['team_id'] ?? null, 'sub_team_id' => $input['sub_team_id'] ?? null,
        ]);

        // No cutoff set yet: everything keyed in so far counts.
        return [...$f, 'encoded_by' => $period['cutoff_at'], 'min_value' => ($def['qualifier'] ?? false) ? $edition['qualifier_amount'] : null];
    }
}
