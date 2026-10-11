# Legacy migration — `members` → users + agents

Source: `lr_legacy.members` (old leuteriorealty system, restored locally from a phpMyAdmin dump of the
RDS database, 11 Oct 2026). **83,309 rows, 92 columns.** Counts below come from profiling that copy;
no personal data is recorded here.

## Status: imported (11 Oct 2026)

Run with `php artisan legacy:import-members` (`--dry-run`, `--limit=N`; rejects are written to
`storage/app/private/legacy-import/`). Decisions taken, which **override §2–§4 below** (kept as the
original analysis):

- **No new columns.** Only columns that already exist in the new schema were filled; everything in
  §3 was dropped instead of added. `about` / `skills` / `work_experience` are cut at 255 characters
  (23,079 members had longer text).
- **Columns unused in recent data were dropped**: `addresstwo`, `latitude`/`longitude`, `tin_number`,
  `idnumber`, `date_activated_final`, `smscredit` (each ≤2.4% filled among members created since
  2024).
- **Roles come from legacy `users.role_id` → `roles.role`** (matched to the member by email): AGENT →
  Agent, UNIT MANAGER → Unit Manager, SUPERVISOR → Team Leader (the legacy supervisor is the team leader), SECRETARY → Secretary, ADMIN → Admin,
  BROKER → Broker. Members without a legacy account fall back to `membertype`. CLIENT is skipped.
  Superadmin is never granted by the import.
- **Passwords**: the legacy `users` bcrypt hash (or a bcrypt in `members`) is kept; others get a
  random password and must use "Forgot password".
- **Status**: legacy `status`; no status → `inactive`.
- **Photos**: bare filenames → `https://leuteriorealty.com/memberfiles/{memberid}/{file}` (verified).
- **Ids**: `agents.id` **is the legacy `members.id`** (17 … 218,237,598), so other legacy tables join
  on it directly. New portal agents continue from `AUTO_INCREMENT` 218,237,599. A portal user's
  pre-existing agent row is moved onto their member id (children follow).
- **Sponsor**: `agent_attributes.referral_id` = legacy `inviterid` **as-is** (82,842 agents), including
  inviters who weren't imported (881) and self-references (240); empty only when `inviterid` is 0.
- **Licences**: `prc_expiry` → `agent_credentials.prc_expiration` (1,716), `dshud_expiry` →
  `dhsud_expiration` (1,627); only real `YYYY-MM-DD` dates between 1990 and 2100 are kept.
- **Duplicates**: newest member record per email wins. Existing portal accounts are never overwritten.

Result: 82,907 imported · 3 existing accounts kept · 401 rejected (196 duplicate email, 172
invalid/missing email, 33 clients) · 67,654 passwords kept · 15,254 locked · 46,526 photos ·
81,721 sponsor links.

## 1. Where each member goes

One legacy member becomes:

| New table | What it holds | Key |
|---|---|---|
| `users` | sign-in account (name, email, password, status) | `legacy_member_id` *(new column)* |
| `role_user` | one role per user | — |
| `agents` | profile: names, contact, address, gender, photo | `legacy_id` *(new column)*, `user_id` |
| `agent_profiles` | about, skills, experience, social links | `agent_id` |
| `agent_credentials` | TIN, PRC/DHSUD numbers and expiries | `agent_id` |
| `agent_attributes` | sponsor, activation date, NAO/FIRE progress, SMS credits | `agent_id` |

Re-running the import updates by legacy id, so it never duplicates.

## 2. Column mapping

Legend: **→** copy (with the noted clean-up) · **⇢** needs a decision (§4) · **✕** not imported

