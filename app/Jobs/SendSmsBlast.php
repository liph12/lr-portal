<?php

namespace App\Jobs;

use App\Services\SemaphoreClient;
use App\Services\SmsCreditService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use RuntimeException;

// Sends a queued SMS through Semaphore, 1000 numbers a call; numbers it doesn't take are marked failed and, for a sender
// paying with credits, their credits go back.
class SendSmsBlast implements ShouldQueue
{
    use Queueable;

    // Never retried: a retry could text the same people twice.
    public int $tries = 1;

    public int $timeout = 1200;

    public function __construct(public int $blastId) {}

    public function handle(SemaphoreClient $semaphore, SmsCreditService $credits): void
    {
        $blast = DB::table('sms_blasts')->where('id', $this->blastId)->first();
        if (! $blast || $blast->status !== 'queued') {
            return;
        }
        DB::table('sms_blasts')->where('id', $blast->id)->update(['status' => 'sending', 'updated_at' => now()]);

        $error = null;
        DB::table('sms_blast_recipients')->where('sms_blast_id', $blast->id)->where('status', 'queued')->select('id', 'mobile')
            ->chunkById(SemaphoreClient::MAX_NUMBERS, function ($chunk) use ($semaphore, $blast, &$error) {
                $numbers = $chunk->pluck('mobile')->all();
                try {
                    $accepted = $error ? [] : $semaphore->send($numbers, $blast->message);
                } catch (RuntimeException $e) {
                    // The rest won't go through either (no key, refused, out of balance): mark them failed without calling again.
                    $error = $e->getMessage();
                    $accepted = [];
                }
                $sent = $chunk->whereIn('mobile', $accepted)->pluck('id');
                DB::table('sms_blast_recipients')->whereIn('id', $sent)->update(['status' => 'sent', 'updated_at' => now()]);
                DB::table('sms_blast_recipients')->whereIn('id', $chunk->pluck('id')->diff($sent))->update(['status' => 'failed', 'updated_at' => now()]);
            });

        $sent = DB::table('sms_blast_recipients')->where('sms_blast_id', $blast->id)->where('status', 'sent')->count();
        $failed = DB::table('sms_blast_recipients')->where('sms_blast_id', $blast->id)->where('status', 'failed')->count();
        DB::table('sms_blasts')->where('id', $blast->id)->update([
            'status' => $failed === 0 ? 'sent' : ($sent === 0 ? 'failed' : 'partial'),
            'sent' => $sent, 'failed' => $failed, 'error' => $error, 'updated_at' => now(),
        ]);
        if ($blast->charged) {
            $credits->refund($blast->user_id, $failed * $blast->parts, $blast->id);
        }
    }

    // Stopped partway: whoever wasn't texted yet is marked failed, and their credits go back.
    public function failed(?\Throwable $e): void
    {
        $blast = DB::table('sms_blasts')->where('id', $this->blastId)->first();
        if (! $blast || ! in_array($blast->status, ['queued', 'sending'], true)) {
            return;
        }
        $unsent = DB::table('sms_blast_recipients')->where('sms_blast_id', $blast->id)->where('status', 'queued')->update(['status' => 'failed', 'updated_at' => now()]);
        $sent = DB::table('sms_blast_recipients')->where('sms_blast_id', $blast->id)->where('status', 'sent')->count();
        DB::table('sms_blasts')->where('id', $blast->id)->update([
            'status' => $sent ? 'partial' : 'failed', 'sent' => $sent, 'failed' => $blast->recipients - $sent, 'error' => 'Sending stopped unexpectedly.', 'updated_at' => now(),
        ]);
        if ($blast->charged) {
            app(SmsCreditService::class)->refund($blast->user_id, $unsent * $blast->parts, $blast->id);
        }
    }
}
