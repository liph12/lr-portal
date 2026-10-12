<?php

namespace App\Services;

use App\Http\Requests\Portal\Sales\SaleRequest;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Areas;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Sales validation: pick an area (the credited agent's, else the recorder's), then a category, then work through its
// sales by status — all within a reservation-date range (default: this month). Setting a status records who did it (validated_by / validated_at) and appends to update_logs.
class SaleValidationService
{
    public const CATEGORIES = [AgentTransaction::TYPE_PROJECT, AgentTransaction::TYPE_BROKERAGE, AgentTransaction::TYPE_RENTAL];

    // Tab order: the work queue first.
    public const STATUSES = ['pending', 'valid', 'invalid', 'cancelled'];

    public const ALL_AREAS = 'all';

    private const TABLES = ['project' => 'agent_project_transactions', 'brokerage' => 'agent_brokerage_transactions', 'rental' => 'agent_rental_transactions'];

    private const PER_PAGE = [25, 50, 100];

    private const PANEL_LIMIT = 100;

    // Keys are the table's column names.
    private const SORTS = ['created_at' => 't.created_at', 'reservation_date' => 'c.reservation_date', 'value' => 'c.total_contract_price', 'client' => 'cd.client_first_name', 'agent' => 'agent_name'];

    // The credited agent's area; sales keyed in without an agent take the recorder's.
    // The sale's area: the credited agent's, else the recorder's (shared with Brokerage receiving).
    public const AREA = 'COALESCE(a.area, ra.area)';

    // Not offered as areas to validate (still counted under All areas).
    private const HIDDEN_AREAS = ['abroad'];

    public function __construct(private ActivityLogger $activity, private AgentActivityService $agentActivity, private OfficeService $offices) {}

    /**
     * Which areas a reader may validate: every one for the back office (null), their offices' areas for a secretary,
     * none (false) for anyone else with the permission.
     *
     * @return array<int, string>|null|false
     */
    public function allowedAreas(User $user): array|null|false
    {
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return null;
        }

