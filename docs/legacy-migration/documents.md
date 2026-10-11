# Agent documents (legacy `member_docs` → `agent_documents`)

`php artisan legacy:import-documents [--dry-run]` (`LegacyDocumentImporter`). Idempotent: `agent_documents.id` =
`member_docs.id`, rows are upserted.

| Legacy | New | Notes |
|---|---|---|
| `agent_id` | `agent_id` | It is the member **number**: `members.memberid` → `members.id` (= `agents.id`); for a repeated memberid the newest member row wins (same as sales). Unknown → skipped (`agent_not_found`). |
| `type` | `type` | prc, dhsud, contract, cpd, `new-entry` → `new_entry`. |
| `status` | `status` | valid, pending, `for re-upload` → `for_reupload`. |
| `renewed_status` | `is_current` | `stable` = the latest; null = an older upload. Several stable rows for one agent + type: only the newest (highest id) stays current. |
| `remarks` | `remarks` | Trimmed, empty → null. |
| `logs` (JSON) | `file_name` | `fileName`; else the last part of the URL. |
| `file_url` | `file_url` | Full S3 URL, kept as is. |
| `updated_at` | `reviewed_at` | Only for decided (valid / for re-upload) documents; legacy kept no reviewer. |

Comments (`agent_document_comments`) are new; legacy had none.

Run on 2026-10-11: 8,635 read, 8,615 imported, 3,217 current, 1,688 stable rows superseded by a newer stable one,
20 skipped (member not in `agents`). Current by type: PRC 1,145 · DHSUD 1,157 · contract 312 · CPD 333 · new entry 270.
Most contracts were never marked stable (2,133 agents have only non-stable contracts), so by the rule above they are
older uploads and don't show under "Latest only" — switch to "Every upload", or mark one as latest in the review panel.
