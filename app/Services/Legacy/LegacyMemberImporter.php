<?php

namespace App\Services\Legacy;

use App\Models\Entities\Agent;
use App\Support\Areas;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

/**
 * Copies legacy `members` (old leuteriorealty system) into users + agents and their agent_* tables.
 * Only columns that the new schema already has, and that the old system still fills in recent
 * records, are carried over — see docs/legacy-migration/members.md for the full mapping.
 *
 * Agents keep their legacy member id as `agents.id`, so `members.inviterid` is directly the sponsor's
 * agent id (`agent_attributes.referral_id`) and other legacy tables can join on it. New agents
 * created in the portal continue from the highest legacy id.
 *
 * Idempotent by email: a member whose email already belongs to a portal user is never overwritten,
 * so re-running only adds members that weren't imported yet.
 */
class LegacyMemberImporter
{
    // Photos stored as a bare filename live under the member's folder on the old site.
    public const PHOTO_BASE_URL = 'https://leuteriorealty.com/memberfiles/';

    // Legacy roles.role → new role [name, label]. Superadmin is never granted by an import.
    private const ROLE_MAP = [
        'AGENT' => ['agent', 'Agent'],
        'UNIT MANAGER' => ['unit_manager', 'Unit Manager'],
        // Legacy supervisors lead teams.
        'SUPERVISOR' => ['team_leader', 'Team Leader'],
        'BROKER' => ['broker', 'Broker'],
        'SECRETARY' => ['secretary', 'Secretary'],
        'ADMIN' => ['admin', 'Admin'],
    ];

    // Agents whose legacy national_intern is "international".
    private const GLOBAL_PARTNER_ROLE = ['global_partner', 'Global Partner'];

    // For members without a legacy users row, members.membertype stands in for the role.
    private const MEMBERTYPE_TO_ROLE = [
        'agent' => 'AGENT',
        'broker' => 'BROKER',
        'supervisor' => 'SUPERVISOR',
        'secretary' => 'SECRETARY',
        'admin' => 'ADMIN',
        'superadmin' => 'ADMIN',
        'resigned' => 'AGENT',
    ];

    private const SKIPPED_ROLES = ['CLIENT'];

    // Every table with an agent_id foreign key; kept in step when an agent row is renumbered.
    private const AGENT_CHILD_TABLES = [
        'agent_profiles', 'agent_credentials', 'agent_attributes', 'agent_transactions',
        'teams', 'team_agents', 'sub_teams', 'sub_team_agents',
    ];

    private const STATUSES = [User::STATUS_ACTIVE, User::STATUS_INACTIVE, User::STATUS_RESIGNED, User::STATUS_TERMINATED];

    private const MARITAL_STATUSES = ['Single', 'Married', 'Separated', 'Widowed'];

    private const MEMBER_COLUMNS = [
        'id', 'memberid', 'inviterid', 'email', 'fn', 'mn', 'ln', 'completename', 'status', 'membertype',
        'hashpass', 'password', 'gender', 'maritalstatus', 'phone', 'mobile', 'address', 'city', 'state',
        'photo', 'aboutyourself', 'specialskills', 'workexperience', 'fblink', 'tin', 'dateactivated',
        'nao_video_tracker', 'nao_proof_of_attendance', 'nao_attendance_confirmation', 'nao_date_attended',
        'fire_certs_count', 'prc_expiry', 'dshud_expiry', 'national_intern', 'country', 'lr_joined', 'registration_status', 'created_at', 'updated_at',
    ];

    private ConnectionInterface $legacy;

    /** @var array<string, array{password: ?string, role: ?string}> legacy users by normalised email */
    private array $legacyAccounts = [];

    /** @var array<string, int> email → the member id chosen for it (newest record wins) */
    private array $chosenMember = [];

    /** @var array<string, int> new role name → role id */
    private array $roleIds = [];

    private string $lockedPassword;

    /** @var array<int, array{0: int|string, 1: string, 2: string}> [member id, email, reason] */
    private array $rejects = [];

    private array $stats = [
        'read' => 0, 'imported' => 0, 'existing_account' => 0, 'rejected' => 0,
        'passwords_kept' => 0, 'passwords_locked' => 0, 'photos' => 0, 'sponsors_linked' => 0, 'agents_renumbered' => 0,
        'text_truncated' => 0, 'gender_unknown' => 0,
    ];