        return $this->offices->areasFor($user) ?: false;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    /**
     * @param  array<int, string>|null  $allowed  area keys the reader may validate (an office secretary); null = all
     */
    public function filters(array $input, ?array $allowed = null): array
    {
        $area = $input['area'] ?? null;
        $offered = $allowed ?? array_keys(array_diff_key(config('areas'), array_flip(self::HIDDEN_AREAS)));
        $today = CarbonImmutable::today();
        $from = $this->date($input['from'] ?? null) ?? $today->startOfMonth();
        $to = $this->date($input['to'] ?? null) ?? $today;
        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'area' => is_string($area) && ($area === self::ALL_AREAS || in_array($area, $offered, true)) ? $area : null,
            // Kept in the filters so every query below stays inside the reader's areas.
            'allowed' => $allowed,
            'category' => in_array($input['category'] ?? null, self::CATEGORIES, true) ? $input['category'] : null,
            'status' => in_array($input['status'] ?? null, self::STATUSES, true) ? $input['status'] : 'pending',
            'q' => trim((string) ($input['q'] ?? '')) ?: null,
            'sort' => array_key_exists($input['sort'] ?? '', self::SORTS) ? $input['sort'] : 'created_at',
            'dir' => ($input['dir'] ?? null) === 'asc' ? 'asc' : 'desc',
            'page' => max(1, (int) ($input['page'] ?? 1)),
            'per_page' => in_array((int) ($input['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $input['per_page'] : self::PER_PAGE[0],
        ];
    }

    /**
     * Pending sales the user can validate in the range the page opens on (this month): the menu badge, equal to the
     * "All areas" card (back office) or their area's card (office secretary). Null when they don't validate sales.
     */
    public function pendingCount(User $user): ?int
    {
        $allowed = $this->allowedAreas($user);
        if ($allowed === false || ! $user->can('sales_validation')) {
            return null;
        }

        $f = $this->filters([], $allowed);

        return $this->inRange($this->base(), $f)->where('t.sale_status', 'pending')
            ->when($allowed !== null, fn ($q) => $q->whereIn(DB::raw(self::AREA), $allowed))
            ->count();
    }

    /**
     * Step 1: every office area with its pending sales (all categories), plus "All areas".
     *
     * @return array<int, array{key: string, name: string, pending: int}>
     */
    public function areas(array $f): array
    {
        $pending = $this->inRange($this->base(), $f)->where('t.sale_status', 'pending')
            ->when($f['allowed'] !== null, fn ($q) => $q->whereIn(DB::raw(self::AREA), $f['allowed']))
            // No area groups under '' (a null key can't index the counts).
            ->selectRaw('COALESCE('.self::AREA.", '') as area, COUNT(*) as n")->groupByRaw('COALESCE('.self::AREA.", '')")
            ->pluck('n', 'area')->map(fn ($n) => (int) $n);

        $rows = collect(config('areas'))->except(self::HIDDEN_AREAS)
            ->when($f['allowed'] !== null, fn ($areas) => $areas->only($f['allowed']))
            ->map(fn ($a, $key) => ['key' => $key, 'name' => $a['name'], 'pending' => (int) ($pending[$key] ?? 0)])->values();

        // "All areas" is everyone's for the back office; a secretary with several areas gets "All my areas".
        $all = $f['allowed'] === null
            ? [['key' => self::ALL_AREAS, 'name' => 'All areas', 'pending' => $pending->sum()]]
            : ($rows->count() > 1 ? [['key' => self::ALL_AREAS, 'name' => 'All my areas', 'pending' => $rows->sum('pending')]] : []);

        return [...$all, ...$rows->sortByDesc('pending')->values()->all()];
    }

    /**
     * Step 2: sales of each category in the area, by status.
     *
     * @return array<string, array<string, int>>
     */
    public function categoryCounts(array $f): array
    {
        $counts = $this->inRange($this->inArea($this->base(), $f), $f)
            ->selectRaw('t.sale_type, t.sale_status, COUNT(*) as n')->groupBy('t.sale_type', 't.sale_status')->get();

        return collect(self::CATEGORIES)->mapWithKeys(fn ($category) => [$category => collect(self::STATUSES)->mapWithKeys(
            fn ($status) => [$status => (int) ($counts->first(fn ($r) => $r->sale_type === $category && $r->sale_status === $status)?->n ?? 0)]
        )->all()])->all();
    }

    /**
     * Step 3: the area's sales of one category and status, with client, property and files.
     */
    public function table(array $f): LengthAwarePaginator
    {
        $category = $f['category'];
        $query = $this->inArea($this->base(), $f)
            ->join(self::TABLES[$category].' as c', 'c.agent_transaction_id', '=', 't.id')
            ->leftJoin('agent_transaction_details as cd', 'cd.agent_transaction_id', '=', 't.id')
            ->leftJoin('users as au', 'au.id', '=', 'a.user_id')
            ->leftJoin('users as ru', 'ru.id', '=', 't.recorded_by')
            ->leftJoin('users as vu', 'vu.id', '=', 't.validated_by')
            ->leftJoin('project_property_types as pt', 'pt.id', '=', 'c.project_property_type_id')
            ->where('t.sale_status', $f['status'])
            ->whereBetween('c.reservation_date', [$f['from'], $f['to']])
            ->select(
                't.id', 't.agent_id', 't.unit_number', 't.sale_status', 't.created_at', 't.validated_at', 'vu.name as validated_by',
                'c.reservation_date', 'c.total_contract_price as value', 'pt.name as property_type',
                'cd.client_first_name', 'cd.client_last_name', 'cd.client_email', 'cd.client_mobile', 'cd.client_country',
                'a.avatar as agent_avatar', 'ru.name as recorded_by',
            )
            ->selectRaw('COALESCE(au.name, ru.name) as agent_name')
            ->selectRaw(self::AREA.' as area');

        match ($category) {
            'project' => $query->leftJoin('developers as d', 'd.id', '=', 'c.developer_id')
                ->addSelect('c.project_name', 'c.developer_id', 'd.name as developer', 'c.proof_of_transaction'),
            'brokerage' => $query->leftJoin('brokerage_areas as ba', 'ba.id', '=', 'c.brokerage_area_id')
                ->addSelect('c.brokerage_area_id', 'ba.name as brokerage_area', 'c.remittance_slip', 'c.deposit_slip'),
            'rental' => $query->addSelect('c.closing_agent', 'c.partner_agent', 'c.rental_rate', 'c.remittance_slip', 'c.deposit_slip'),
        };

        if ($f['q'] !== null && mb_strlen($f['q']) >= 2) {
            $like = '%'.addcslashes($f['q'], '%_\\').'%';
            $query->where(function ($q) use ($like, $category) {
                $q->where('cd.client_first_name', 'like', $like)->orWhere('cd.client_last_name', 'like', $like)
                    ->orWhere('au.name', 'like', $like)->orWhere('t.unit_number', 'like', $like);
                if ($category === 'project') {
                    $q->orWhere('c.project_name', 'like', $like);
                }
            });
        }

        return $query->orderBy(self::SORTS[$f['sort']], $f['dir'])->orderByDesc('t.id')
            ->paginate($f['per_page'], ['*'], 'page', $f['page'])
            ->through(fn ($r) => [...(array) $r, 'area' => Areas::name($r->area), 'value' => (float) $r->value]);
    }

    /**
     * One agent's sales for the side panel, client first, split by category (newest reservation first). Within the
     * page's date range unless $allDates.
     *
     * @return array<string, mixed>|null
     */
    public function agentSales(int $agentId, array $f, bool $allDates): ?array
    {
        $agent = DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $agentId)
            ->first(['a.id', 'a.avatar', 'a.area', 'u.name', 'u.email']);
        if (! $agent || ($f['allowed'] !== null && ! in_array($agent->area, $f['allowed'], true))) {
            return null;
        }

        $categories = [];
        foreach (self::CATEGORIES as $category) {
            $query = DB::table('agent_transactions as t')
                ->join(self::TABLES[$category].' as c', 'c.agent_transaction_id', '=', 't.id')
                ->leftJoin('agent_transaction_details as cd', 'cd.agent_transaction_id', '=', 't.id')
                ->where('t.agent_id', $agentId)
                ->when(! $allDates, fn ($q) => $q->whereBetween('c.reservation_date', [$f['from'], $f['to']]))
                ->select('t.id', 't.unit_number', 't.sale_status', 't.created_at', 'c.reservation_date', 'c.total_contract_price as value',
                    'cd.client_first_name', 'cd.client_last_name', 'cd.client_mobile', 'cd.client_email');

            match ($category) {
                'project' => $query->leftJoin('developers as d', 'd.id', '=', 'c.developer_id')->addSelect('c.project_name', 'c.developer_id', 'd.name as developer', 'c.proof_of_transaction'),
                'brokerage' => $query->leftJoin('brokerage_areas as ba', 'ba.id', '=', 'c.brokerage_area_id')->addSelect('c.brokerage_area_id', 'ba.name as brokerage_area', 'c.remittance_slip', 'c.deposit_slip'),
                'rental' => $query->addSelect('c.closing_agent', 'c.partner_agent', 'c.remittance_slip', 'c.deposit_slip'),
            };

            $counts = (clone $query)->select('t.sale_status')->selectRaw('COUNT(*) as n')->groupBy('t.sale_status')->pluck('n', 'sale_status');
            $categories[$category] = [
                'total' => (int) $counts->sum(),
                'counts' => collect(self::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)])->all(),
                // A panel, not a report: the newest ones; the table is for working through the rest.
                'rows' => $query->orderByDesc('c.reservation_date')->orderByDesc('t.id')->limit(self::PANEL_LIMIT)->get()
                    ->map(fn ($r) => [...(array) $r, 'value' => (float) $r->value])->all(),
            ];
        }

