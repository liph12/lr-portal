<?php

namespace App\Services;

use App\Support\SmsText;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

// Semaphore's SMS API (semaphore.co, v4): bulk messages to up to 1000 numbers a call, and the account's credit balance.
class SemaphoreClient
{
    public const MAX_NUMBERS = 1000;

    public function configured(): bool
    {
        return (bool) config('services.semaphore.key');
    }

    /**
     * Sends one message to these numbers (≤ 1000).
     *
     * @param  string[]  $numbers
     * @return string[] the numbers Semaphore accepted
     */
    public function send(array $numbers, string $message): array
    {
        $body = $this->call(fn () => $this->client()->asForm()->post('messages', array_filter([
            'apikey' => config('services.semaphore.key'),
            'number' => implode(',', $numbers),
            'message' => $message,
            'sendername' => config('services.semaphore.sender_name'),
        ])));

        $accepted = [];
        foreach (is_array($body) ? $body : [] as $row) {
            if (is_array($row) && isset($row['recipient']) && ($n = SmsText::mobile((string) $row['recipient']))) {
                $accepted[$n] = $n;
            }
        }

        return array_values($accepted);
    }

    // The company account's remaining Semaphore credits.
    public function balance(): ?float
    {
        $body = $this->call(fn () => $this->client()->get('account', ['apikey' => config('services.semaphore.key')]));

        return isset($body['credit_balance']) ? (float) $body['credit_balance'] : null;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.semaphore.url'), '/'))->acceptJson()->timeout(30);
    }

    private function call(callable $request): mixed
    {
        if (! $this->configured()) {
            throw new RuntimeException('SMS sending isn\'t set up yet (no Semaphore API key).');
        }
        try {
            $response = $request();
        } catch (ConnectionException) {
            throw new RuntimeException('Semaphore can\'t be reached right now. Try again in a moment.');
        }
        if ($response->failed()) {
            // Semaphore answers errors as {field: [messages]} or a plain message.
            $error = collect((array) $response->json())->flatten()->filter(fn ($v) => is_string($v))->first();
            throw new RuntimeException('Semaphore refused it: '.($error ?: 'error '.$response->status()).'.');
        }

        return $response->json();
    }
}