    public function __construct()
    {
        $this->legacy = DB::connection('legacy');
    }

    /**
     * @param  callable(int $done, int $total): void|null  $progress
     * @return array{stats: array<string, int>, rejects: array<int, array{0: int|string, 1: string, 2: string}>, roles: array<string, int>}
     */
    public function run(bool $dryRun = false, ?int $limit = null, int $chunk = 1000, ?callable $progress = null): array
    {
        // Members with no usable bcrypt hash get a random one nobody knows: the account exists, and
        // "Forgot password" is how they get in. Hashed once — bcrypt per row would take hours.
        $this->lockedPassword = Hash::make(Str::random(64));

        $this->loadLegacyAccounts();
        $this->chooseMemberPerEmail();

        $total = $limit ? min($limit, $this->legacy->table('members')->count()) : $this->legacy->table('members')->count();

        DB::beginTransaction();

        try {
            // Inside the transaction so a dry run leaves no new roles behind either.
            $this->ensureRoles();

            $this->legacy->table('members')
                ->select(self::MEMBER_COLUMNS)
                ->lazyById($chunk, 'id')
                // lazyById pages with its own LIMIT, so cap the stream rather than the query.
                ->take($limit ?? PHP_INT_MAX)
                ->chunk($chunk)
                ->each(function ($members) use ($progress, $total, $dryRun) {
                    $this->importChunk($members->all());

                    // Commit per chunk on a real run so a failure late on keeps the earlier work.
                    if (! $dryRun) {
                        DB::commit();
                        DB::beginTransaction();
                    }

                    if ($progress) {
                        $progress($this->stats['read'], $total);
                    }
                });

            $this->countSponsors();

            // Counted before the rollback so a dry run reports what a real run would produce.
            $roles = $this->roleCounts();

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $this->stats['rejected'] = count($this->rejects);

        return [
            'stats' => $this->stats,
            'rejects' => $this->rejects,
            'roles' => $roles,
        ];
    }

    private function loadLegacyAccounts(): void
    {
        $this->legacy->table('users')
            ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
            ->select('users.id', 'users.email', 'users.password', 'roles.role')
            ->orderBy('users.id')
            ->lazyById(5000, 'users.id', 'id')
            ->each(function ($account) {
                $email = $this->normaliseEmail($account->email);
                if ($email) {
                    $this->legacyAccounts[$email] = ['password' => $account->password, 'role' => $account->role];
                }
            });
    }

    // 194 emails are shared by several members; the most recently updated record represents the person.
    private function chooseMemberPerEmail(): void
    {
        $latest = [];

        $this->legacy->table('members')
            ->select('id', 'email', 'updated_at', 'created_at')
            ->orderBy('id')
            ->lazyById(5000, 'id')
            ->each(function ($m) use (&$latest) {
                $email = $this->normaliseEmail($m->email);
                if (! $email) {
                    return;
                }
                $stamp = (string) ($m->updated_at ?? $m->created_at ?? '');
                if (! isset($latest[$email]) || $stamp >= $latest[$email][1]) {
                    $latest[$email] = [(int) $m->id, $stamp];
                }
            });

        $this->chosenMember = array_map(fn ($pair) => $pair[0], $latest);
    }

    private function ensureRoles(): void
    {
        foreach ([...self::ROLE_MAP, self::GLOBAL_PARTNER_ROLE] as [$name, $label]) {
            $this->roleIds[$name] = Role::firstOrCreate(['name' => $name], ['label' => $label])->id;
        }
    }

    /**
     * @param  array<int, object>  $members
     */
    private function importChunk(array $members): void
    {
        $rows = [];

        foreach ($members as $m) {
            $this->stats['read']++;
            $row = $this->transform($m);
            if ($row) {
                $rows[$row['email']] = $row;
            }
        }

        if (! $rows) {
            return;
        }

        $existingUsers = DB::table('users')->whereIn('email', array_keys($rows))->pluck('id', 'email')->all();
        $now = now();

        // New accounts only; an email that already signs in to the portal keeps its account as-is.
        $newUsers = [];
        foreach ($rows as $email => $row) {
            if (isset($existingUsers[$email])) {
                $this->stats['existing_account']++;
                continue;
            }
            $newUsers[] = $row['user'] + ['created_at' => $row['created_at'] ?? $now, 'updated_at' => $now];
        }

        if ($newUsers) {
            DB::table('users')->insert($newUsers);
        }

        $userIds = DB::table('users')->whereIn('email', array_keys($rows))->pluck('id', 'email')->all();

        $roleRows = [];
        foreach ($rows as $email => $row) {
            if (! isset($existingUsers[$email])) {
                $roleRows[] = ['user_id' => $userIds[$email], 'role_id' => $this->roleIds[$row['role']]];
            }
        }
        if ($roleRows) {
            DB::table('role_user')->insertOrIgnore($roleRows);
        }

        // A portal user may already have an agent row (made from their profile page) under an
        // auto-increment id; move it onto their legacy member id so references line up.
        $ownAgents = DB::table('agents')->whereIn('user_id', array_values($userIds))->pluck('id', 'user_id')->all();
        foreach ($rows as $email => $row) {
            $current = $ownAgents[$userIds[$email]] ?? null;
            if ($current !== null && (int) $current !== $row['member_id'] && $this->renumberAgent((int) $current, $row['member_id'])) {
                $ownAgents[$userIds[$email]] = $row['member_id'];
            }
        }

        $idsTaken = DB::table('agents')->whereIn('id', array_column($rows, 'member_id'))->pluck('email', 'id')->all();

        $agentRows = [];
        foreach ($rows as $email => $row) {
            if (isset($ownAgents[$userIds[$email]])) {
                continue;
            }
            if (isset($idsTaken[$row['member_id']])) {
                $this->reject($row['member_id'], $email, 'agent id already used by another agent ('.$idsTaken[$row['member_id']].')');
                continue;
            }
            $agentRows[$email] = $row['agent'] + [
                'id' => $row['member_id'],
                'user_id' => $userIds[$email],
                'email' => $email,
                'created_at' => $row['created_at'] ?? $now,
                'updated_at' => $now,
            ];
        }

        if (! $agentRows) {
            return;
        }

        DB::table('agents')->insert(array_values($agentRows));

        $profiles = $credentials = $attributes = [];
        foreach ($agentRows as $email => $agent) {
            $row = $rows[$email];
            $agentId = $agent['id'];

            if (array_filter($row['profile'])) {
                $profiles[] = $row['profile'] + ['agent_id' => $agentId, 'created_at' => $now, 'updated_at' => $now];
            }
            if (array_filter($row['credentials'])) {
                $credentials[] = $row['credentials'] + ['agent_id' => $agentId, 'created_at' => $now, 'updated_at' => $now];
            }
            $attributes[] = $row['attributes'] + ['agent_id' => $agentId, 'created_at' => $now, 'updated_at' => $now];
            $this->stats['imported']++;
        }

        foreach ([['agent_profiles', $profiles], ['agent_credentials', $credentials], ['agent_attributes', $attributes]] as [$table, $data]) {
            if ($data) {
                DB::table($table)->insert($data);
            }
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function transform(object $m): ?array
    {
        $email = $this->normaliseEmail($m->email);

        if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->reject($m->id, (string) $m->email, 'missing or invalid email');
        }
        if (($this->chosenMember[$email] ?? null) !== (int) $m->id) {
            return $this->reject($m->id, $email, 'duplicate email; a newer member record with this email was imported');
        }

        $account = $this->legacyAccounts[$email] ?? null;
        $legacyRole = strtoupper(trim((string) ($account['role'] ?? '')))
            ?: (self::MEMBERTYPE_TO_ROLE[strtolower(trim((string) $m->membertype))] ?? 'AGENT');

        if (in_array($legacyRole, self::SKIPPED_ROLES, true)) {
            return $this->reject($m->id, $email, "legacy role {$legacyRole} is not an agent");
        }
        $role = (self::ROLE_MAP[$legacyRole] ?? self::ROLE_MAP['AGENT'])[0];
        // Plain agents selling from abroad get their own role; other roles stay (one role per user).
        $origin = LegacyAgentOrigin::of($m);
        if ($role === 'agent' && $origin['agent_type'] === Agent::TYPE_GLOBAL_PARTNER) {
            $role = self::GLOBAL_PARTNER_ROLE[0];
        }

        [$first, $middle, $last] = $this->names($m);
        $password = $this->bcryptFrom($account['password'] ?? null) ?? $this->bcryptFrom($m->hashpass) ?? $this->bcryptFrom($m->password);
        $this->stats[$password ? 'passwords_kept' : 'passwords_locked']++;

        $status = strtolower(trim((string) $m->status));
        $avatar = $this->photoUrl($m);
        if ($avatar) {
            $this->stats['photos']++;
        }

        $gender = $m->gender === null || $m->gender === '' ? null : ((int) $m->gender === 1);
        if ($gender === null) {
            $this->stats['gender_unknown']++;
        }

        $created = $this->date($m->created_at);

        return [
            'email' => $email,
            'member_id' => (int) $m->id,
            'role' => $role,
            'created_at' => $created,
            'credentials' => [
                'tax_identification_no' => ($tin = $this->clean($m->tin)) ? preg_replace('/\s+/', '', $tin) : null,
                'prc_expiration' => $this->expiry($m->prc_expiry),
                'dhsud_expiration' => $this->expiry($m->dshud_expiry),
            ],
            'user' => [
                'name' => trim("{$first} {$last}") ?: (trim((string) $m->completename) ?: Str::before($email, '@')),
                'email' => $email,
                'password' => $password ?? $this->lockedPassword,
                // Members the old system never gave a status (most never activated) start inactive.
                'status' => in_array($status, self::STATUSES, true) ? $status : User::STATUS_INACTIVE,
            ],
            'agent' => [
                'first_name' => $first,
                'middle_name' => $middle,
                'last_name' => $last,
                'state' => $this->clean($m->state),
                'city' => $this->clean($m->city),
                'address' => $this->clean($m->address),
                'phone' => $this->clean($m->phone),
                'mobile' => $this->clean($m->mobile),
                // Unknown gender keeps the column default; the column has no "unknown" value.
                'gender' => $gender ?? true,
                'avatar' => $avatar,
                'marital_status' => in_array(trim((string) $m->maritalstatus), self::MARITAL_STATUSES, true) ? trim($m->maritalstatus) : null,
                ...$origin,
                'area' => Areas::forAgent($this->clean($m->state), $this->clean($m->city), $origin['country_code']),
            ],
            'profile' => [
                'about' => $this->clean($m->aboutyourself, 255, true),
                'skills' => $this->clean($m->specialskills, 255, true),
                'work_experience' => $this->clean($m->workexperience, 255, true),
                'facebook' => $this->clean($m->fblink),
            ],
            'attributes' => [
                // Legacy members.inviterid as-is (the sponsor's member id = their agent id); 0 means none.
                'referral_id' => (int) $m->inviterid > 0 ? (int) $m->inviterid : null,
                'date_activated' => (int) $m->dateactivated > 0 ? Carbon::createFromTimestamp((int) $m->dateactivated)->toDateTimeString() : null,
                'nao_video_tracker' => (int) $m->nao_video_tracker,
                'nao_proof_of_attendance' => $this->clean($m->nao_proof_of_attendance),
                'nao_attendance_status' => $this->clean($m->nao_attendance_confirmation),
                'nao_date_of_attendance' => $this->date($m->nao_date_attended, 'Y-m-d'),
                'fire_certificates' => (int) $m->fire_certs_count,
                // Registration stepper (1–4); 4 = fully registered.
                'registration_status' => (int) $m->registration_status ?: null,
            ],
        ];
    }

    private function countSponsors(): void
    {
        $this->stats['sponsors_linked'] = DB::table('agent_attributes')->whereNotNull('referral_id')->count();
    }

    // Moves an agent row (and everything keyed to it) to a new id. Skipped if the target id is taken.
    // Copy → repoint children → delete keeps foreign keys satisfied at every step, so no checks are disabled.
    private function renumberAgent(int $from, int $to): bool
    {
        $agent = (array) DB::table('agents')->where('id', $from)->first();

        if (! $agent || DB::table('agents')->where('id', $to)->exists()) {
            return false;
        }

        // The email is unique, so free it on the old row before the copy takes it.
        DB::table('agents')->where('id', $from)->update(['email' => "renumbering-{$from}@invalid.local"]);
        DB::table('agents')->insert(['id' => $to] + $agent);

        foreach (self::AGENT_CHILD_TABLES as $table) {
            DB::table($table)->where('agent_id', $from)->update(['agent_id' => $to]);
        }
        DB::table('agent_attributes')->where('referral_id', $from)->update(['referral_id' => $to]);
        DB::table('agents')->where('id', $from)->delete();

        $this->stats['agents_renumbered']++;

        return true;
    }

    // Licence expiries are free text in the old system; keep real dates only (typos like year 0206 are dropped).
    private function expiry(mixed $value): ?string
    {
        $date = $this->date($value, 'Y-m-d');

        return $date && (int) substr($date, 0, 4) >= 1990 && (int) substr($date, 0, 4) <= 2100 ? $date : null;
    }

    /**
     * @return array{0: ?string, 1: ?string, 2: ?string}
     */
    private function names(object $m): array
    {
        $first = $this->clean($m->fn);
        $last = $this->clean($m->ln);

        // Older rows sometimes only have the full name.
        if (! $first && ! $last && trim((string) $m->completename) !== '') {
            $parts = preg_split('/\s+/', trim($m->completename));
            $last = count($parts) > 1 ? array_pop($parts) : null;
            $first = implode(' ', $parts);
        }

        return [$this->titleIfShouting($first), $this->titleIfShouting($this->clean($m->mn)), $this->titleIfShouting($last)];
    }

    private function photoUrl(object $m): ?string
    {
        $photo = trim((string) $m->photo);

        if ($photo === '') {
            return null;
        }
        if (Str::startsWith($photo, ['http://', 'https://'])) {
            return Str::limit($photo, 255, '');
        }

        return $m->memberid ? Str::limit(self::PHOTO_BASE_URL.$m->memberid.'/'.rawurlencode($photo), 255, '') : null;
    }

    private function bcryptFrom(?string $hash): ?string
    {
        return $hash && preg_match('/^\$2[aby]\$\d{2}\$.{53}$/', $hash) ? $hash : null;
    }

    private function clean(mixed $value, int $max = 255, bool $text = false): ?string
    {
        $value = trim(html_entity_decode(strip_tags((string) $value), ENT_QUOTES | ENT_HTML5));

        if ($value === '' || in_array(strtolower($value), ['0', 'null', 'n/a', 'na', '-', 'none'], true)) {
            return null;
        }

        if (mb_strlen($value) > $max) {
            // Existing columns are 255 characters; longer legacy text is cut, and counted in the report.
            if ($text) {
                $this->stats['text_truncated']++;
            }

            return mb_substr($value, 0, $max);
        }

        return $value;
    }

    private function titleIfShouting(?string $value): ?string
    {
        return $value !== null && $value === mb_strtoupper($value) && mb_strlen($value) > 2
            ? mb_convert_case(mb_strtolower($value), MB_CASE_TITLE)
            : $value;
    }

    private function date(mixed $value, string $format = 'Y-m-d H:i:s'): ?string
    {
        if (! $value || str_starts_with((string) $value, '0000')) {
            return null;
        }

        try {
            return Carbon::parse($value)->format($format);
        } catch (Throwable) {
            return null;
        }
    }

    private function normaliseEmail(mixed $email): ?string
    {
        $email = strtolower(trim((string) $email));

        return $email === '' ? null : $email;
    }

    private function reject(int|string $memberId, string $email, string $reason): null
    {
        $this->rejects[] = [$memberId, $email, $reason];

        return null;
    }

    /**
     * @return array<string, int>
     */
    private function roleCounts(): array
    {
        return DB::table('role_user')
            ->join('roles', 'roles.id', '=', 'role_user.role_id')
            ->whereIn('roles.name', array_column(self::ROLE_MAP, 0))
            ->groupBy('roles.label')
            ->selectRaw('roles.label, COUNT(*) as users')
            ->pluck('users', 'label')
            ->all();
    }
}
