<?php

namespace App\Mail;

use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

// Recruits Progress › Send report: the AI analysis of a team / sub-team in the email itself (not an attachment), for its leader.
class RecruitAnalysisReport extends Mailable
{
    /**
     * @param  array{group: string, leader: array{name: string, email: string, role: string}|null, audience: string}  $recipient
     * @param  array<string, mixed>  $analysis  RecruitAnalysisService::analyze()
     */
    public function __construct(public array $recipient, public array $analysis, public string $portalUrl, public string $senderName) {}

    public function envelope(): Envelope
    {
        $copy = $this->recipient['audience'] === 'superadmins' ? ' (superadmins only)' : '';

        return new Envelope(subject: "Recruits Progress AI analysis: {$this->recipient['group']}, {$this->range()}{$copy}");
    }

    public function content(): Content
    {
        $facts = $this->analysis['facts'];

        return new Content(view: 'mail.recruit-analysis', with: [
            'group' => $this->recipient['group'],
            'leader' => $this->recipient['leader'],
            'audience' => $this->recipient['audience'],
            'kind' => $this->analysis['group']['type'] === 'team' ? 'team' : 'sub-team',
            'range' => $this->range(),
            'facts' => $facts,
            'ai' => $this->analysis['ai'],
            'model' => $this->analysis['model'],
            'portalUrl' => $this->portalUrl,
            'sender' => $this->senderName,
            'peso' => fn (float $v) => '₱'.number_format($v, 2),
            'pesoShort' => fn (float $v) => '₱'.number_format($v, 0),
            'month' => fn (string $ym) => CarbonImmutable::parse($ym.'-01')->format('F Y'),
        ]);
    }

    private function range(): string
    {
        $range = $this->analysis['facts']['range'];

        return CarbonImmutable::parse($range['from'])->format('M j, Y').' – '.CarbonImmutable::parse($range['to'])->format('M j, Y');
    }
}
