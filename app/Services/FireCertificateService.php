<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

// FIRE courses a person has taken, from the training site (realestatetraining.ph, by email): the "score" entries.
// Only course, date and score leave this class (the site also returns personal details we don't pass on). Cached an hour.
class FireCertificateService
{
    public const SHOWN = 3;

    /**
     * @return array{certificates: array<int, array{course: string, taken_on: ?string, score: ?int}>, total: int}|null  null when the site can't be reached
     */
    public function for(string $email): ?array
    {
        $email = strtolower(trim($email));

        return Cache::remember("fire-certificates:{$email}", now()->addHour(), function () use ($email) {
            try {
                $response = Http::timeout(8)->acceptJson()->get(rtrim((string) config('services.fire_certificates.url'), '/').'/'.rawurlencode($email));
            } catch (Throwable) {
                return null;
            }
            if (! $response->ok()) {
                return null;
            }

            // The courses sit under user.score.
            $scores = collect($response->json('user.score') ?? $response->json('score') ?? [])->filter(fn ($s) => is_array($s));

            return [
                'certificates' => $scores->sortByDesc('dateTaken')->take(self::SHOWN)->map(fn ($s) => [
                    'course' => (string) ($s['course']['cname'] ?? 'Course #'.($s['courseid'] ?? '?')),
                    'taken_on' => isset($s['dateTaken']) && ! str_starts_with((string) $s['dateTaken'], '0000') ? (string) $s['dateTaken'] : null,
                    'score' => isset($s['score']) ? (int) $s['score'] : null,
                ])->values()->all(),
                'total' => $scores->count(),
            ];
        });
    }
}
