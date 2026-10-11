<?php

namespace App\Services;

use App\Models\Entities\AgentTransaction;
use App\Models\User;
use App\Policies\UserPolicy;

// The sale row and client details every category shares; category services add their own table.
final class SaleRecord
{
    /**
     * @param  array<string, mixed>  $data  validated sale request input (client_* and the shared sale fields)
     */
    public static function create(string $type, array $data, User $recorder): AgentTransaction
    {
        $transaction = AgentTransaction::create([
            'agent_id' => self::creditedAgent($recorder),
            'recorded_by' => $recorder->id,
            'sale_type' => $type,
            'unit_number' => $data['unit_no'],
            'commission_status' => $data['commission_status'],
            'term_of_payment' => $data['payment_terms'],
            'remarks' => $data['remarks'] ?? null,
            'sale_status' => 'pending',
        ]);

        $transaction->detail()->create([
            'client_first_name' => $data['client_firstname'],
            'client_middle_name' => $data['client_middlename'] ?? null,
            'client_last_name' => $data['client_lastname'],
            'client_email' => $data['client_email'] ?? null,
            'client_mobile' => $data['client_mobile'],
            'client_birthdate' => $data['client_birthdate'] ?? null,
            'client_gender' => $data['client_gender'] ?? null,
            'client_country' => $data['client_country'],
            'client_address' => $data['client_address'] ?? null,
        ]);

        return $transaction;
    }

    // Field roles record their own sales, so the sale counts for them; back-office staff record on
    // someone's behalf and stay as recorded_by only.
    private static function creditedAgent(User $recorder): ?int
    {
        if ($recorder->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return null;
        }

        return $recorder->agent()->value('id');
    }
}
