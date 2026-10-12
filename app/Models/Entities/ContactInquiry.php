<?php

namespace App\Models\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A message sent from an agent's public contact page (/contact/{slug}).
class ContactInquiry extends Model
{
    public const ROLES = ['Interested Buyer', 'Interested to Rent', 'Homeowner', 'Broker/Agent', 'Proposals', 'Applicant'];

    public const TYPES = ['General Inquiry', 'Quotation Request'];

    protected $fillable = [
        'agent_id',
        'inquirer_role',
        'inquiry_type',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'contact_number',
        'message',
        'consented_at',
    ];

    protected function casts(): array
    {
        return [
            'consented_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    public function fullName(): string
    {
        return trim(preg_replace('/\s+/', ' ', "{$this->first_name} {$this->middle_name} {$this->last_name}"));
    }
}
