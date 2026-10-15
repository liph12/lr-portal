---
title: Registration, onboarding & NAO
tags: [onboarding, nao]
---

# Registration, onboarding & NAO

Become a Salesperson / Global Partner sign-up, /welcome steps, NAO + NAO approvals, the journey page. Related: [[fire]] · [[profile]] · back to [[README|index]].

- **Agent registration** (guests; `RegistrationController`, `RegistrationService`, `Requests/Auth/*`) — **"Become a Salesperson"**,
  or with `&type=international` **"Become a Global Partner"** (same steps + a required country outside PH; creates agent_type
  `global_partner`, role `global_partner`, branch `abroad`, sponsor not yet confirmed — it shows as pending in Global Partners;
  `type` kept in the session; dashboard Global Referral = the same link + `&type=international`): from a sponsor's referral
  link `/register?ref={code}` — `agents.referral_code`, 8 random characters made on first use (`Agent::referralCode`), **not** the agent
  id, so counting through ids can't list every agent on the public page (migration `000050`). Shared as `auth.referral_url`
  (Dashboard › Local Referral card, /profile, the agent's profile page; built from `APP_URL`). The
  page shows the sponsor (`SponsorCard`: branch, the team / sub-team they'll join); the visitor ticks "this is my sponsor /
  upline", gives an email (unique) → a **6-digit code** by email (`RegistrationCodeMail`, cached hashed 10 min, 5 tries, resend
  after 60 s, `throttle` on the routes) → `/register/details`: one `useForm` stepper — 1 Basic info, 2 Contact, 3 Address, 4 About
  (education / professions / hobbies from `helpers/registrationOptions.ts` via `StyledMultiAutocomplete`, skills…), 5 Password.
  Creates a **fully registered (4) agent** — local with role `agent`, or a global partner — `referral_id` = sponsor, on the sponsor's team and sub-team
  from today (`AgentUplineService::placementOf`), then signs them in. Progress lives in the session (`registration` = ref, email,
  verified), never in the page. New columns: `agents.birthdate / citizenship / barangay / postal_code`,
  `agent_profiles.education / professions / hobbies` (JSON) — migration `000049`. Mail goes out through `MAIL_MAILER`, or the older `MAIL_DRIVER`
  this project's `.env` uses (`config/mail.php`; port 465 → SSL automatically); without either it's `log`.
- **Onboarding** (new local agents; `OnboardingService`, `RedirectToOnboarding` = route middleware `onboarding` on
  `/dashboard/main` only, `Portal\OnboardingController`, `routes/onboarding.php`, pages `Portal/Onboarding/*` in
  `layouts/OnboardingShell`): a **local, non-back-office agent, fully registered (4), NAO 0, FIRE 0, with no sale at all** (local
  any status, or international) lands on the step they're on (`OnboardingService::nextUrl`) until they finish the steps built so
  far — `OnboardingService::STEPS` (`photo`, `nao`; FIRE comes next), stored as `agents.onboarding_step` (migration `000051`);
  once started they stay in it even though watching raises their NAO %. Welcome (the old
  leuteriorealty.com/welcome copy beside its NATCON 2025 / 2024 / 2023 slideshow, with the Rent.ph / Leuterio Realty / Filipino Homes
  white logos fading in turn over a `--lr-photo-scrim`; no founder; `resources/assets/onboarding/*`; still under reduced motion) → Get Started → `/welcome/photo`
  (`ProfilePhotoCard`, so the photo is cropped; Continue = `POST /welcome/photo`, needs `agents.avatar`) → **`/welcome/nao`**
  (`Pages/Portal/Onboarding/Nao`, `NaoService`, prop `nao`): attended a face-to-face NAO? **Yes** → proof (photo / selfie /
  screenshot, `UploadPOTForm`, stored by `SaleFileStorage` under `nao-proofs/`) + date (`POST …/nao/attendance`,
  `StoreNaoAttendanceRequest`) → `agent_attributes.nao_attendance_status = yes` (the legacy value: a proof was sent) +
  `nao_attendance_submitted_at`, step done, and the page shows the sponsor (`referral_id`) with mobile + email to ask for approval.
  **Status values are legacy's — never add new ones**: `yes` = proof sent (waiting until `nao_attendance_reviewed_at` is set,
  then approved, which sets `nao_video_tracker` 100 so statistics read it as finished), `disapproved`; the webinar leaves it
  **NULL** and only moves the %. The page's view comes from `NaoService::state()['stage']` (choose / awaiting / disapproved / webinar /
  done; "chose the webinar" = `nao_video_saved_at` set).
  **NAO Approvals** (`/nao-approvals`, every role, `routes/nao-approvals.php`, `Portal\NaoApprovalController`,
  `NaoApprovalService`, page `Portal/NaoApprovals/Index`): every `yes` / `disapproved` row — sent from onboarding or imported
  from legacy (no `nao_attendance_submitted_at`), newest NAO date first. Filters (in the URL): status tabs, search (any row detail: name, email, mobile by digits, member #, sponsor, current team /
  sub-team, branch name), `team_id`,
  `sub_team_id` (labelled by unit manager) — choices from the agents in reach (`groupOptions`, cached) — and `person` (an agent,
  or everyone they sponsored; typeahead = optional prop `personOptions` via a partial reload with `?person_q=`, within reach;
  `components/utils/tables/FilterAutocomplete` = FilterSelect's searchable sibling). Reach from the data (`reach`): back office nationwide; anyone else = their recruits + current members of the
  teams / sub-teams they lead + an office secretary's branch areas, never their own; nobody → 403. Waiting / approved /
  disapproved = `yes` below 100% and unreviewed / `yes` reviewed or at 100% (how legacy recorded approval) / `disapproved`
  (`STATUS_SQL`). Approve (confirm) → reviewed +
  `nao_video_tracker` 100; disapprove needs a reason (`nao_attendance_remarks`, shown to the agent) and puts them back on the NAO
  step; `nao_attendance_reviewed_by/_at` (migration `000053`, `ReviewNaoAttendanceRequest` checks the reach). Shared
  `auth.nao_approvals = {pending}` (null = nobody) → menu pseudo-grant `_nao_approver` + the item's badge. **No** (`POST …/nao/webinar`, status stays NULL) → the New Agents Webinar (`config/nao.php`: YouTube id + its
  length in seconds, which decides the % server-side) in `components/onboarding/WebinarPlayer` — YouTube IFrame API, no YouTube
  controls, our play / back 10 s / mute / full screen; a jump past the furthest point watched is sent back. Progress
  (`nao_video_seconds` = furthest point, resumes there; `nao_video_tracker` = %) saves every 30 s, on pause / end, by "Save
  progress", and on leaving (a `keepalive` fetch → 204 — the one non-Inertia write here) via `PUT …/nao/progress`; a save may move
  at most the time since the last one (≤ 2 min) + 20 s ahead (`nao_video_saved_at`, migration `000052`); 100% finishes the step.
  That route is in `data_cache.ignore_paths` and `activity_log.except_paths` (it fires every 30 s). "Skip for now"
  (`POST /welcome/skip`) stops the redirect for the session; never while impersonating.
