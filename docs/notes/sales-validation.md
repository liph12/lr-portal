---
title: Sales validation
tags: [sales, validation]
---

# Sales validation

Validating sales by area / category, status changes, sale review drawer. Related: [[sales-recording]] · [[people-and-reach]] · back to [[README|index]].

- **Sales validation** (`/{superadmin,admin,staff}/sales-validation`, routes from `routes/sales-validation.php` per portal,
  `can:sales_validation`; `SalesValidationController`, `SaleValidationService`): everything is within a reservation-date
  range (`from`/`to`, default this month — first day to today; joined from the three category tables). Pick an area (the credited agent's
  `agents.area`, else the recorder's; plus All areas — Abroad and no-area aren't offered) → a category (project / brokerage / rental, counts as status-coloured `StatusChip`s: amber pending, green valid, red
  invalid, grey cancelled) — or **All sales** (`category=all`, `SaleValidationService::ALL_CATEGORIES`: the three tables as one
  `UNION ALL` (`allCategories`, date-limited per branch), `counts.all`, a Type column and each row's own property / files by `sale_type`)
  → a server-paged table per status (pending, valid, invalid, cancelled) with client, agent, project + developer /
  brokerage area / closing agent, unit, price, reserved, date added and the files (POT; remittance + deposit slips).
  **Every status change is confirmed first** (`components/sales/saleStatusConfirm.ts`: what each status does; `StatusMenu` `confirm`
  + `safe` for the primary-toned ones; `SaleDetailsForm` asks when its status changed; the slip panel's "Sign & receive" asks too).
  Status via `StatusMenu` → `ValidateSaleRequest`; `setStatus` stores `validated_by` / `validated_at`, appends to
  `update_logs`, logs `sale.validate` and refreshes the agent's activity.
  Menu **badge** = pending sales the user can validate **this month** — the range the page opens on, so it equals the "All
  areas" card (back office) or the secretary's area card (`SaleValidationService::pendingCount`, `auth.sales_validation`).
  Clicking an agent opens `AgentSalesPanel` (`?agent=ID`, partial reload of `agentSales`, `agent_dates=all` for every date):
  their sales client first in Project / Brokerage / Rental tabs (newest 100 each), with status chips and `StatusMenu`.
  Clicking a sale (table row → right drawer; agent panel card → expands in place) loads `saleDetail` (`?sale=ID`,
  `SaleValidationService::detail`: agent, client, property, payment, files, history) into `components/sales/SaleReview.tsx`:
  a colour-coded **status banner** (icon + label + who / when) with **validation buttons** (Validate / Mark invalid / Cancel sale /
  Back to pending, each confirmed, `PATCH`), then the details **read-only** (`SaleDetailsView`) until "Edit details" opens
  `SaleDetailsForm` — which **never sets the status** (validating and editing are separate): `PUT …/sales-validation/{sale}` (`UpdateValidatedSaleRequest`, keys = column names, `status` optional and only applied if sent, fields by
  category, measurements optional but cleared when the property type doesn't use them) → `SaleValidationService::update`
  (`EDITABLE` map) writes one `update_logs` line listing every change, logs `sale.edit`, recomputes `client_age` from a new
  birthdate. Pickers: `editOptions` prop. Controls inside a row stop the click (`stop`).