### Identity & account
| Legacy column | Goes to | Notes |
|---|---|---|
| `id` | `users.legacy_member_id`, `agents.legacy_id` | primary link; also how sales/teams find the agent later |
| `fn`, `mn`, `ln` | `agents.first_name / middle_name / last_name` | trimmed; title-cased only if all-caps |
| `completename` | `users.name` | fallback `fn + ln` when empty |
| `email` | `users.email`, `agents.email` | lower-cased, trimmed. 3 empty, **110 malformed**, **194 shared by 2+ members** ⇢ Q4 |
| `emailad` | fallback for `email` | never needed in profiling (0 rows rely on it) |
| `secondary_email` | ⇢ | no column yet — Q9 |
| `username` | ✕ | new portal signs in by email (23,318 rows have one) |
| `hashpass`, `password` | `users.password` | **5,347 bcrypt** → copied as-is. **17,960 + 658 are a 65-char hex hash** (unknown scheme) ⇢ Q1. 45 md5 ⇢ Q1 |
| `password2` | ✕ | 1 row |
| `status` | `users.status` | active 19,309 · inactive 8,768 · resigned 338 · terminated 6 · **NULL 54,886** ⇢ Q2 · junk (`1`, `status`) → inactive |
| `membertype` | role (`role_user`) | agent 22,850 · broker 275 · secretary 46 · supervisor 28 · admin 11 · **superadmin 8** · resigned 2 · NULL/blank 60,089 ⇢ Q3 |
| `level`, `featured` | ✕ | always NULL/blank |
| `registration_status`, `activation_status` | used only to decide status ⇢ Q2 | |

### Profile & contact (`agents`)
| Legacy column | Goes to | Notes |
|---|---|---|
| `gender` | `agents.gender` | 1 = 40,493 · 0 = 24,495 · NULL = 18,321. Assumed **1 = male** ⇢ Q5 |
| `birthday` | `agents.birthdate` *(new column)* | three formats: `YYYY-MM-DD` (45,725), `Month DD, YYYY` (16,021), `MM/DD/YYYY` (2,395); unparseable → NULL |
| `maritalstatus` | `agents.marital_status` | Single/Married/Separated; `0`/blank → NULL |
| `title` | ✕ | Mr./Ms./Mrs. — derivable from gender/marital status |
| `phone`, `mobile` | `agents.phone`, `agents.mobile` | trimmed |
| `fax` | ✕ | |
| `address` + `addresstwo` | `agents.address` | joined with ", " |
| `city`, `state` | `agents.city`, `agents.state` | |
| `zipcode`, `country` | `agents.zip_code`, `agents.country` *(new columns)* | |
| `latitude`, `longitude` | `agents.latitude / longitude` | text → number; invalid → NULL |
| `photo` | `agents.avatar` | **8,114 full URLs** copied; **38,560 bare filenames** need the old base URL ⇢ Q6 |
| `national_intern` | `agents.market` *(new column)* | national 74,576 · international 6,566 (typos `internation…` normalised) — drives Local vs Global referral |
| `office` | ⇢ | 54 rows — Q9 |

### About & social (`agent_profiles`)
| Legacy column | Goes to | Notes |
|---|---|---|
| `aboutyourself` | `about` | **column must widen to TEXT** (legacy is TEXT, new is 255) |
| `specialskills` | `skills` | widen to TEXT |
| `workexperience` | `work_experience` | widen to TEXT |
| `fblink` | `facebook` | |
| `website` | ⇢ | no column — Q9 |

### Credentials (`agent_credentials`)
| Legacy column | Goes to | Notes |
|---|---|---|
| `tin_number` (fallback `tin`) | `tax_identification_no` | `tin` filled for 33,463 |
| `tin_name` | ✕ | name on TIN — same person |
| `prc` | `prc_number` *(new column)* | 1,673 filled |
| `prc_expiry` | `prc_expiration` | `YYYY-MM-DD` in 1,722 rows |
| `hlurb` | `dhsud_number` *(new column)* | HLURB is DHSUD's old name |
| `dshud_expiry` | `dhsud_expiration` | |
| `bdoaccountname`, `bdoaccount` | ⇢ | bank details — Q8 |

### Attributes (`agent_attributes`)
| Legacy column | Goes to | Notes |
|---|---|---|
| `inviterid` | `sponsor_agent_id` *(new column, resolved in a 2nd pass)* | 83,242 set; **82,818 point to an existing member** — the sponsor tree |
| `idnumber` | `referral_id` ⇢ Q7 | 14,361 distinct values |
| `dateactivated` (unix) / `date_activated_final` | `date_activated` | prefer `date_activated_final`, else convert the timestamp |
| `nao_video_tracker`, `nao_proof_of_attendance`, `nao_attendance_confirmation`, `nao_date_attended` | `nao_*` columns | |
| `fire_certs_count` | `fire_certificates` | |
| `smscredit` | `sms_credits` | |
| `lr_joined` / `datesign` | `users.created_at` | `datesign` is `MM/DD/YYYY` (64,963 rows) |

