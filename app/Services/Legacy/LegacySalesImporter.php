<?php

namespace App\Services\Legacy;

use App\Models\Entities\AgentTransaction;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Copies legacy `salesreport` into agent_transactions (+ client details) and one category table:
 * project → agent_project_transactions, rental → agent_rental_transactions, brokerage →
 * agent_brokerage_transactions. See docs/legacy-migration/sales.md.
 *
 * The category comes from the sale's legacy developer row (`developers.isbroker`: 0 project,
 * 1 brokerage office, 3 the "Rental" placeholder). Sales keep their legacy id; the agent is
 * `salesreport.agentid` → `members.memberid` → `members.id`, which is the agent's id here.
 */
class LegacySalesImporter
{
    public const FILE_BASE_URL = 'https://leuteriorealty.com/';

    private const RENTAL = 3;
    private const BROKERAGE = 1;

    private const MAX_DECIMAL = 99_999_999.99;

    private const SALE_COLUMNS = [
        'id', 'name', 'clientfamilyname', 'clientAddress', 'clientGender', 'clientEmail', 'clientMobile',
        'clientCountry', 'unitnum', 'devid', 'projectname', 'projid', 'prop_type_id', 'tcprice',
        'reservationdate', 'termofpayment', 'dateadded', 'agentid', 'status', 'remarks', 'deleted',
        'dateupdated', 'files', 'rental_deposit_slip', 'validSale', 'prop_details', 'logs', 'created_at',
    ];

    private ConnectionInterface $legacy;

    /** @var array<int, int> legacy developer id → isbroker */
    private array $categoryOf = [];

    /** @var array<int, int> legacy members.memberid → members.id (= agents.id) */
    private array $agentOfMemberId = [];

    /** @var array<int, true> */
    private array $agents = [];
    private array $developers = [];
    private array $projects = [];
    private array $propertyTypes = [];
    private array $brokerageAreas = [];

    private array $stats = [
        'read' => 0, 'project' => 0, 'rental' => 0, 'brokerage' => 0, 'already_imported' => 0,
        'deleted_skipped' => 0, 'with_agent' => 0, 'agent_not_found' => 0, 'proof_links' => 0,
        'cancelled' => 0, 'brokerage_areas' => 0, 'with_update_logs' => 0,
    ];

    public function __construct()
    {
        $this->legacy = DB::connection('legacy');
    }

