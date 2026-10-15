---
title: Sales recording
tags: [sales, recording]
---

# Sales recording

Recording project / rental / brokerage sales, commission slips & receiving, cutoffs, international sales. Related: [[sales-validation]] · [[reports]] · [[legacy-data]] · back to [[README|index]].

- **Recording sales** — A project sale has exactly
  **one** `proof_of_transaction` (`ProjectSaleService`). A **rental** (`RentalSaleService`, no developer) is **encoded from the
  Rent.ph Rent Commission Report Slip**: address (`unit_number`), property type, `property_size`, `rental_rate`, duration
  (`duration_value` + `duration_unit` days / months / years, also written as `term_of_payment`), remittance date (stored as both
  dates), amount received → `total_contract_price` = amount / 8.3% (`AgentRentalTransaction::COMMISSION_RATE`); **Rent.ph's 20%
  share is never stored** (worked out: `RentalSaleService::amounts`, `helpers/commissionSlip.ts`); closing agent (required) and
  partner agent by name **and id** — the team and unit manager are **looked up** from the closing agent
  (`RentalSaleService::teamOf`), never stored. A closing agent **with no LR account** is typed in ("Not yet in LR": name,
  email required, mobile) → `closing_agent` + `unregistered_agent_email` / `_mobile` (last 10 digits), `closing_agent_id` and the
  sale's `agent_id` null (credited to them); `UnregisteredAgentLinker` links it when an agent with that email or mobile is created
  (`Agent::created`), or via `php artisan rentals:link-unregistered-agents` after imports; uploads contract, proof of transaction, deposit slip; a Rent.ph-branded slip is
  generated (preview `POST …/rental/slip-preview`). Agents are picked by id via `GET /search/agents` (the second sanctioned
  typeahead endpoint). A brokerage sale (`BrokerageSaleService`) belongs to an active
  `brokerage_areas` row instead of a developer and is **encoded from the Brokerage Commission Report Slip**: the commission
  received (5% fixed, `AgentBrokerageTransaction::COMMISSION_RATE`) gives `total_contract_price` = commission / 5%; the company
  share is 15% or 10% (`COMPANY_SHARE_RATES` → `company_share_rate`, `company_share`); closing / partner agents (by name),
  `signing_broker_id` (an agent with `is_broker`); the **remittance date** is stored as both `remittance_date` and
  `reservation_date` (cutoffs, reports); uploads `contract`, `proof_of_transaction` (photo with the client), `deposit_slip`
  (optional) via `forms/SaleDocumentsForm.tsx` (shared with rental). The **commission slip is generated** (`CommissionSlipImage` with a `brokerage` / `rental` layout, GD + Roboto in
  `resources/fonts/`, stored as `remittance_slip` PNG) with the property owner's name — which is **never stored** (not a
  column, redacted in `config/activity_log.php`, kept out of flashed input in `bootstrap/app.php`). **Preview** before saving:
  `POST /dashboard/record-sale/brokerage/slip-preview` (`PreviewBrokerageSlipRequest`, everything optional) returns the same PNG,
  never stored — `components/sales/CommissionSlipPreview.tsx` (fetch → blob, steps 2–3; rental has its own endpoint). Brokerage and rental slip sales stay pending until
  someone **signs for them** — **separately**: **Brokerage receiving** (`/brokerage-receiving`, `receive_brokerage_sales`) and
  **Rental receiving** (`/rental-receiving`, `receive_rental_sales`) — **back office only** (superadmin / admin / staff; secretaries
  never, migration `000044` took their grants). Filters like Sales validation: remittance dates (default this month; the badges
  count this month), area, and Awaiting / Received / Disapproved. Actions in `CommissionReceiptService` (`CommissionReceiptPanel`):
  **receive** (signature + `received_on`, any past date), **change the received date** later (`PATCH …/received-date`, the slip is
  re-signed: `stampReceived` clears the stub first), **disapprove** a waiting one (`POST …/disapprove`, reason required →
  `disapproved_by/_at`, `disapproval_reason`, sale invalid, red stamp). One route file `routes/commission-receiving.php` registers
  both (the route's `category` default fixes each page), one `CommissionReceivingController` / `CommissionReceivingService` /
  page `Portal/CommissionReceiving/Index` (prop `category`; Awaiting / Received; area reach as Sales validation; a sale only
  opens / is received from its own category's page). Both are Management cards / tabs (`managementCatalog`); the Management menu badge and the cards
  count `auth.commission_receiving.{brokerage,rental}`. The drawer shows the slip and files and a `forms/SignaturePad.tsx` (canvas →
  PNG data URL, `--lr-paper-*` tokens stay light in dark mode); `POST /{brokerage,rental}-receiving/{sale}/receive`
  (`ReceiveCommissionRequest`: a real, non-blank PNG, not already received) stores the signature (`received_signature`),
  sets `received_by` / `received_at`, validates the sale and signs the slip in place (signature + name + date, green
  "Received" pill). Sales validation / report details show the state via `CommissionReceipt` (links to the receiving page).
  Legacy brokerage and rental sales (no `commission_rate`) keep their uploaded remittance slip. Steppers use `hooks/useSaleSteps.ts`
  (never blocks navigation — leaving a step only flags its missing fields; submit checks all). Shared sale rules live in `Requests/Portal/Sales/SaleRequest.php`;
  the shared sale row + client details in `Services/SaleRecord.php`. **Measurements follow the
  property type** (`ProjectPropertyType::WITH_*`, mirrored in `helpers/projectSaleFields.ts`): condo →
  unit type + floor area, house & lot / townhouse → floor + lot area, lot only → lot area; required
  when shown, nulled otherwise; UI via `forms/PropertyMeasurementFields.tsx`. Tests use `Storage::fake('s3')`.
- **Sales cutoff & recording switch** (Settings › Sales cutoff, superadmin only; `SalesCutoffController`,
  `SalesEncodingService`, `SalesCutoffPolicy`): monthly `sales_cutoffs` (month `YYYY-MM` → `cutoff_at`) and an
  on/off switch in `app_settings` (`sales_encoding`). Enforced for **every role** in `SaleRequest::after()`:
  recording off → `sales_encoding` error; a reservation month is closed from its own cutoff, or — if it has
  none — once any later month's cutoff has passed (`closedBy`, mirrored in `helpers/salesCutoff.ts` for the
  form warning). Record pages receive `encoding` + `cutoffs`; `SalesEncodingNotice` shows the switch state.
  App timezone is **Asia/Manila** (`APP_TIMEZONE`): cutoffs and legacy dates are Philippine local time.
- **International sales** (global partners): `international_sales` + 1:1 `international_sale_clients`
  (separate from `agent_transactions`), recorded at `/dashboard/record-sale/international`
  (`StoreInternationalSaleRequest` extends `SaleRequest`, so cutoffs/switch apply; `InternationalSaleService`;
  `InternationalSalePolicy` → `record_international_sales`, granted to role `global_partner`). Menu
  `permission` may be a list of alternatives (`helpers/permissions.ts`). **Every shared statistic is local only**
  (sales report, overview, Reports, leaderboards, `/superadmin/statistics`, Recruits, Recruits Progress): international
  sales and global-partner agents are excluded (`Agent::withoutGlobalPartners`, `agent_type = local`) — global partners
  will get statistics of their own (they take no NAO / FIRE).
  Legacy: `legacy:import-international-sales`, see `docs/legacy-migration/international-sales.md`.
