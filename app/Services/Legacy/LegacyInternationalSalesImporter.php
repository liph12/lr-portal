<?php

namespace App\Services\Legacy;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Copies legacy international_sales_report into international_sales + international_sale_clients.
 * See docs/legacy-migration/international-sales.md.
 *
 * Legacy agent_id is the old members.memberid; it's mapped to members.id, which is agents.id here.
 * Legacy ids are kept, so re-running skips what is already imported.
 */
class LegacyInternationalSalesImporter
{
    // POT files of this app live on the old S3 bucket, not on the website like salesreport's.
    public const FILE_BASE_URL = 'https://filipinohomes123.s3.ap-southeast-1.amazonaws.com/';

    private ConnectionInterface $legacy;

    /** @var array<int, int> memberid => members.id */
    private array $agentOfMemberId = [];

    /** @var array<int, true> */
    private array $agents = [];

    /** @var array<int, true> */
    private array $propertyTypes = [];

    private array $stats = [
        'imported' => 0, 'already_imported' => 0, 'with_agent' => 0, 'agent_not_found' => 0,
        'valid' => 0, 'invalid' => 0, 'pending' => 0, 'without_pot' => 0,
    ];

    public function __construct()
    {
        $this->legacy = DB::connection('legacy');
    }

    /**
     * @return array<string, int>
     */
    public function run(bool $dryRun = false): array
    {
        // A few memberids repeat; the newest member row is the one imported as the agent (same as salesreport).
        $this->legacy->table('members')->where('memberid', '>', 0)->orderBy('id')->select('id', 'memberid')
            ->lazyById(10000, 'id')
            ->each(function ($m) {
                $this->agentOfMemberId[(int) $m->memberid] = (int) $m->id;
            });
        $this->agents = array_fill_keys(DB::table('agents')->pluck('id')->all(), true);
        $this->propertyTypes = array_fill_keys(DB::table('project_property_types')->pluck('id')->all(), true);
        $existing = array_fill_keys(DB::table('international_sales')->pluck('id')->all(), true);

        DB::beginTransaction();

        try {
            foreach ($this->legacy->table('international_sales_report')->orderBy('id')->get() as $s) {
                if (isset($existing[$s->id])) {
                    $this->stats['already_imported']++;
                    continue;
                }

                $this->import($s);
            }

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return $this->stats;
    }

    private function import(object $s): void
    {
        $memberId = $this->agentOfMemberId[(int) $s->agent_id] ?? null;
        $agentId = $memberId && isset($this->agents[$memberId]) ? $memberId : null;
        $this->stats[$agentId ? 'with_agent' : 'agent_not_found']++;

        $status = match (strtolower(trim((string) $s->sale_validation))) {
            'yes', 'valid', '1' => 'valid',
            'no', 'invalid', '0' => 'invalid',
            default => 'pending',
        };
        $this->stats[$status]++;

        $pot = $this->fileUrl($s->pot_file);
        if (! $pot) {
            $this->stats['without_pot']++;
        }

        $reservation = $this->date($s->reservation_date);
        $created = $this->dateTime($s->created_at) ?? ($reservation ? "{$reservation} 00:00:00" : now()->toDateTimeString());
        $logs = $s->logs ? json_decode($s->logs, true) : null;

        DB::table('international_sales')->insert([
            'id' => (int) $s->id,
            'agent_id' => $agentId,
            'recorded_by' => null,
            'project_property_type_id' => isset($this->propertyTypes[(int) $s->property_type_id]) ? (int) $s->property_type_id : null,
            'unit_number' => Str::limit(trim((string) $s->unit_number), 250, '') ?: '—',
            'unit_quantity' => max(1, (int) $s->unit_quantity),
            'total_contract_price' => round((float) $s->total_contract_price, 2),
            'reservation_date' => $reservation,
            'proof_of_transaction' => $pot,
            'sale_status' => $status,
            'remarks' => trim((string) $s->remarks) ?: null,
            'update_logs' => is_array($logs) && $logs !== [] ? json_encode($logs) : null,
            'created_at' => $created,
            'updated_at' => $this->dateTime($s->updated_at) ?? $created,
        ]);

        $age = (int) preg_replace('/\D/', '', (string) $s->client_age);

        DB::table('international_sale_clients')->insert([
            'international_sale_id' => (int) $s->id,
            'first_name' => Str::limit(Str::title(trim((string) $s->client_fn)), 100, '') ?: '—',
            'middle_name' => Str::limit(Str::title(trim((string) $s->client_mn)), 100, '') ?: null,
            'last_name' => Str::limit(Str::title(trim((string) $s->client_ln)), 100, '') ?: null,
            'email' => filter_var(strtolower(trim((string) $s->client_email)), FILTER_VALIDATE_EMAIL) ?: null,
            'age' => $age > 0 && $age < 120 ? $age : null,
            // Every legacy row holds the same value (1); it was a form default, not the client's gender.
            'gender' => null,
            'mobile' => Str::limit(trim((string) $s->client_mobile), 30, '') ?: null,
            'country' => Str::limit(trim((string) $s->client_country), 100, '') ?: null,
            'address' => trim((string) $s->client_address) ?: null,
            'created_at' => $created,
            'updated_at' => $created,
        ]);

        $this->stats['imported']++;
    }

    private function fileUrl(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || str_contains($value, '<') || str_contains($value, "\n")) {
            return null;
        }

        return Str::startsWith($value, ['http://', 'https://'])
            ? $value
            : self::FILE_BASE_URL.implode('/', array_map('rawurlencode', explode('/', ltrim($value, '/'))));
    }

    private function date(mixed $value): ?string
    {
        return ($dt = $this->dateTime($value)) ? substr($dt, 0, 10) : null;
    }

    private function dateTime(mixed $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || str_starts_with($value, '0000')) {
            return null;
        }

        try {
            $date = Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }

        return $date->year >= 1990 && $date->year <= 2100 ? $date->toDateTimeString() : null;
    }
}
