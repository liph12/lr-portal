<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\AgentBrokerageTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\ProjectPropertyType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

// Brokerage sales are encoded from the Brokerage Commission Report Slip: the commission received gives the property's
// total (5% fixed) and the company's share (15% or 10%); the slip is generated here, with the property owner's name on it
// only (never stored). Receiving the sale later validates it and stamps the slip.
class BrokerageSaleService
{
    public function __construct(
        private SaleFileStorage $files,
        private CommissionSlipImage $slips,
        private ActivityLogger $activity,
        private AgentActivityService $agentActivity,
    ) {}

    // [total amount of property, company share] for a commission received at the given company-share rate.
    public static function amounts(float $commissionReceived, float $shareRate): array
    {
        return [
            round($commissionReceived / (AgentBrokerageTransaction::COMMISSION_RATE / 100), 2),
            round($commissionReceived * $shareRate / 100, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $data  validated StoreBrokerageSaleRequest input (property_owner is used for the slip only)
     * @param  array{contract: UploadedFile, proof_of_transaction: UploadedFile, deposit_slip: ?UploadedFile}  $uploads
     */
    public function record(array $data, array $uploads, User $recorder): AgentTransaction
    {
        [$total, $share] = self::amounts((float) $data['commission_received'], (float) $data['company_share_rate']);
        $closing = $this->agent($data['closing_agent_id'] ?? null);
        $partner = $this->agent($data['partner_agent_id'] ?? null);

        try {
            $transaction = DB::transaction(function () use ($data, $uploads, $recorder, $total, $share, $closing, $partner) {
                // The remittance date is the sale's date everywhere else (reports, cutoffs), as reservation_date always was.
                $transaction = SaleRecord::create(AgentTransaction::TYPE_BROKERAGE, ['reservation_date' => $data['remittance_date']] + $data, $recorder);
                $typeId = (int) $data['project_property_type_id'];
                $folder = "sales/brokerage/{$transaction->id}";

                $brokerage = $transaction->brokerageTransaction()->create([
                    'brokerage_area_id' => $data['brokerage_area_id'],
                    'project_property_type_id' => $typeId,
                    ...ProjectPropertyType::measurements($typeId, $data),
                    'reservation_date' => $data['remittance_date'],
                    'remittance_date' => $data['remittance_date'],
                    'commission_received' => $data['commission_received'],
                    'commission_rate' => AgentBrokerageTransaction::COMMISSION_RATE,
                    'company_share_rate' => $data['company_share_rate'],
                    'company_share' => $share,
                    'total_contract_price' => $total,
                    'contract' => $this->files->store($uploads['contract'], $folder),
                    'proof_of_transaction' => $this->files->store($uploads['proof_of_transaction'], $folder),
                    'deposit_slip' => $uploads['deposit_slip'] ? $this->files->store($uploads['deposit_slip'], $folder) : null,
                    'closing_agent' => $closing['name'] ?? null,
                    'partner_agent' => $partner['name'] ?? null,
                    'signing_broker_id' => $data['signing_broker_id'],
                ]);

                $slip = $this->slips->render('brokerage', $this->slipLines(str_pad((string) $transaction->id, 2, '0', STR_PAD_LEFT), $data, $total, $share));
                $brokerage->forceFill([
                    'remittance_slip' => $this->files->storeGenerated($slip, $folder, 'png', 'image/png', "commission-slip-{$transaction->id}.png"),
                ])->save();

                return $transaction;
            });
        } catch (Throwable $e) {
            $this->files->discardUploaded();

            throw $e;
        }

        $brokerage = $transaction->brokerageTransaction()->with('brokerageArea:id,name')->first();

        // A new sale makes a dormant agent active again right away.
        if ($transaction->agent_id) {
            $this->agentActivity->refresh([$transaction->agent_id]);
        }

        $this->activity->describe(
            'sale.brokerage.recorded',
            "Recorded brokerage sale #{$transaction->id}: {$brokerage->brokerageArea?->name}, commission received {$data['commission_received']}",
            $transaction,
            [
                'contract' => $brokerage->contract,
                'proof_of_transaction' => $brokerage->proof_of_transaction,
                'deposit_slip' => $brokerage->deposit_slip,
                'commission_slip' => $brokerage->remittance_slip,
                ...$this->files->totals(),
            ],
        );

        return $transaction;
    }


    /**
     * The slip for what's been encoded so far, before anything is saved (the owner's name included, as on the real one).
     *
     * @param  array<string, mixed>  $data  PreviewBrokerageSlipRequest input
     */
    public function previewSlip(array $data): string
    {
        [$total, $share] = self::amounts((float) ($data['commission_received'] ?? 0), (float) ($data['company_share_rate'] ?? AgentBrokerageTransaction::COMPANY_SHARE_RATES[0]));

        return $this->slips->render('brokerage', $this->slipLines('PREVIEW', $data, $total, $share));
    }

    /**
     * What the slip prints, from the encoded fields (ids for the area, property type, agents and broker).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function slipLines(string $serial, array $data, float $total, float $share): array
    {
        $peso = fn ($v) => 'PHP '.number_format((float) $v, 2);
        $percent = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.').'%';
        $client = trim(implode(' ', array_filter([$data['client_firstname'] ?? null, $data['client_middlename'] ?? null, $data['client_lastname'] ?? null])));
        $closing = $this->agent(isset($data['closing_agent_id']) ? (int) $data['closing_agent_id'] : null);
        $received = (float) ($data['commission_received'] ?? 0);
        $rate = $percent(AgentBrokerageTransaction::COMMISSION_RATE);
        $shareRate = $percent($data['company_share_rate'] ?? AgentBrokerageTransaction::COMPANY_SHARE_RATES[0]);

        return [
            'serial' => $serial,
            'date_label' => 'Remittance date',
            'date' => ! empty($data['remittance_date']) && strtotime((string) $data['remittance_date']) ? Carbon::parse($data['remittance_date'])->format('M j, Y') : null,
            'tiles' => [
                ['Total amount of property', $received > 0 ? $peso($total) : null, "Commission ÷ {$rate}"],
                ['Commission received', $received > 0 ? $peso($received) : null, "{$rate} of the property"],
                ["{$shareRate} share of company", $received > 0 ? $peso($share) : null, "{$shareRate} of the commission"],
            ],
            'sections' => [
                ['Property', [
                    ['Brokerage area', ! empty($data['brokerage_area_id']) ? DB::table('brokerage_areas')->where('id', $data['brokerage_area_id'])->value('name') : null],
                    ['Type of property', ! empty($data['project_property_type_id']) ? ProjectPropertyType::whereKey($data['project_property_type_id'])->value('name') : null],
                ]],
                ['People', [
                    ['Closing agent', $closing['name'] ?? null],
                    ['Partner agent', $this->agent(isset($data['partner_agent_id']) ? (int) $data['partner_agent_id'] : null)['name'] ?? null],
                    ['Team', $closing['team'] ?? null],
                    ['Signing broker', $this->agent(isset($data['signing_broker_id']) ? (int) $data['signing_broker_id'] : null)['name'] ?? null],
                ]],
                ['Client & owner', [['Name of client', $client ?: null], ['Name of owner', trim((string) ($data['property_owner'] ?? '')) ?: null]]],
            ],
        ];
    }

    /**
     * @return array{name: string, team: ?string}|null
     */
    private function agent(?int $agentId): ?array
    {
        $agent = $agentId ? Agent::with('user:id,name')->find($agentId) : null;
        if (! $agent) {
            return null;
        }
        $team = DB::table('team_agents as ta')->join('teams as t', 't.id', '=', 'ta.team_id')->where('ta.agent_id', $agent->id)->where('ta.status', 'active')->value('t.name');

        return ['name' => $agent->user?->name ?: trim("{$agent->first_name} {$agent->last_name}"), 'team' => $team];
    }
}