- **Onboarding journey** (`/my-journey` for oneself, `/agents/{agent}/journey` for whoever may open that profile —
  `AgentProfileController::myJourney/journey`, `AgentJourneyService`, page `Portal/Agents/Journey` — a focused page in
  `layouts/OnboardingShell` (no sidebar / menus / banners; `exit` = back to the dashboard, or to the profile it was opened from)): a time-of-day greeting with the agent's photo (no role: it's about
  their journey), "x / 5 milestones", a horizontal journey bar (vertical on phones) and **one invitation card for the next step** — FIRE with
  its logo, "modules passed x of 3" and Start / Continue FIRE once the NAO is done; photo / NAO / activation otherwise. Milestones — Registered (`lr_joined_at`, else `created_at`) → Profile photo
  (first `profile.photo_updated` log) → NAO (approved: `nao_attendance_reviewed_at` + who; webinar: `nao.webinar_finished` log; `yes`
  unreviewed = waiting) → FIRE (`fire_certificates` of 3; "Take FIRE" under the headline and "Start / Continue FIRE training" on the card → `/fire`, on one's own journey) → Activation. The
  first unfinished one is "Next up"; dates come from the data and readable activity-log entries whose subject is the agent.
  **Activation** (milestone `activation`, done = the first sale): the LR account is activated with the first sale, so until a sale exists its card explains it
  and uploads a **request for activation** + the sale's **proof of transaction** (+ optional notes) — `components/onboarding/ActivationRequestForm`,
  `POST /my-journey/activation-request` (`StoreActivationRequestRequest`, `ActivationRequestController`, `ActivationRequestService`,
  files via `SaleFileStorage` under `activation-requests/`, logged `agent.activation_requested`) → `activation_requests` (migration
  `000055`, one row per submission, the newest counts; legacy kept it as `members.activationForm`). Sent → the step is "waiting"
  (files shown, "Send again"); others opening the journey see the files; once done, an "account is active" card. Nobody reviews them in the app yet. The certificates list
  always shows Rent.ph's Rent Manager on one's own journey — a download once passed, else a link to its exam (`/fire/12`). Linked
  from the finished NAO screen, the profile menu ("My journey") and the profile page ("Journey").
