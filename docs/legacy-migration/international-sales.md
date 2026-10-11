# Legacy migration — `international_sales_report` → international sales

Global partners' sales. Source: `lr_legacy.international_sales_report` (672 rows, ids 7–681). Run with
`php artisan legacy:import-international-sales` (`--dry-run`) **after** `legacy:import-members`.
Imported 11 Oct 2026: 672 sales, all linked to an agent; total contract value ₱2,901,474,324.28
(matches legacy).

## Tables (2nd normal form)

- `international_sales` — the sale: `id` = legacy id (new sales continue at 682), `agent_id`,
  `recorded_by`, `project_property_type_id`, `unit_number`, `unit_quantity`, `unit_type` / `floor_area` /
  `lot_area` (by property type, like the other sales), `total_contract_price`, `reservation_date`,
  `proof_of_transaction` (full URL), `sale_status`, `remarks`, `update_logs`.
- `international_sale_clients` — the client, 1:1 (`international_sale_id` unique): name, email, age,
  gender, mobile, country, address.

They're separate from `agent_transactions` because the legacy ids overlap with `salesreport` ids and
these sales have no developer, payment-terms or commission workflow.

## Mapping

- `agent_id` = legacy `agent_id` (the old `members.memberid`) → `members.id` (= `agents.id`). After the
  2024-02-01 / country rule (see members.md) most belong to global partners; the rest to agents typed local.
- `sale_validation` is empty on every legacy row → `pending` (none were ever validated).
- `client_gender` is `1` on every row (a form default) → left empty. `client_country` is kept as text.
- `pot_file` paths (`lr_app/proofoftrans/…`) live on the old S3 bucket:
  `https://filipinohomes123.s3.ap-southeast-1.amazonaws.com/` + path.
- `created_at` of `0000-00-00` → the reservation date.

## Global Partner role

Role `global_partner` ("Global Partner") with permission `record_international_sales` (Record Your Sale ›
International Sale). Plain agents whose `agent_type` is `global_partner` hold it (4,054 after the 2024-02-01 /
country rule); `legacy:import-agent-types` keeps it in step, and the member importer assigns it on import.
