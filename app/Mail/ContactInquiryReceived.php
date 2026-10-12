<?php

namespace App\Mail;

use App\Models\Entities\ContactInquiry;
use App\Services\ContactLinkService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sent to the agent for every message from their public contact page; replying goes straight to the sender.
class ContactInquiryReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public ContactInquiry $inquiry) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->inquiry->inquiry_type} from {$this->inquiry->fullName()}",
            replyTo: [new Address($this->inquiry->email, $this->inquiry->fullName())],
        );
    }

    public function content(): Content
    {
        $agent = $this->inquiry->agent;

        return new Content(
            markdown: 'mail.contact-inquiry',
            with: [
                'agentName' => ContactLinkService::titleCase($agent->first_name) ?: 'there',
                'contactUrl' => url('/contact/'.$agent->contact_slug),
            ],
        );
    }
}
