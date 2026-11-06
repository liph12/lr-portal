<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

// The 6-digit code and reset link sent when an agent asks to reset their password. Sent at once (not queued): they're
// waiting for it.
class PasswordResetMail extends Mailable
{
    public function __construct(public string $code, public string $link, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Reset your Leuterio Realty password');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.password-reset');
    }
}
