---
title: SMS Manager
tags: [sms, semaphore]
---

# SMS Manager

Semaphore SMS: recipients picker, credits & requests, send job, Management section. Related: [[management]] · back to [[README|index]].

- **SMS Manager** (`/sms` Send SMS + `/sms/credits` Credits, `routes/sms.php`, `Portal\SmsController`, pages `Portal/Sms/{Index,Credits}` in
  `components/sms/SmsLayout` + `SmsNav`): a **Management section** for the back office (`managementCatalog` card / tab, `ManagementLayout`; its credit
  requests count on the Management badge; `TeamPolicy::open` lets `send_sms` open Management), and its own menu item `smsRoute` + page frame for
  members (team leaders, who have no Management): permission **`send_sms`** (route `can:send_sms`; migration `000057` → superadmin,
  team_leader) and **`manage_sms`** (superadmin: reviews credit requests, sends on the **company's Semaphore balance**, reaches everyone;
  section "SMS" in `Permission::SECTIONS`). **Semaphore** (`SemaphoreClient`, `services.semaphore` = `SEMAPHORE_API_KEY` + `SEMAPHORE_SENDER_NAME`
  (registered with Semaphore; empty = their default) + `SEMAPHORE_API_URL`; key server-side only): `POST messages` (form: apikey, comma-separated
  `number` ≤ 1000, message, sendername) → the accepted recipients; `GET account` → `credit_balance` (shown to managers, deferred prop `company`).
  Recipients are a **list of people** (`components/sms/RecipientPicker`): ticking a group (role; `SmsService::groups` counts active users with an
  `agents.mobile` per role — a manager nationwide, anyone else the current members of the teams / sub-teams they lead,
  `TeamLeadershipService::ledMemberIds`) loads its people (optional prop `members`, `?members_role=`, name + role + usable mobile) onto the
  list, where anyone can be removed; "Add a person" searches within reach (optional prop `peopleOptions`, `?people_q=`: name, email, mobile
  digits, member #). The send posts `people` (user ids, re-checked against reach: `SmsService::reachable`) + `groups` (for the record) and / or **typed-in numbers**
  (`App\Support\SmsText::numbers`, mirrored by `helpers/smsParts.ts`: commas / new lines / spaces, `mobile()` → `09XXXXXXXXX` from +63 / 63 / 9…
  forms; one send per number). **Credits**: 1 credit = 1 SMS part to 1 number (`SmsText::parts`: GSM 160 / 153 a part, Unicode 70 / 67; max
  `MAX_PARTS` 3). Non-managers pay from `sms_credit_ledger` (balance = sum; `purchase` / `send` / `refund`), bought by a **credit request** — credits +
  **proof of payment** only (no payment method; `SaleFileStorage` `sms-payments/`) → `sms_credit_requests` pending → a manager approves (may give fewer)
  or disapproves with a reason (`SmsCreditService`, `ReviewSmsCreditsRequest`). `SendSmsRequest::after` checks reach, numbers, parts and credits; the
  send is charged up front (user row locked), stored as `sms_blasts` + `sms_blast_recipients` (migration `000056`) and sent by the job
  `SendSmsBlast` — right after the response for ≤ 1000 numbers (no worker needed), else queued (`queue:listen` in `composer dev`) — (1000 a call, never retried — a retry could text people twice): refused numbers are marked failed and their credits returned;
  status queued / sending / sent / partial / failed. Shared `auth.sms_credits = {pending}` (managers only) → badge on the menu item and the Credits tab.
