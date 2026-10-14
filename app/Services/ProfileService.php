<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ProfileService
{
    public function __construct(private ActivityLogger $activity) {}

    // Portal users predate agent records, so one is created on first use from the account's name and email.
    public function agentFor(User $user): Agent
    {
        $agent = $user->agent()->firstOrCreate([], [
            ...$this->splitName($user->name),
            'email' => $user->email,
        ]);

        // Replace any cached (null) relation so later reads in this request see the record.
        $user->setRelation('agent', $agent);

        return $agent;
    }

    /**
     * @param  array<string, mixed>  $data  validated UpdateProfileRequest input
     */
    public function update(User $user, array $data): Agent
    {
        $agent = DB::transaction(fn () => $this->write($this->agentFor($user), $user, $data));

        $this->activity->describe('profile.updated', 'Updated profile details', $agent, [
            'changed' => array_keys($agent->getChanges()),
        ]);

        return $agent;
    }

    /**
     * Someone else's profile, from the agent profile page (edit_agent_profile).
     *
     * @param  array<string, mixed>  $data  validated UpdateAgentProfileRequest input
     */
    public function updateAgent(Agent $agent, array $data): Agent
    {
        $agent = DB::transaction(fn () => $this->write($agent, $agent->user, $data));

        $name = trim("{$data['first_name']} {$data['last_name']}");
        $this->activity->describe('agent.profile_updated', "Updated {$name}'s profile", $agent, [
            'changed' => array_keys($agent->getChanges()),
        ]);

        return $agent;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function write(Agent $agent, ?User $user, array $data): Agent
    {
        $agent->update([
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'mobile' => $data['mobile'] ?? null,
            'phone' => $data['phone'] ?? null,
            'gender' => ($data['gender'] ?? 'Male') === 'Male',
            'marital_status' => $data['marital_status'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
        ]);

        // Instagram / X are only on the agent's own forms; a form without them (edit_agent_profile) leaves them alone.
        $agent->profile()->updateOrCreate([], [
            'about' => $data['about'] ?? null,
            'facebook' => $data['facebook'] ?? null,
            'linkedin' => $data['linkedin'] ?? null,
            'whatsapp' => $data['whatsapp'] ?? null,
            ...array_intersect_key($data, array_flip(['instagram', 'twitter'])),
        ]);

        // The account and the agent record describe the same person; keep them in step.
        $user?->update([
            'name' => trim("{$data['first_name']} {$data['last_name']}"),
            'email' => $data['email'],
        ]);

        return $agent;
    }

    /**
     * Profile › Business profile: what the public business profile shows beyond the agent's basic details.
     *
     * @param  array<string, mixed>  $data  validated UpdateBusinessProfileRequest input
     */
    public function updateBusiness(User $user, array $data): Agent
    {
        $agent = DB::transaction(function () use ($user, $data) {
            $agent = $this->agentFor($user);
            $agent->update(['mobile' => $data['mobile'] ?? null]);
            $agent->profile()->updateOrCreate([], [
                'about' => $data['about'] ?? null,
                'facebook' => $data['facebook'] ?? null,
                'instagram' => $data['instagram'] ?? null,
                'twitter' => $data['twitter'] ?? null,
                'linkedin' => $data['linkedin'] ?? null,
                'whatsapp' => $data['whatsapp'] ?? null,
                'links' => self::links($data['links'] ?? []),
            ]);

            return $agent;
        });

        $this->activity->describe('profile.business_updated', 'Updated business profile', $agent);

        return $agent;
    }

    /**
     * "My Links" as stored: trimmed {label, url} pairs in the order given, blanks dropped.
     *
     * @param  array<int, array{label?: string|null, url?: string|null}>  $links
     * @return array<int, array{label: string, url: string}>
     */
    private static function links(array $links): array
    {
        $clean = [];
        foreach ($links as $link) {
            $label = trim((string) ($link['label'] ?? ''));
            $url = trim((string) ($link['url'] ?? ''));
            if ($label !== '' && $url !== '') {
                $clean[] = ['label' => $label, 'url' => $url];
            }
        }

        return $clean;
    }

    public function updatePassword(User $user, string $password): void
    {
        $user->update(['password' => Hash::make($password)]);

        $this->activity->describe('profile.password_changed', 'Changed password', $user);
    }

    /**
     * @return array{first_name: string, last_name: string}
     */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [''];
        $last = count($parts) > 1 ? array_pop($parts) : '';

        return ['first_name' => implode(' ', $parts), 'last_name' => $last];
    }
}
