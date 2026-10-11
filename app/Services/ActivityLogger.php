<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Request-scoped: services call describe() while handling a request, and the
 * LogActivity middleware writes a single row with everything at the end.
 */
class ActivityLogger
{
    private const LOGGED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    private ?string $action = null;
    private ?string $description = null;
    private ?Model $subject = null;
    private array $properties = [];

    public function describe(string $action, string $description, ?Model $subject = null, array $properties = []): void
    {
        $this->action = $action;
        $this->description = Str::limit($description, 250);
        $this->subject = $subject;
        $this->properties = array_merge($this->properties, $properties);
    }

    public function shouldLog(Request $request): bool
    {
        if (! config('activity_log.enabled') || $request->is(...config('activity_log.except_paths'))) {
            return false;
        }

        return in_array($request->method(), self::LOGGED_METHODS, true)
            || config('activity_log.log_get_requests');
    }

    public function record(Request $request, Response $response, ?User $user, ?int $durationMs): ActivityLog
    {
        $exception = property_exists($response, 'exception') ? $response->exception : null;
        $properties = $this->properties;

        if ($exception instanceof Throwable && $response->getStatusCode() >= 500) {
            $properties['exception'] = get_class($exception).': '.Str::limit($exception->getMessage(), 500);
        }

        return ActivityLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'user_email' => $user?->email,
            'action' => $this->action ?? $request->route()?->getName() ?? $request->method().' /'.ltrim($request->path(), '/'),
            'description' => $this->description,
            'subject_type' => $this->subject?->getMorphClass(),
            'subject_id' => $this->subject?->getKey(),
            'method' => $request->method(),
            'route_name' => $request->route()?->getName(),
            'path' => Str::limit('/'.ltrim($request->path(), '/'), 2000, ''),
            'status_code' => $response->getStatusCode(),
            'outcome' => $this->outcome($request, $response),
            'payload' => $this->sanitize($request->all()) ?: null,
            'properties' => $properties ?: null,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'duration_ms' => $durationMs,
        ]);
    }

    private function outcome(Request $request, Response $response): string
    {
        $status = $response->getStatusCode();

        return match (true) {
            $status >= 500 => ActivityLog::OUTCOME_ERROR,
            $status === 401 => ActivityLog::OUTCOME_UNAUTHENTICATED,
            $status === 403 => ActivityLog::OUTCOME_FORBIDDEN,
            $status === 404 => ActivityLog::OUTCOME_NOT_FOUND,
            $status === 422 => ActivityLog::OUTCOME_VALIDATION_FAILED,
            $status >= 400 => ActivityLog::OUTCOME_ERROR,
            // Inertia/web validation failures redirect back (302) with errors flashed to the session.
            $request->hasSession() && $request->session()->has('errors') => ActivityLog::OUTCOME_VALIDATION_FAILED,
            default => ActivityLog::OUTCOME_SUCCESS,
        };
    }

    /**
     * @param  array<mixed>  $input
     * @return array<mixed>
     */
    public function sanitize(array $input): array
    {
        $redact = array_map('strtolower', config('activity_log.redact'));
        $max = config('activity_log.max_string_length');
        $clean = [];

        foreach ($input as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), $redact, true)) {
                $clean[$key] = '[redacted]';
            } elseif ($value instanceof UploadedFile) {
                $clean[$key] = [
                    'file' => $value->getClientOriginalName(),
                    'size' => $value->getSize(),
                    'mime' => $value->getClientMimeType(),
                ];
            } elseif (is_array($value)) {
                $clean[$key] = $this->sanitize($value);
            } elseif (is_string($value)) {
                $clean[$key] = Str::limit($value, $max);
            } else {
                $clean[$key] = $value;
            }
        }

        return $clean;
    }
}
