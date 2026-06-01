# Code Review — Report JSW/JVML Feature

**Verdict: FIX-THEN-SHIP**

| Severity | Count |
|----------|-------|
| High     | 1     |
| Medium   | 2     |
| Low      | 0     |

---

## Confirmed Findings

### [HIGH] has_credit_report ignores CCA — cross-report false-positive

**Location:** `backend/app/services/report/credit.py` lines 48–49

**Detail:**
`build_credit_map` fetches ALL `credit_report` rows for the date with no `credit_control_area` filter, then sets `has_credit_report = len(docs) > 0`. SPEC §2.6 explicitly requires `credit_report.count({report_date: date, credit_control_area: cca}) > 0`.

Failure scenario: if only VJ0H (JSW) rows are ingested for a date and a JVML report is requested (JV0H), the gate returns `True` while `credit_map` is empty. Every party then receives `credit_status="No Credit balance"` instead of the required `"NO CREDIT REPORT FOUND"` sentinel. AUDIT.md confirms the JVML 31-05 case returns `has_credit=false` only because JV0H rows are currently absent — the bug is latent and will silently surface on any date where a partial credit file containing only one CCA has been ingested.

**Fix:**
```python
# Lines 48-49 — replace date-only query with CCA-filtered query
docs = await CreditReport.find(
    {"report_date": date, "credit_control_area": cca}
).to_list()
has_credit_report = len(docs) > 0
# Remove the `if doc.credit_control_area != cca: continue` guard in the
# loop below (line 53) — the query already restricts to the correct CCA.
```

---

### [MEDIUM] BlockedCell renders '—' instead of 'NO CREDIT REPORT FOUND' when has_credit_report=false

**Location:** `frontend/src/components/report/ReportPartyRow.tsx` lines 13–14 and call site line 67

**Detail:**
`BlockedCell` accepts only `blocked: boolean | null` and has no access to `credit_status`. When `has_credit_report=false`, the backend sends `blocked=null`; `BlockedCell` renders a muted `'—'`. SPEC §5 / SPEC.md line 152 requires all three credit cells to display `'NO CREDIT REPORT FOUND'` in this case. `CreditBalanceCell` (lines 19–31) correctly branches on `party.credit_status`; the asymmetry confirms the omission.

**Fix:**
1. Add a `creditStatus` prop to `BlockedCell`:
   ```tsx
   function BlockedCell({ blocked, creditStatus }: {
     blocked: boolean | null;
     creditStatus?: string;
   }) {
     if (creditStatus === 'NO CREDIT REPORT FOUND')
       return <span className="text-xs italic text-amber-600">NO CREDIT REPORT FOUND</span>;
     // existing blocked logic ...
   }
   ```
2. Update call site (line 67):
   ```tsx
   <BlockedCell blocked={party.blocked} creditStatus={party.credit_status} />
   ```

---

### [MEDIUM] has_credit_report uses date-level count instead of CCA-filtered count (spec conformance)

**Location:** `backend/app/services/report/credit.py` lines 48–49

**Detail:**
This is the same root defect as the HIGH finding above, surfaced additionally as a direct spec-conformance violation. The service docstring (lines 35–37) explicitly documents the divergence, calling it "date-level", which directly contradicts SPEC §2.6. Both the HIGH and MEDIUM findings are resolved by the same fix.

**Fix:** Same as HIGH finding — add `"credit_control_area": cca` to the `find()` query at line 48.

---

## Verified Working (live-data validation)

The following behaviors were confirmed correct against live ingested data (AUDIT.md):

- JVML 2026-05-31 report: `has_credit=false`, all credit cells render `'NO CREDIT REPORT FOUND'` (correct today because JV0H rows are absent — latent HIGH bug would corrupt this on mixed-CCA ingestion dates).
- JSW 2026-05-31 report: `has_credit=true`, blocked/credit_balance/required_credit cells populate from `credit_map` correctly.
- Stock filter gate (5-filter `should_keep_row`): party-match, S_HRCF, blocked=0, order-type denylist, NCO/DO — confirmed working for both JSW and JVML report types.
- Party-level row grouping and totals render correctly.
- Report date selector and CCA routing (JSW → VJ0H, JVML → JV0H) resolve correctly.

---

*Review generated: 2026-06-01*
