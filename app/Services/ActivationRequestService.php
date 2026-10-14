<?php

namespace App\Services;

use App\Models\Entities\Agent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// The last step of onboarding: an agent's LR account is activated with their first sale, so they send the signed request for
// activation together with that sale's proof of transaction, for the office to activate them and encode the sale.
class ActivationRequestService
{
    public function __construct(private SaleFileStorage $files, private ActivityLogger $activity) {}

    public function submit(Agent $agent, UploadedFile $requestForm, UploadedFile $proof, ?string $notes): void
    {
        $folder = "activation-requests/{$agent->id}";
        try {
            $form = $this->files->store($requestForm, $folder);
            $pot = $this->files->store($proof, $folder);
            DB::table('activation_requests')->insert([
                'agent_id' => $agent->id,
                'request_form' => $form,
                'proof_of_transaction' => $pot,
                'notes' => $notes ?: null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->files->discardUploaded();
            throw $e;
        }

        $this->activity->describe('agent.activation_requested', 'Sent a request for activation with the proof of transaction of their sale', $agent, ['request_form' => $form, 'proof' => $pot]);
    }

    /**
     * @return array{submitted_at: string, request_form: string, proof_of_transaction: string, notes: ?string}|null
     */
    public function latest(Agent $agent): ?array
    {
        $row = DB::table('activation_requests')->where('agent_id', $agent->id)->orderByDesc('created_at')->orderByDesc('id')->first();

        return $row ? [
            'submitted_at' => Carbon::parse($row->created_at)->toIso8601String(),
            'request_form' => $row->request_form,
            'proof_of_transaction' => $row->proof_of_transaction,
            'notes' => $row->notes,
        ] : null;
    }
}
