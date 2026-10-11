# Legacy migration — `salesreport` → sales

Source: `lr_legacy.salesreport` (191,554 rows). Run with `php artisan legacy:import-sales`
(`--dry-run`, `--limit=N`) **after** `legacy:import-members`. Imported 11 Oct 2026.

## Category

Taken from the sale's legacy developer row (`salesreport.devid` → `developers.isbroker`):

| `isbroker` | Category | New table | Sales |
|---|---|---|---|
| 0 (or no developer) | project | `agent_project_transactions` | 138,853 |
| 3 (the "Rental" developer, id 651) | rental | `agent_rental_transactions` | 37,344 |
| 1 (brokerage offices) | brokerage | `agent_brokerage_transactions` | 15,304 |

The 20 legacy brokerage "developers" (Cebu Brokerage, …) are imported into **`brokerage_areas`**
with their legacy ids; they are not developers. Rentals carry no developer
(`agent_rental_transactions.developer_project_id` is now nullable).

## Ids and links

- `agent_transactions.id` = `salesreport.id` (6 … 194,946); new sales continue at 194,947.
- `agent_id` = `salesreport.agentid` → `members.memberid` → `members.id` (= `agents.id`).
  189,268 linked; 2,233 point to members that weren't imported → `agent_id` empty.
  `recorded_by` is empty for legacy sales.
- `developer_id` = `devid`, `developer_project_id` = `projid`, `project_property_type_id` =
  `prop_type_id` — all already share legacy ids in the new database (kept only when they exist).

## Columns

| Legacy | New |
|---|---|
| `unitnum`, `termofpayment`, `remarks` | `agent_transactions.unit_number / term_of_payment / remarks` |
| `status` | `commission_status`: Unclaimed · Partially Claimed (`Partial…`) · Fully Claimed (`Full Claimed`, `claimed`, `Claim`) |
| `status` = Cancelled, else `validSale` Yes/No/blank | `sale_status`: `cancelled` · `valid` · `invalid` · `pending` |
| `dateadded` (MM/DD/YYYY), `dateupdated` | `created_at`, `updated_at` |
| `name`, `clientfamilyname`, `clientEmail`, `clientMobile`, `clientGender`, `clientCountry`, `clientAddress` | `agent_transaction_details` |
| `reservationdate`, `tcprice`, `prop_type_id` | each category table's `reservation_date`, `total_contract_price`, `project_property_type_id` |
| `files` | project `proof_of_transaction`; **rental and brokerage `remittance_slip`** (their proof). Full URL; relative `proofoftrans/…` → `https://leuteriorealty.com/…` |
| `projectname` / `projid` | project only: `project_name`, `developer_project_id` |
| `rental_deposit_slip` | rental `deposit_slip` |
| `logs` (JSON array of `{user, updated_at, description, details, file?, status?, …}`) | `agent_transactions.update_logs`, copied as-is (78,669 sales) |

**`prop_details` JSON → columns by category**

| Key | Project | Rental | Brokerage |
|---|---|---|---|
| `unit_type`, `floor_area`, `lot_area` | existing columns | new columns | new columns |
| `rental_rate`, `closing_agent`, `partner_agent`, `property_size` | — | new columns | — |

Not imported (≤3% filled, nothing recent): `compercent`, `statement_of_account`, `bir_form_2307`,
`requirements`, `client_requirements`, `partialclaimed`, `broker_com`, `request_file`,
`agentuploadpot`, `comm_requested`. Also skipped: `clientAge` and `qty` (no matching column), and
the 53 sales marked `deleted`.

## Checks after import

- Total contract value matches the legacy database exactly (₱445,562,471,675).
- Every linked `agent_id` equals the legacy `agentid → memberid → id` chain.
- Some older `proofoftrans/…` files no longer exist on the old server (404); the link is kept.

## Cutoff dates

`sales_cutoff_dates` (month_year → date) → `sales_cutoffs` (`month`, `cutoff_at`), via
`php artisan legacy:import-sales-cutoffs`. The time of day is legacy `settings.cut_off_time`
(5:00 PM). 21 months imported (2025-01 … 2026-09). The older `sales_cutoff` table (2018, day only)
and the empty `sales_report_cutoffs` are not used. Leaderboards count a sale for a month when it
was reserved in that month and encoded by the month's cutoff.

## Sales before 4 Jan 2017

Sales reserved before **2017-01-04** were never reviewed in the old system. A blank or null
`validSale` counts as **valid**; `No` stays invalid and cancelled stays cancelled. Applied to the
imported data by migration `2026_10_11_000010_validate_pre_2017_unreviewed_sales` (18,172 pending →
valid) and by `LegacySalesImporter` on any re-import. Sales with no reservation date are unchanged.
