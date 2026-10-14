<?php

namespace App\Services;

use App\Models\Entities\Agent;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Support\Facades\DB;

// Onboarding for new local agents (not the back office): fully registered (step 4), no NAO or FIRE yet, and no sale of any kind (local or
// international, any status). Until they finish the steps that exist (STEPS, in order: profile photo, NAO) the dashboard
// sends them to the step they're on. Once started they stay in it (watching the webinar raises their NAO %).
// "Skip for now" stops that for the rest of the session.
class OnboardingService
{
    // The steps built so far, in order; FIRE comes next.
    public const STEPS = ['photo', 'nao'];

    public const SKIPPED = 'onboarding.skipped';

    public function needs(User $user): bool
    {
        // The back office (superadmin, admin, staff) may have an agent record but isn't onboarded as a new agent.
        if ($user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return false;
        }
        $agent = $user->agent;
        if (! $agent || $agent->agent_type !== Agent::TYPE_LOCAL || $agent->onboarding_step === self::STEPS[count(self::STEPS) - 1]) {
            return false;
        }
        $attributes = DB::table('agent_attributes')->where('agent_id', $agent->id)->first(['registration_status', 'nao_video_tracker', 'fire_certificates']);
        if (! $attributes || (int) $attributes->registration_status !== Agent::FULLY_REGISTERED) {
            return false;
        }
        if ($agent->onboarding_step !== null) {
            return true;
        }
        if ((int) $attributes->nao_video_tracker > 0 || (int) $attributes->fire_certificates > 0) {
            return false;
        }

        return ! DB::table('agent_transactions')->where('agent_id', $agent->id)->exists()
            && ! DB::table('international_sales')->where('agent_id', $agent->id)->exists();
    }

    // Where the dashboard sends them: the step after the last one they finished.
    public function nextUrl(Agent $agent): string
    {
        return match ($agent->onboarding_step) {
            'photo' => route('onboarding.nao'),
            default => route('onboarding.welcome'),
        };
    }

    public function complete(Agent $agent, string $step): void
    {
        $agent->forceFill(['onboarding_step' => $step])->saveQuietly();
    }
}
