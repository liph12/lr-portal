<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// NATCON: the national convention's rankings for one period. A sale counts if it's valid, reserved in the period and keyed
// in by the cutoff of the period's last month (sales_cutoffs) — the leaderboards' rule over a whole year. Every board is a
// view of the sales report (so cached and paged like reports); qualifiers are agents whose total reaches the amount.
class NatconService
{
    private const SETTING = 'natcon';

    // This year's NATCON, until a superadmin sets the next one (Settings › NATCON). Top Rent Managers runs a month later and
    // closes on a date of its own (encoded by the end of that day), not a monthly cutoff.
    private const DEFAULTS = [
        'from' => '2025-08-01', 'to' => '2026-07-31', 'cutoff_month' => '2026-07', 'qualifier_amount' => 43000000,
        'rental_from' => '2025-09-01', 'rental_to' => '2026-08-31', 'rental_cutoff' => '2026-09-05',
    ];

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
     * leads a team / sub-team (from the data) the qualifiers on it; anyone else nothing (false).
     *
     * @return array{boards: list<string>, lock: array<string, int>, group: ?string, group_type: ?string}|false
     */
    public function reach(User $user): array|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return ['boards' => array_keys(self::BOARDS), 'lock' => [], 'group' => null, 'group_type' => null];
        }
        if (! $current = $this->leadership->current($user, null, null)) {
            return false;
        }

        return [
            'boards' => self::LEADER_BOARDS,
            'lock' => [$current['type'] === 'team' ? 'team_id' : 'sub_team_id' => $current['group']->id],
            'group' => $current['group']->name,
            'group_type' => $current['type'],
        ];
    }

    /**
     * The period, the cutoff month (and when it closes, if set) and the qualifier amount.
     *
     * @return array{from: string, to: string, cutoff_month: string, qualifier_amount: float, cutoff_at: ?string, rental_from: string, rental_to: string, rental_cutoff: string}
     */
    public function settings(): array
    {
        $saved = (array) (AppSetting::find(self::SETTING)?->value ?? []);
        $s = array_intersect_key($saved, self::DEFAULTS) + self::DEFAULTS;
        $cutoff = DB::table('sales_cutoffs')->where('month', $s['cutoff_month'])->value('cutoff_at');

        return [...$s, 'qualifier_amount' => (float) $s['qualifier_amount'], 'cutoff_at' => $cutoff ? (string) $cutoff : null];
    }

    /**
     * @param  array{from: string, to: string, cutoff_month: string, qualifier_amount: numeric}  $data
     */
    public function save(array $data, User $by): void
    {
        $value = [
            'from' => $data['from'], 'to' => $data['to'], 'cutoff_month' => $data['cutoff_month'], 'qualifier_amount' => (float) $data['qualifier_amount'],
            'rental_from' => $data['rental_from'], 'rental_to' => $data['rental_to'], 'rental_cutoff' => $data['rental_cutoff'],
        ];
        AppSetting::updateOrCreate(['key' => self::SETTING], ['value' => $value, 'updated_by' => $by->id]);

        $this->activity->describe('natcon.settings', "Set the NATCON period to {$value['from']} – {$value['to']} (cutoff {$value['cutoff_month']}, qualifier ".number_format($value['qualifier_amount'])."; rentals {$value['rental_from']} – {$value['rental_to']}, cutoff {$value['rental_cutoff']})", null, $value);
    }

    /**
     * The reservation dates a board counts and when its sales must have been encoded by (null = no cutoff yet).
     *
     * @return array{from: string, to: string, cutoff_at: ?string, cutoff_month: ?string}
     */
    public function period(string $board, ?array $settings = null): array
    {
        $s = $settings ?? $this->settings();

        return (self::BOARDS[$board]['period'] ?? null) === 'rental'
            ? ['from' => $s['rental_from'], 'to' => $s['rental_to'], 'cutoff_at' => $s['rental_cutoff'].' 23:59:59', 'cutoff_month' => null]
            : ['from' => $s['from'], 'to' => $s['to'], 'cutoff_at' => $s['cutoff_at'], 'cutoff_month' => $s['cutoff_month']];
    }

    /**
     * One board's page, ranked by total sales, with each row's rank.
     *
     * @param  array<string, mixed>  $input  q, page, per_page
     * @param  array<string, int>  $lock  the reader's group (reach()['lock'])
     */
    public function board(string $board, array $input, array $lock = []): LengthAwarePaginator
    {
        $f = $this->filters($board, $input + $lock);
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
    public function counts(array $boards, array $lock = []): array
    {
        return collect($boards)->mapWithKeys(fn ($board) => [$board => $this->reports->breakdown($this->filters($board, $lock))->total()])->all();
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function filters(string $board, array $input): array
    {
        $s = $this->settings();
        $period = $this->period($board, $s);
        $def = self::BOARDS[$board];
        $f = $this->reports->filters([
            'from' => $period['from'], 'to' => $period['to'], 'status' => 'valid', 'view' => $def['view'], 'category' => $def['category'] ?? null,
            'q' => $input['q'] ?? null, 'page' => $input['page'] ?? 1, 'per_page' => $input['per_page'] ?? null, 'sort' => 'value', 'dir' => 'desc',
            // A leader's group: their members' sales while on it (the report's team / sub-team drill-down rule).
            'team_id' => $input['team_id'] ?? null, 'sub_team_id' => $input['sub_team_id'] ?? null,
        ]);

        // No cutoff set for that month yet: everything keyed in so far counts.
        return [...$f, 'encoded_by' => $period['cutoff_at'], 'min_value' => ($def['qualifier'] ?? false) ? $s['qualifier_amount'] : null];
    }
}
