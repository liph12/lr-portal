<?php

namespace App\Services;

use App\Mail\RegistrationCodeMail;
use App\Models\Entities\Agent;
use App\Models\Entities\SubTeamAgent;
use App\Models\Entities\TeamAgent;
use App\Models\Role;
use App\Models\User;
use App\Support\Areas;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

// Registration from a sponsor's referral link (/register?ref={their referral code}, + &type=international for a Global
// Partner): the new agent confirms the sponsor, proves their email with a 6-digit code, fills the four steps and a password,
// and joins the sponsor's team and sub-team (AgentUplineService::placementOf) as a fully registered agent — a local
// salesperson, or a global partner based abroad (agent_type global_partner, role global_partner, their country).
class RegistrationService
{
    public const TYPE_LOCAL = 'local';

    public const TYPE_INTERNATIONAL = 'international';

    public const TYPES = [self::TYPE_LOCAL, self::TYPE_INTERNATIONAL];

    // How long a code works, how many tries it allows, and how soon another can be sent.
    private const CODE_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    private const RESEND_SECONDS = 60;

    public function __construct(private AgentUplineService $uplines, private ActivityLogger $activity) {}

    /**
     * The sponsor a referral code points to, for the confirmation card: only an active account's agent record.
     *
     * @return array{id: int, name: string, avatar: ?string, branch: ?string, team: ?string, sub_team: ?string}|null
     */
    public function sponsor(?string $code): ?array
    {
        $agent = $this->sponsorAgent($code);
        if (! $agent) {
            return null;
        }
        $placement = $this->uplines->placementOf($agent);

        return [
            'id' => $agent->id,
            'name' => $agent->user->name,
            'avatar' => $agent->avatar,
            'branch' => $agent->area ? Areas::name($agent->area) : null,
            'team' => $placement['team']?->name,
            'sub_team' => $placement['sub_team']?->name,
        ];
    }

    public function sendCode(string $email): void
    {
        $key = $this->key($email);
        if (Cache::has("{$key}:sent")) {
            throw ValidationException::withMessages(['email' => 'A code was just sent. Wait a minute before asking for another.']);
        }

        $code = (string) random_int(100000, 999999);
        Cache::put($key, ['hash' => Hash::make($code), 'attempts' => 0], now()->addMinutes(self::CODE_MINUTES));
        Cache::put("{$key}:sent", true, now()->addSeconds(self::RESEND_SECONDS));

        Mail::to($email)->send(new RegistrationCodeMail($code, self::CODE_MINUTES));
    }

    public function verifyCode(string $email, string $code): void
    {
        $key = $this->key($email);
        $entry = Cache::get($key);
        if (! $entry) {
            throw ValidationException::withMessages(['code' => 'This code has expired. Send a new one.']);
        }
        if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            throw ValidationException::withMessages(['code' => 'Too many tries. Send a new code.']);
        }
        if (! Hash::check($code, $entry['hash'])) {
            Cache::put($key, ['attempts' => $entry['attempts'] + 1] + $entry, now()->addMinutes(self::CODE_MINUTES));
            throw ValidationException::withMessages(['code' => "That code isn't right."]);
        }

        Cache::forget($key);
    }

    /**
     * Creates the account and the agent: local, fully registered (step 4), sponsored by the referral's agent and on their
     * team / sub-team from today.
     *
     * @param  array<string, mixed>  $data  validated StoreRegistrationRequest input
     */
    public function register(array $data, string $email, string $code, string $type = self::TYPE_LOCAL): User
    {
        $international = $type === self::TYPE_INTERNATIONAL;
        $sponsor = $this->sponsorAgent($code) ?? abort(422, 'The referral link is no longer valid.');
        $placement = $this->uplines->placementOf($sponsor);

        $user = DB::transaction(function () use ($data, $email, $sponsor, $placement, $international) {
            $user = User::create([
                'name' => trim("{$data['first_name']} {$data['last_name']}"),
                'email' => $email,
                'password' => $data['password'],
            ]);
            if ($role = Role::where('name', $international ? 'global_partner' : 'agent')->first()) {
                $user->roles()->attach($role);
            }

            $agent = Agent::create([
                'user_id' => $user->id,
                'email' => $email,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'gender' => $data['gender'] === 'Male',
                'marital_status' => $data['marital_status'],
                'birthdate' => $data['birthdate'],
                'citizenship' => $data['citizenship'],
                'mobile' => $data['mobile'],
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'],
                'barangay' => $data['barangay'] ?? null,
                'city' => $data['city'],
                'state' => $data['province'],
                'postal_code' => $data['postal_code'] ?? null,
            ]);
            // A global partner lives abroad (their branch becomes "abroad"); a salesperson in the Philippines (the default).
            $agent->forceFill([
                'agent_type' => $international ? Agent::TYPE_GLOBAL_PARTNER : Agent::TYPE_LOCAL,
                'activated_at' => now(),
                ...($international ? ['country_code' => $data['country'], 'country' => config('countries')[$data['country']]] : []),
            ])->save();

            DB::table('agent_attributes')->insert([
                'agent_id' => $agent->id,
                'referral_id' => $sponsor->id,
                'registration_status' => Agent::FULLY_REGISTERED,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $agent->profile()->create([
                'about' => $data['about'] ?? null,
                'facebook' => $data['facebook'] ?? null,
                'skills' => $data['skills'],
                'work_experience' => $data['work_experience'] ?? null,
                'education' => $data['education'],
                'professions' => $data['professions'],
                'hobbies' => $data['hobbies'],
            ]);
            if (! empty($data['tin'])) {
                DB::table('agent_credentials')->insert(['agent_id' => $agent->id, 'tax_identification_no' => $data['tin'], 'created_at' => now(), 'updated_at' => now()]);
            }

            // The sponsor's team and sub-team, from today (a sponsor with no team: none yet; Management can place them).
            $today = now()->toDateString();
            if ($placement['team']) {
                TeamAgent::create(['team_id' => $placement['team']->id, 'agent_id' => $agent->id, 'joined_at' => $today, 'status' => TeamAgent::STATUS_ACTIVE]);
            }
            if ($placement['sub_team']) {
                SubTeamAgent::create(['sub_team_id' => $placement['sub_team']->id, 'agent_id' => $agent->id, 'joined_at' => $today, 'status' => SubTeamAgent::STATUS_ACTIVE]);
            }

            return $user;
        });

        $where = $placement['team'] ? ' on '.$placement['team']->name.($placement['sub_team'] ? ' / '.$placement['sub_team']->name : '') : '';
        $as = $international ? 'a global partner' : 'a salesperson';
        $this->activity->describe('agent.registered', "{$user->name} registered as {$as} under sponsor #{$sponsor->id}{$where}", $user->agent, [
            'type' => $type,
            'sponsor_id' => $sponsor->id,
            'team_id' => $placement['team']?->id,
            'sub_team_id' => $placement['sub_team']?->id,
        ]);

        return $user;
    }

    // Only an active account's agent: a link of someone who left registers nobody.
    private function sponsorAgent(?string $code): ?Agent
    {
        $agent = $code ? Agent::with('user:id,name,status')->where('referral_code', $code)->first() : null;

        return $agent && $agent->user?->status === User::STATUS_ACTIVE ? $agent : null;
    }

    private function key(string $email): string
    {
        return 'registration-code:'.sha1(mb_strtolower(trim($email)));
    }
}
