<!-- dox:child v1 -->
# `backend/app/services/analytics/` — Analytics dashboard services

Business logic for the stock analytics dashboard: aggregating JSW/JVML stock over
date ranges, joining `customer_codes`, and returning KPIs plus chart series.

## What lives here

One file per concern. Services are transport-free; `controllers/analytics.py`
handles query-param whitelisting and envelopes.

## Local conventions

- `dashboard.py` orchestrates, `pipeline.py` builds the MongoDB aggregation, and
  `options.py` serves async filter values.
- Date strings use `dd-mm-yyyy` to match the stock `report_date` field.
- Region filtering is resolved to a set of `customer_code_id` hex strings before
  the aggregation runs.

## Key files

| File | Role |
|------|------|
| `dashboard.py` | Orchestrates region resolution, per-collection aggregation, and `AnalyticsDashboardData` assembly. |
| `options.py` | Returns async-combobox options for each analytics dimension, scoped by report type, date range, and region. |
| `pipeline.py` | Builds the `$facet` aggregation that joins stock to `customer_codes` and produces RAKE/transport/channel/segment/customer series plus KPIs. |

## Gotchas / fragile spots

- `pipeline.py` caps the customer series to top 30 and buckets the rest as
  `"Others"` so the chart total stays consistent with the KPI total.
- The QA-hold aging filter reuses `services.report.pivot.qa_hold_match`; changes
  there affect analytics too.
- `options.py` must distinguish CustomerCode dimensions (`segment`,
  `transport_mode`, `rake`, `route`) from stock dimensions (`distr_chnl`,
  `sales_office`, `customer_name`).
- When `reportType == "both"`, results from the JSW and JVML collections are
  merged by label; ensure label normalization does not collide.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../../../backend_docs/ARCHITECTURE.md`](../../../backend_docs/ARCHITECTURE.md) · [`../../../backend_docs/SERVICES.md`](../../../backend_docs/SERVICES.md)