    /**
     * @param  callable(int $done, int $total): void|null  $progress
     * @return array{stats: array<string, int>}
     */
    public function run(bool $dryRun = false, ?int $limit = null, int $chunk = 1000, ?callable $progress = null): array
    {
        $this->loadLookups();
        $total = $limit ? min($limit, $this->legacy->table('salesreport')->count()) : $this->legacy->table('salesreport')->count();

        DB::beginTransaction();

        try {
            $this->importBrokerageAreas();

            $this->legacy->table('salesreport')
                ->select(self::SALE_COLUMNS)
                ->lazyById($chunk, 'id')
                ->take($limit ?? PHP_INT_MAX)
                ->chunk($chunk)
                ->each(function ($sales) use ($dryRun, $progress, $total) {
                    $this->importChunk($sales->all());

                    if (! $dryRun) {
                        DB::commit();
                        DB::beginTransaction();
                    }

                    if ($progress) {
                        $progress($this->stats['read'], $total);
                    }
                });

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['stats' => $this->stats];
    }

    private function loadLookups(): void
    {
        $this->categoryOf = $this->legacy->table('developers')->pluck('isbroker', 'id')->map(fn ($v) => (int) $v)->all();

        // A few memberids repeat; the newest member row is the one that was imported as the agent.
        $this->legacy->table('members')
            ->where('memberid', '>', 0)
            ->orderBy('id')
            ->select('id', 'memberid')
            ->lazyById(10000, 'id')
            ->each(function ($m) {
                $this->agentOfMemberId[(int) $m->memberid] = (int) $m->id;
            });

        $flip = fn ($ids) => array_fill_keys($ids, true);
        $this->agents = $flip(DB::table('agents')->pluck('id')->all());
        $this->developers = $flip(DB::table('developers')->pluck('id')->all());
        $this->projects = DB::table('developer_projects')->pluck('name', 'id')->all();
        $this->propertyTypes = $flip(DB::table('project_property_types')->pluck('id')->all());
    }

    // Legacy brokerage "developers" (isbroker = 1) are brokerage offices; they keep their ids.
    private function importBrokerageAreas(): void
    {
        $existing = DB::table('brokerage_areas')->pluck('id')->flip()->all();
        $rows = [];

        foreach ($this->legacy->table('developers')->where('isbroker', self::BROKERAGE)->get() as $d) {
            if (! isset($existing[$d->id])) {
                $rows[] = [
                    'id' => $d->id,
                    'name' => trim((string) $d->name),
                    'address' => $this->clean($d->street),
                    'email' => $this->clean($d->email),
                    'phone' => $this->clean($d->landline),
                    'mobile' => $this->clean($d->mobile),
                    'status' => (int) $d->deleted === 1 ? 'inactive' : 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if ($rows) {
            DB::table('brokerage_areas')->insert($rows);
            $this->stats['brokerage_areas'] = count($rows);
        }

        $this->brokerageAreas = array_fill_keys(DB::table('brokerage_areas')->pluck('id')->all(), true);
    }

    /**
     * @param  array<int, object>  $sales
     */
    private function importChunk(array $sales): void
    {
        $already = DB::table('agent_transactions')->whereIn('id', array_map(fn ($s) => $s->id, $sales))->pluck('id')->flip()->all();
        $transactions = $details = $projects = $rentals = $brokerages = [];

        foreach ($sales as $s) {
            $this->stats['read']++;

            if ((int) $s->deleted === 1) {
                $this->stats['deleted_skipped']++;
                continue;
            }
            if (isset($already[$s->id])) {
                $this->stats['already_imported']++;
                continue;
            }

            $type = match ($this->categoryOf[(int) $s->devid] ?? 0) {
                self::RENTAL => AgentTransaction::TYPE_RENTAL,
                self::BROKERAGE => AgentTransaction::TYPE_BROKERAGE,
                default => AgentTransaction::TYPE_PROJECT,
            };
            $this->stats[$type]++;

            $agentId = $this->agentOfMemberId[(int) $s->agentid] ?? null;
            $agentId = $agentId && isset($this->agents[$agentId]) ? $agentId : null;
            $this->stats[$agentId ? 'with_agent' : 'agent_not_found']++;

            [$commission, $saleStatus] = $this->statuses($s->status, $s->validSale, $this->date($s->reservationdate, 'Y-m-d'));
            if ($this->jsonArray($s->logs)) {
                $this->stats['with_update_logs']++;
            }
            $created = $this->date($s->dateadded) ?? $this->date($s->created_at) ?? now()->toDateTimeString();
            $stamps = ['created_at' => $created, 'updated_at' => $this->date($s->dateupdated) ?? $created];

            $transactions[] = [
                'id' => (int) $s->id,
                'agent_id' => $agentId,
                'recorded_by' => null,
                'sale_type' => $type,
                'unit_number' => $this->clean($s->unitnum),
                'commission_status' => $commission,
                'term_of_payment' => $this->clean($s->termofpayment),
                'remarks' => $this->clean($s->remarks),
                'sale_status' => $saleStatus,
                // The legacy change history (a JSON array of {user, updated_at, description, details, …}), kept as-is.
                'update_logs' => $this->jsonArray($s->logs),
            ] + $stamps;

            $details[] = [
                'agent_transaction_id' => (int) $s->id,
                'client_first_name' => $this->clean($s->name),
                'client_last_name' => $this->clean($s->clientfamilyname),
                'client_email' => ($email = $this->clean($s->clientEmail)) ? strtolower($email) : null,
                'client_mobile' => $this->clean($s->clientMobile),
                'client_gender' => match (strtolower(trim((string) $s->clientGender))) {
                    'male' => 'Male',
                    'female' => 'Female',
                    default => null,
                },
                'client_country' => $this->clean($s->clientCountry),
                'client_address' => $this->clean($s->clientAddress, 2000),
            ] + $stamps;

            $props = $this->props($s->prop_details);
            $common = [
                'agent_transaction_id' => (int) $s->id,
                'project_property_type_id' => isset($this->propertyTypes[(int) $s->prop_type_id]) ? (int) $s->prop_type_id : null,
                'reservation_date' => $this->date($s->reservationdate, 'Y-m-d'),
                'unit_type' => $this->clean($props['unit_type'] ?? null),
                'floor_area' => $this->decimal($props['floor_area'] ?? null),
                'lot_area' => $this->decimal($props['lot_area'] ?? null),
                'proof_of_transaction' => $this->fileUrl($s->files),
                'total_contract_price' => (float) $s->tcprice,
            ] + $stamps;

            if ($common['proof_of_transaction']) {
                $this->stats['proof_links']++;
            }

            match ($type) {
                AgentTransaction::TYPE_PROJECT => $projects[] = $common + [
                    'developer_id' => isset($this->developers[(int) $s->devid]) ? (int) $s->devid : null,
                    'developer_project_id' => isset($this->projects[(int) $s->projid]) ? (int) $s->projid : null,
                    'project_name' => $this->clean($s->projectname) ?? ($this->projects[(int) $s->projid] ?? null),
                ],
                // For rentals the uploaded proof is the remittance slip.
                AgentTransaction::TYPE_RENTAL => $rentals[] = array_diff_key($common, ['proof_of_transaction' => true]) + [
                    'remittance_slip' => $common['proof_of_transaction'],
                    'property_size' => $this->clean($props['property_size'] ?? null),
                    'rental_rate' => $this->decimal($props['rental_rate'] ?? null, 999_999_999_999.99),
                    'closing_agent' => $this->clean($props['closing_agent'] ?? null),
                    'partner_agent' => $this->clean($props['partner_agent'] ?? null),
                    'deposit_slip' => $this->clean($s->rental_deposit_slip),
                    'commission_received' => 0,
                ],
                // Brokerage, like rental, keeps its proof as the remittance slip.
                AgentTransaction::TYPE_BROKERAGE => $brokerages[] = array_diff_key($common, ['proof_of_transaction' => true]) + [
                    'remittance_slip' => $common['proof_of_transaction'],
                    'brokerage_area_id' => (int) $s->devid,
                    'commission_received' => 0,
                ],
            };
        }

        foreach ([
            ['agent_transactions', $transactions], ['agent_transaction_details', $details],
            ['agent_project_transactions', $projects], ['agent_rental_transactions', $rentals],
            ['agent_brokerage_transactions', $brokerages],
        ] as [$table, $rows]) {
            foreach (array_chunk($rows, 500) as $batch) {
                DB::table($table)->insert($batch);
            }
        }
    }

    /**
     * Legacy `status` mixes commission state and cancellation; `validSale` is the validation flag.
     *
     * @return array{0: string, 1: string} [commission_status, sale_status]
     */
    // Sales reserved before this were never reviewed in the old system: a blank validSale means valid.
    public const UNREVIEWED_VALID_BEFORE = '2017-01-04';

    private function statuses(?string $status, ?string $validSale, ?string $reservationDate = null): array
    {
        $status = strtolower(trim((string) $status));

        $commission = match (true) {
            str_contains($status, 'partial') => 'Partially Claimed',
            in_array($status, ['full claimed', 'fully claimed', 'claimed', 'claim'], true) => 'Fully Claimed',
            default => 'Unclaimed',
        };

        if ($status === 'cancelled') {
            $this->stats['cancelled']++;

            return [$commission, 'cancelled'];
        }

        $unreviewed = $reservationDate !== null && $reservationDate < self::UNREVIEWED_VALID_BEFORE ? 'valid' : 'pending';

        return [$commission, match (strtolower(trim((string) $validSale))) {
            'yes' => 'valid',
            'no' => 'invalid',
            default => $unreviewed,
        }];
    }

    private function jsonArray(?string $json): ?string
    {
        $decoded = $json ? json_decode($json, true) : null;

        return is_array($decoded) && $decoded !== [] ? $json : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function props(?string $json): array
    {
        $decoded = $json ? json_decode($json, true) : null;

        return is_array($decoded) ? $decoded : [];
    }

    // Relative paths (proofoftrans/…) live on the old site; full links (S3) are kept as they are.
    private function fileUrl(?string $value): ?string
    {
        $value = trim((string) $value);

        // A handful of rows hold a PHP error page instead of a path.
        if ($value === '' || str_contains($value, '<') || str_contains($value, "\n")) {
            return null;
        }

        $url = Str::startsWith($value, ['http://', 'https://'])
            ? $value
            : self::FILE_BASE_URL.implode('/', array_map('rawurlencode', explode('/', ltrim($value, '/'))));

        return mb_strlen($url) <= 2048 ? $url : null;
    }

    private function decimal(mixed $value, float $max = self::MAX_DECIMAL): ?float
    {
        $value = str_replace([',', ' '], '', (string) $value);

        if (! is_numeric($value) || (float) $value <= 0 || (float) $value > $max) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function clean(mixed $value, int $max = 255): ?string
    {
        $value = trim(html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5));

        if ($value === '' || in_array(strtolower($value), ['null', 'n/a', 'na', '-', 'none'], true)) {
            return null;
        }

        return mb_substr($value, 0, $max);
    }

    // Legacy dates are text: mostly MM/DD/YYYY, sometimes MM/DD/YY, YYYYMMDD or YYYY-MM-DD.
    private function date(mixed $value, string $format = 'Y-m-d H:i:s'): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || str_starts_with($value, '0000')) {
            return null;
        }

        foreach (['!m/d/Y', '!m/d/y', '!Ymd', '!Y-m-d', 'Y-m-d H:i:s', '!m/d/Y H:i'] as $pattern) {
            try {
                $date = Carbon::createFromFormat($pattern, $value);
            } catch (Throwable) {
                continue;
            }
            // Rejects overflowed dates (e.g. 13/45/2020 rolling into another year) and typo'd years.
            if ($date->format(ltrim($pattern, '!')) === $value && $date->year >= 2000 && $date->year <= 2100) {
                return $date->format($format);
            }
        }

        return null;
    }
}
