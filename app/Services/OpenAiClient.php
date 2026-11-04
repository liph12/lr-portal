<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

// OpenAI's chat completions with a strict JSON schema (services.openai). The key stays on the server.
class OpenAiClient
{
    private const URL = 'https://api.openai.com/v1/chat/completions';

    /** @var array<string, int|string> the last call's token counts */
    public array $usage = [];

    public function configured(): bool
    {
        return (bool) config('services.openai.key');
    }

    public function model(): string
    {
        return (string) config('services.openai.model');
    }

    /**
     * @param  array<string, mixed>  $schema
     * @return array<string, mixed>
     */
    public function json(string $system, string $prompt, string $name, array $schema, int $maxTokens = 2500): array
    {
        $model = $this->model();
        $response = Http::withToken((string) config('services.openai.key'))
            ->connectTimeout(10)
            ->timeout(110)
            ->post(self::URL, [
                'model' => $model,
                'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $prompt]],
                'response_format' => ['type' => 'json_schema', 'json_schema' => ['name' => $name, 'strict' => true, 'schema' => $schema]],
                // A ceiling, so a runaway answer can't cost more than a normal one several times over.
                'max_completion_tokens' => $maxTokens,
            ] + (preg_match('/^(gpt-5|o\d)/', $model) ? ['reasoning_effort' => config('services.openai.reasoning', 'none')] : [])
              + (str_starts_with($model, 'gpt-5') ? ['verbosity' => 'low'] : []))
            ->throw();

        // What each call cost, to keep an eye on it (cached = prompt tokens OpenAI reused from an earlier identical prefix).
        $this->usage = [
            'model' => $model,
            'prompt' => (int) $response->json('usage.prompt_tokens'),
            'cached' => (int) $response->json('usage.prompt_tokens_details.cached_tokens'),
            'completion' => (int) $response->json('usage.completion_tokens'),
            'reasoning' => (int) $response->json('usage.completion_tokens_details.reasoning_tokens'),
        ];
        Log::info("OpenAI {$name}", $this->usage);

        $data = json_decode((string) $response->json('choices.0.message.content'), true);
        if (! is_array($data)) {
            throw new RuntimeException('The AI answer could not be read.');
        }

        return $data;
    }
}