        return [
            'agent' => ['id' => $agent->id, 'name' => $agent->name, 'email' => $agent->email, 'avatar' => $agent->avatar, 'area' => Areas::name($agent->area)],
            'all_dates' => $allDates,
            'limit' => self::PANEL_LIMIT,
            'categories' => $categories,
        ];
    }

    // What a validator may correct, by table: column => label for the change log. Request keys are these column names.
    private const EDITABLE = [
        'agent_transaction_details' => [
            'client_first_name' => 'Client first name', 'client_middle_name' => 'Client middle name', 'client_last_name' => 'Client last name',
            'client_mobile' => 'Client mobile', 'client_email' => 'Client email', 'client_gender' => 'Client gender',
            'client_country' => 'Client country', 'client_address' => 'Client address', 'client_birthdate' => 'Client birthdate',
        ],
        'agent_transactions' => [
            'unit_number' => 'Unit', 'commission_status' => 'Commission status', 'term_of_payment' => 'Payment terms', 'remarks' => 'Remarks',
        ],
        'category' => [
            'total_contract_price' => 'Total contract price', 'reservation_date' => 'Reservation date', 'project_property_type_id' => 'Property type',
            'unit_type' => 'Unit type', 'floor_area' => 'Floor area', 'lot_area' => 'Lot area',
            'developer_id' => 'Developer', 'project_name' => 'Project', 'brokerage_area_id' => 'Brokerage area',
            'closing_agent' => 'Closing agent', 'partner_agent' => 'Partner agent', 'rental_rate' => 'Rental rate', 'property_size' => 'Property size',
            'remittance_date' => 'Remittance date', 'commission_received' => 'Commission received',
        ],
    ];

    /**
     * Correct a sale while validating it (any field in EDITABLE that the category has), then set the status. Every
     * changed field is listed in one update_logs line.
     *
     * @param  array<string, mixed>  $data  validated UpdateValidatedSaleRequest input
     */
    public function update(AgentTransaction $sale, array $data, User $by): void
    {
        $tables = ['agent_transaction_details' => 'agent_transaction_id', 'agent_transactions' => 'id', self::TABLES[$sale->sale_type] => 'agent_transaction_id'];
        $current = collect($tables)->map(fn ($key, $table) => (array) (DB::table($table)->where($key, $sale->id)->first() ?? []));

        // Measurements that don't apply to the (new) property type are cleared, as on the record forms.
        if (array_key_exists('project_property_type_id', $data)) {
            $data = array_merge($data, ProjectPropertyType::measurements((int) $data['project_property_type_id'], $data));
        }
        if (array_key_exists('project_name', $data)) {
            $data['project_name'] = trim((string) $data['project_name']);
        }

        $updates = [];
        $changes = [];
        foreach ($tables as $table => $key) {
            $fields = self::EDITABLE[$table === self::TABLES[$sale->sale_type] ? 'category' : $table];
            foreach ($fields as $column => $label) {
                // The request only lets through the fields this category has.
                if (! array_key_exists($column, $data)) {
                    continue;
                }
                $from = $current[$table][$column] ?? null;
                $to = $data[$column] === '' ? null : $data[$column];
                if ($this->same($from, $to)) {
                    continue;
                }
                $updates[$table][$column] = $to;
                $changes[] = "{$label}: {$this->shown($column, $from)} → {$this->shown($column, $to)}";
            }
        }

        if (isset($updates['agent_transaction_details']['client_birthdate'])) {
            $updates['agent_transaction_details']['client_age'] = SaleRecord::ageAt($updates['agent_transaction_details']['client_birthdate'], $data['reservation_date'] ?? null);
        }
        // Link the catalogue project when the name matches one of the developer's; else it's typed in.
        $category = self::TABLES[$sale->sale_type];
        if ($sale->sale_type === 'project' && (isset($updates[$category]['developer_id']) || isset($updates[$category]['project_name']))) {
            $updates[$category]['developer_project_id'] = DB::table('developer_projects')
                ->where('developer_id', $data['developer_id'])->where('name', $data['project_name'])->value('id');
        }

        DB::transaction(function () use ($sale, $tables, $updates, $changes, $by, $data) {
            foreach ($updates as $table => $values) {
                $values['updated_at'] = now();
                $table === 'agent_transaction_details'
                    ? DB::table($table)->updateOrInsert(['agent_transaction_id' => $sale->id], $values)
                    : DB::table($table)->where($tables[$table], $sale->id)->update($values);
            }
            if ($changes) {
                DB::table('agent_transactions')->where('id', $sale->id)->update([
                    'update_logs' => json_encode([...$this->logs($sale), ['user' => $by->name, 'updated_at' => now()->toDateTimeString(), 'description' => implode('; ', $changes)]]),
                ]);
            }

            $this->setStatus($sale->refresh(), $data['status'], $by);
        });

        if ($changes) {
            $this->activity->describe('sale.edit', "Corrected {$sale->sale_type} sale #{$sale->id}: ".implode('; ', $changes), $sale, ['changes' => $changes]);
        }

        // A new reservation date can move the sale in or out of the agent's 6-month window.
        if ($sale->agent_id) {
            $this->agentActivity->refresh([$sale->agent_id]);
        }
    }

    /**
     * Everything about one sale, for the sale panel: agent, client, property, payment, files and its change history.
     *
     * @return array<string, mixed>|null
     */
    public function detail(int $saleId, ?array $allowed = null): ?array
    {
        $sale = DB::table('agent_transactions')->where('id', $saleId)->first();
        if (! $sale || ! isset(self::TABLES[$sale->sale_type]) || ! $this->inAllowedArea($saleId, $allowed)) {
            return null;
        }

        $client = (array) (DB::table('agent_transaction_details')->where('agent_transaction_id', $saleId)->first() ?? []);
        $property = (array) DB::table(self::TABLES[$sale->sale_type])->where('agent_transaction_id', $saleId)->first();
        $agent = $sale->agent_id ? DB::table('agents as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $sale->agent_id)->first(['a.id', 'a.avatar', 'a.area', 'u.name', 'u.email']) : null;
        $people = DB::table('users')->whereIn('id', array_filter([$sale->recorded_by, $sale->validated_by]))->pluck('name', 'id');
        $logs = json_decode((string) $sale->update_logs, true);

        return [
            'id' => $sale->id,
            'category' => $sale->sale_type,
            'sale_status' => $sale->sale_status,
            'unit_number' => $sale->unit_number,
            'commission_status' => $sale->commission_status,
            'term_of_payment' => $sale->term_of_payment,
            'remarks' => $sale->remarks,
            'created_at' => $sale->created_at,
            'recorded_by' => $sale->recorded_by ? ($people[$sale->recorded_by] ?? null) : null,
            'validated_at' => $sale->validated_at,
            'validated_by' => $sale->validated_by ? ($people[$sale->validated_by] ?? null) : null,
            'agent' => $agent ? ['id' => $agent->id, 'name' => $agent->name, 'email' => $agent->email, 'avatar' => $agent->avatar, 'area' => Areas::name($agent->area)] : null,
            'client' => array_intersect_key($client, array_flip([...array_keys(self::EDITABLE['agent_transaction_details']), 'client_age'])),
            'property' => array_diff_key($property, array_flip(['id', 'agent_transaction_id', 'created_at', 'updated_at'])),
            'names' => [
                'developer' => isset($property['developer_id']) ? DB::table('developers')->where('id', $property['developer_id'])->value('name') : null,
                'brokerage_area' => isset($property['brokerage_area_id']) ? DB::table('brokerage_areas')->where('id', $property['brokerage_area_id'])->value('name') : null,
                'property_type' => isset($property['project_property_type_id']) ? DB::table('project_property_types')->where('id', $property['project_property_type_id'])->value('name') : null,
                'signing_broker' => ! empty($property['signing_broker_id']) ? DB::table('agents as a')->join('users as u', 'u.id', '=', 'a.user_id')->where('a.id', $property['signing_broker_id'])->value('u.name') : null,
                'received_by' => ! empty($property['received_by']) ? DB::table('users')->where('id', $property['received_by'])->value('name') : null,
                // Rentals from the commission slip: the closing agent's team and unit manager, looked up (never stored).
                ...(! empty($property['closing_agent_id']) ? RentalSaleService::teamOf((int) $property['closing_agent_id']) : []),
            ],
            // Newest first.
            'history' => is_array($logs) ? array_reverse(array_values(array_filter($logs, 'is_array'))) : [],
        ];
    }

    private function same(mixed $from, mixed $to): bool
    {
        if (is_numeric($from) && is_numeric($to)) {
            return abs((float) $from - (float) $to) < 0.005;
        }

        return trim((string) ($from ?? '')) === trim((string) ($to ?? ''));
    }

    // Change-log wording: ids as names, money with two decimals, blanks as a dash.
    private function shown(string $column, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return match ($column) {
            'developer_id' => (string) DB::table('developers')->where('id', $value)->value('name'),
            'brokerage_area_id' => (string) DB::table('brokerage_areas')->where('id', $value)->value('name'),
            'project_property_type_id' => (string) DB::table('project_property_types')->where('id', $value)->value('name'),
            'total_contract_price', 'rental_rate', 'commission_received' => number_format((float) $value, 2),
            'reservation_date', 'remittance_date', 'client_birthdate' => substr((string) $value, 0, 10),
            default => (string) $value,
        };
    }

    /**
     * Pickers for the sale panel (any category: the agent panel edits all three): developers + their catalogue projects,
     * brokerage areas, property types and commission statuses.
     *
     * @return array<string, mixed>
     */
    public function editOptions(): array
    {
        return [
            'developers' => DB::table('developers')->orderBy('name')->get(['id', 'name as label']),
            // ~2k id/name pairs: small enough to send once and filter by developer in the browser.
            'projects' => DB::table('developer_projects')->where('status', 'active')->orderBy('name')->get(['id', 'developer_id', 'name']),
            'brokerage_areas' => DB::table('brokerage_areas')->orderBy('name')->get(['id', 'name as label']),
            'property_types' => DB::table('project_property_types')->orderBy('name')->get(['id', 'name as label']),
            'commission_statuses' => SaleRequest::COMMISSION_STATUSES,
        ];
    }

    public function setStatus(AgentTransaction $sale, string $status, User $by): void
    {
        $from = $sale->sale_status;
        if ($from === $status) {
            return;
        }

        $logs = $this->logs($sale);
        $logs[] = ['user' => $by->name, 'updated_at' => now()->toDateTimeString(), 'description' => "Sale status: {$from} → {$status}"];

        DB::table('agent_transactions')->where('id', $sale->id)->update([
            'sale_status' => $status,
            'validated_by' => $by->id,
            'validated_at' => now(),
            'update_logs' => json_encode($logs),
            'updated_at' => now(),
        ]);

        // Pending and valid sales keep an agent active; invalid / cancelled ones don't.
        if ($sale->agent_id) {
            $this->agentActivity->refresh([$sale->agent_id]);
        }

        $this->activity->describe('sale.validate', "Marked {$sale->sale_type} sale #{$sale->id} as {$status} (was {$from})", $sale, ['from' => $from, 'to' => $status]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function logs(AgentTransaction $sale): array
    {
        $logs = json_decode((string) DB::table('agent_transactions')->where('id', $sale->id)->value('update_logs'), true);

        return is_array($logs) ? $logs : [];
    }

    public function base(): Builder
    {
        return DB::table('agent_transactions as t')
            ->leftJoin('agents as a', 'a.id', '=', 't.agent_id')
            ->leftJoin('agents as ra', fn ($j) => $j->on('ra.user_id', '=', 't.recorded_by')->whereNull('t.agent_id'));
    }

    // Sales reserved in the range: ids from the three category tables (each uses its reservation_date index).
    private function inRange(Builder $query, array $f): Builder
    {
        $ids = null;
        foreach (self::TABLES as $table) {
            $branch = DB::table($table)->whereBetween('reservation_date', [$f['from'], $f['to']])->select('agent_transaction_id');
            $ids = $ids ? $ids->unionAll($branch) : $branch;
        }

        // Joined rather than whereIn so MySQL starts from the (small) set of sales in range.
        return $query->joinSub($ids, 'rng', 'rng.agent_transaction_id', '=', 't.id');
    }

    private function date(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('!Y-m-d', $value);
        } catch (\Throwable) {
            return null;
        }
    }

    // Whether a sale's area (credited agent's, else recorder's) is one the reader may validate; null = any.
    public function inAllowedArea(int $saleId, ?array $allowed): bool
    {
        if ($allowed === null) {
            return true;
        }

        $area = $this->base()->where('t.id', $saleId)->selectRaw(self::AREA.' as area')->value('area');

        return in_array($area, $allowed, true);
    }

    private function inArea(Builder $query, array $f): Builder
    {
        if ($f['area'] !== self::ALL_AREAS) {
            return $query->whereRaw(self::AREA.' = ?', [$f['area']]);
        }

        return $f['allowed'] === null ? $query : $query->whereIn(DB::raw(self::AREA), $f['allowed']);
    }
}
