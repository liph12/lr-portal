<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

// The 6-digit code that confirms a new agent's email before they register. Sent at once (not queued): they're waiting for it.
class RegistrationCodeMail extends Mailable
{
    public function __construct(public string $code, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Your Leuterio Realty sign-up code: {$this->code}");
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.registration-code');
    }
}
