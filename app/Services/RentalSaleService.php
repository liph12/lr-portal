<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentRentalTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

// Rental sales are encoded from the Rent.ph Rent Commission Report Slip: the amount received is 8.3% of the contract
// (which gives its total); Rent.ph's 20% share and the closing agent's team / unit manager are worked out, never stored.
// The slip is generated here; receiving it later (signed) validates the sale.
class RentalSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private CommissionSlipImage $slips,
        private ActivityLogger $activity,
        private AgentActivityService $agentActivity,
    ) {}

    // [total contract price, Rent.ph share] for an amount received.
    public static function amounts(float $received): array
    {
        return [
            round($received / (AgentRentalTransaction::COMMISSION_RATE / 100), 2),
            round($received * AgentRentalTransaction::RENT_PH_SHARE_RATE / 100, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $data  validated StoreRentalSaleRequest input
     * @param  array{contract: UploadedFile, proof_of_transaction: UploadedFile, deposit_slip: ?UploadedFile}  $uploads
     */
    public function record(array $data, array $uploads, User $recorder): AgentTransaction
    {
        [$total, $share] = self::amounts((float) $data['commission_received']);

        try {
            $transaction = DB::transaction(function () use ($data, $uploads, $recorder, $total, $share) {
                // The remittance date is the sale's date everywhere else (reports, cutoffs), as reservation_date always was.
                $transaction = SaleRecord::create(AgentTransaction::TYPE_RENTAL, ['reservation_date' => $data['remittance_date']] + $data, $recorder);
                $unregistered = empty($data['closing_agent_id']);
                if ($unregistered) {
                    // Credited to the closing agent, who has no account yet: no agent until one links (UnregisteredAgentLinker).
                    $transaction->forceFill(['agent_id' => null])->save();
                }
                $folder = "sales/rental/{$transaction->id}";

                $rental = $transaction->rentalTransaction()->create([
                    'project_property_type_id' => (int) $data['project_property_type_id'],
                    'property_size' => $data['property_size'],
                    'reservation_date' => $data['remittance_date'],
                    'remittance_date' => $data['remittance_date'],
                    'rental_rate' => $data['rental_rate'],
                    'duration_value' => $data['duration_value'],
                    'duration_unit' => $data['duration_unit'],
                    'commission_received' => $data['commission_received'],
                    'commission_rate' => AgentRentalTransaction::COMMISSION_RATE,
                    'total_contract_price' => $total,
                    // Names as legacy rentals record them; ids so the team and unit manager can always be looked up.
                    'closing_agent' => $unregistered ? trim($data['unregistered_agent_name']) : $this->agentName($data['closing_agent_id']),
                    'closing_agent_id' => $unregistered ? null : $data['closing_agent_id'],
                    'unregistered_agent_email' => $unregistered ? strtolower(trim($data['unregistered_agent_email'])) : null,
                    'unregistered_agent_mobile' => $unregistered ? (UnregisteredAgentLinker::mobileKey($data['unregistered_agent_mobile'] ?? null) ?: null) : null,
                    'partner_agent' => $this->agentName($data['partner_agent_id'] ?? null),
                    'partner_agent_id' => $data['partner_agent_id'] ?? null,
                    'contract' => $this->files->store($uploads['contract'], $folder),
                    'proof_of_transaction' => $this->files->store($uploads['proof_of_transaction'], $folder),
                    'deposit_slip' => $uploads['deposit_slip'] ? $this->files->store($uploads['deposit_slip'], $folder) : null,
                ]);

                $slip = $this->slips->render('rental', $this->slipLines(str_pad((string) $transaction->id, 2, '0', STR_PAD_LEFT), $data, $total, $share));
                $rental->forceFill([
                    'remittance_slip' => $this->files->storeGenerated($slip, $folder, 'png', 'image/png', "rent-commission-slip-{$transaction->id}.png"),
                ])->save();

                return $transaction;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $rental = $transaction->rentalTransaction;

        // A new sale makes a dormant agent active again right away.
        if ($transaction->agent_id) {
            $this->agentActivity->refresh([$transaction->agent_id]);
        }

        $this->activity->describe(
            'sale.rental.recorded',
            "Recorded rental sale #{$transaction->id}: {$transaction->unit_number}, amount received {$data['commission_received']}",
            $transaction,
            [
                'contract' => $rental->contract,
                'proof_of_transaction' => $rental->proof_of_transaction,
                'deposit_slip' => $rental->deposit_slip,
                'commission_slip' => $rental->remittance_slip,
                'closing_agent' => $rental->closing_agent,
                'partner_agent' => $rental->partner_agent,
                ...$this->files->totals(),
            ],
        );

        return $transaction;
    }

    // The slip for what's been encoded so far, before anything is saved.
    public function previewSlip(array $data): string
    {
        [$total, $share] = self::amounts((float) ($data['commission_received'] ?? 0));

        return $this->slips->render('rental', $this->slipLines('PREVIEW', $data, $total, $share));
    }


    /**
     * The closing agent's current team and their sub-team's unit manager — looked up, never stored.
     *
     * @return array{team: ?string, unit_manager: ?string}
     */
    public static function teamOf(?int $agentId): array
    {
        if (! $agentId) {
            return ['team' => null, 'unit_manager' => null];
        }
        $team = DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')->where('ta.agent_id', $agentId)->where('ta.status', 'active')->value('t.name');
        $manager = DB::table('sub_team_agents as sa')->join('sub_teams as s', 's.id', '=', 'sa.sub_team_id')
            ->join('agents as m', 'm.id', '=', 's.agent_id')->leftJoin('users as u', 'u.id', '=', 'm.user_id')
            ->where('sa.agent_id', $agentId)->where('sa.status', 'active')->value('u.name');

        return ['team' => $team, 'unit_manager' => $manager];
    }

    /**
     * What the slip prints, from the encoded fields (ids for the property type and agents).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function slipLines(string $serial, array $data, float $total, float $share): array
    {
        $peso = fn ($v) => 'PHP '.number_format((float) $v, 2);
        $received = (float) ($data['commission_received'] ?? 0);
        $client = trim(implode(' ', array_filter([$data['client_firstname'] ?? null, $data['client_middlename'] ?? null, $data['client_lastname'] ?? null])));
        $closingId = ! empty($data['closing_agent_id']) ? (int) $data['closing_agent_id'] : null;
        $team = self::teamOf($closingId);
        $rate = AgentRentalTransaction::COMMISSION_RATE.'%';
        $shareRate = AgentRentalTransaction::RENT_PH_SHARE_RATE.'%';

        return [
            'serial' => $serial,
            'date_label' => 'Remittance date',
            'date' => ! empty($data['remittance_date']) && strtotime((string) $data['remittance_date']) ? Carbon::parse($data['remittance_date'])->format('M j, Y') : null,
            'tiles' => [
                ['Total contract price', $received > 0 ? $peso($total) : null, "Amount received ÷ {$rate}"],
                ['Amount received', $received > 0 ? $peso($received) : null, "{$rate} of the contract"],
                ["{$shareRate} share of Rent.ph", $received > 0 ? $peso($share) : null, "{$shareRate} of the amount received"],
            ],
            'sections' => [
                ['Property', [
                    ['Property type', ! empty($data['project_property_type_id']) ? ProjectPropertyType::whereKey($data['project_property_type_id'])->value('name') : null],
                    ['Size of property', ! empty($data['property_size']) ? rtrim(rtrim(number_format((float) $data['property_size'], 2), '0'), '.').' sqm' : null],
                    ['Address', trim((string) ($data['unit_no'] ?? '')) ?: null],
                    ['Rate of rental', ! empty($data['rental_rate']) ? $peso($data['rental_rate']) : null],
                    ['Duration', self::duration($data['duration_value'] ?? null, $data['duration_unit'] ?? null)],
                ]],
                ['People', [
                    ['Closing agent', $this->agentName($closingId) ?? (trim((string) ($data['unregistered_agent_name'] ?? '')) ?: null)],
                    ['Partner agent', $this->agentName(isset($data['partner_agent_id']) ? (int) $data['partner_agent_id'] : null)],
                    ['Team', $team['team']],
                    ['Unit manager', $team['unit_manager']],
                ]],
                ['Client', [['Name of client', $client ?: null]]],
            ],
        ];
    }

    // "6 months", "1 year".
    public static function duration(mixed $value, mixed $unit): ?string
    {
        $value = (int) $value;
        if ($value <= 0 || ! in_array($unit, AgentRentalTransaction::DURATION_UNITS, true)) {
            return null;
        }

        return $value.' '.($value === 1 ? rtrim((string) $unit, 's') : $unit);
    }

    private function agentName(?int $agentId): ?string
    {
        if (! $agentId) {
            return null;
        }

        $agent = Agent::with('user:id,name')->find($agentId, ['id', 'user_id', 'first_name', 'last_name']);
        $name = trim("{$agent?->first_name} {$agent?->last_name}");

        return $name !== '' ? $name : $agent?->user?->name;
    }
}
