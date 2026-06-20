<!-- dox:child v1 -->
# `backend/app/services/report/` — local rules (dox)

> Local doc for this directory only. Read after the root `CLAUDE.md`. Update this
> file whenever you add, remove, or rename files here, or change a local convention.

## What lives here

JSW/JVML "Coil Stock" pivot + credit-report orchestration. Files build the
`GET /report/generate` payload: aggregation, credit augmentation, and final
channel assembly.

## Local conventions

- Keep all MongoDB aggregation logic in `pivot.py`; business decisions about
  credit status/blocked belong in `generate.py`.
- `ReportParty` columns that come from the stock row (`sold_to_party`,
  `route_desc`) are populated in the `$group` stage. Columns that come from the
  enriched `CustomerCode` master (`route`, `ship_to_party`) are resolved in
  `_resolve_region_customers` and merged in `_build_channels`.

## Key files

| File | Role |
|------|------|
| `generate.py` | Region → customer codes → pivot → credit → `ReportResponse` |
| `pivot.py` | MongoDB `$group` aggregation for the coil-stock pivot |
| `credit.py` | Credit-report lookup + required-credit calculation |

## Gotchas / fragile spots

- `CustomerCode.code` is not unique. First document per normalized code wins
  for both the enrichment map and the ingest-time customer mapping.
- The pivot uses `party_code_normalized` (leading zeros stripped). The report
  region filter restricts to codes belonging to the selected region.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`CODEX.md`](../../../../../CODEX.md) §Architecture Decisions