### Not imported
`referrer_url`, `memberid`, `monitor`, `orderby`, `invitor_contact`, `referencecontact`, `jobdesc`,
`salestarget`, `degree`, `institution`, `citizenship`, `files`, `acc`, `certificateSent`,
`ipaddress`, `activationForm`, `reactivationForm`, `sales_date_activated`, `remarks`,
`sponsor_activation_status`, `inter_signed_contract`, `nao_attendance_description`, `jsonContacts`,
`activatedby`, `sec_fullname`, `sec_email`, `sec_contact`, `sec_facebook`, `updated_at`.
Any of these can be added back — say which (Q9).

## 3. Schema changes the import needs

- `users.legacy_member_id` (unique, nullable)
- `agents`: `legacy_id` (unique), `birthdate`, `zip_code`, `country`, `market`
- `agent_profiles.about / skills / work_experience` → TEXT
- `agent_credentials`: `prc_number`, `dhsud_number`
- `agent_attributes.sponsor_agent_id` (nullable FK to `agents`)
- `agents.email` is UNIQUE today — duplicates need Q4 answered first

## 4. Questions for you

1. **Passwords (most important).** 17,960 members have a 65-character hex hash we can't verify yet.
   Please share the old system's **login/password-check code** (the function that compares the
   typed password with `hashpass`/`password`). With it, members keep their passwords: the portal
   checks the old hash once at sign-in and upgrades it to bcrypt. Without it, those members must use
   "Forgot password". *(5,347 bcrypt passwords work as-is.)*
2. **Members with no status (54,886).** They mostly have no activation either — likely abandoned
   sign-ups. Import them as `inactive`, or **skip them entirely** (recommended unless sales or teams
   reference them)?
3. **Roles.** Map `agent`/NULL → Agent, `broker` → Broker, `supervisor` → Unit Manager?,
   `secretary` → Secretary, `admin` → Admin. The **8 legacy `superadmin`** accounts: import as
   Superadmin, or as Agent and promote manually (recommended — Superadmin can change everyone's role)?
4. **Duplicate emails (194 groups).** Email must be unique. Keep the most recently active member
   and record the others in the rejects report, or import the others without sign-in access?
5. **Gender:** confirm `1` = male, `0` = female.
6. **Photos:** what URL prefix turns a bare filename like `abc123.jpg` into a working link?
   Copy photos into your S3 bucket, or keep pointing at the old server?
7. **Referral number:** is the `?ref=` number in referral links the member's `idnumber`, `memberid`,
   or `id`?
8. **Bank details** (`bdoaccountname`, `bdoaccount`): import them (they'd need encryption at rest),
   or leave them out?
9. Any of these worth keeping: `secondary_email`, `website`, `office`, secretary info (`sec_*`),
   `degree`/`institution`, `remarks`?

## Agent type (local / global partner) and country

- `agents.country` / `country_code` come from legacy `members.country`, normalised by `App\Support\Countries`
  (canonical names from `config/countries.php`, the same list as the UI's country picker): every spelling of
  the Philippines ("phillipines", "Phils.", "Pilipinas", "Manila, Philippines", "Cebu"…) → Philippines / PH;
  "United States of America" → United States / US, "HongKong" → Hong Kong / HK, "Dubai UAE" → AE; placeholders
  ("0", "N/A", "none") → empty. 64,657 agents have a code; ~10 rare names keep their text without a code.
- `agents.agent_type` is **global_partner** only when all three hold (`Agent::typeFromLegacy`):
  1. `national_intern` is "international" (or a typo of it);
  2. joined on/after **2024-02-01** — `lr_joined`, else the member's `created_at`;
  3. a recorded country other than the Philippines (blank country → local).
  Everyone else is **local**. Result: 4,054 global partners, 78,854 local agents.
- Role: plain agents who are global partners have the **Global Partner** role; global partners who no longer
  qualified went back to **Agent** (2,469). Other roles are never changed.
- New member imports apply this directly (`LegacyAgentOrigin`); `php artisan legacy:import-agent-types`
  (`--dry-run`) re-applies it to existing agents and re-syncs the role. Changeable afterwards in Management ›
  Agents (Type column).
