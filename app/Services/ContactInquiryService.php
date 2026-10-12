<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\Entities\ContactInquiry;

class ContactInquiryService
{
    public function __construct(private ActivityLogger $activity) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreContactInquiryRequest input
     */
    public function submit(Agent $agent, array $data): ContactInquiry
    {
        $inquiry = $agent->inquiries()->create([
            'inquirer_role' => $data['inquirer_role'],
            'inquiry_type' => $data['inquiry_type'],
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'message' => $data['message'],
            'consented_at' => now(),
        ]);

        $this->activity->describe('contact.inquiry', "{$inquiry->fullName()} sent an inquiry to {$agent->first_name} {$agent->last_name}", $inquiry, [
            'agent_id' => $agent->id,
            'inquiry_type' => $inquiry->inquiry_type,
        ]);

        return $inquiry;
    }
}
