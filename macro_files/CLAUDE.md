<!-- dox:child v1 -->
# `macro_files/` — SAP Excel source reports

Incoming SAP Excel exports ingested by the backend. This directory is
intentionally empty in the repo because the files contain large customer/vendor
data sets that are not committed.

## What lives here

Runtime drop zone for the three source workbooks before ingestion scripts or
scheduler jobs run. Nothing in this directory should be checked into Git.

## Local conventions

- Drop source `.xlsx` files here before manual or scheduled ingestion.
- Do not commit macro workbooks; they are transient runtime inputs.
- Use dated sub-folders if you need to keep multiple snapshots locally.

## Key files

| File | Role |
|------|------|
| (none committed) | Source workbooks are placed here at runtime. |

## Gotchas / fragile spots

- The three expected reports are the credit report workbook,
  `west  central customer codes.xlsx` (note the two spaces), and
  `ZSD_CURRSTK_HR.xlsx`.
- `ZSD_CURRSTK_HR.xlsx` cannot be parsed by `openpyxl`; the backend uses a
  raw-zip parser.
- Credit reports contain `#VALUE!` errors and trailing blank/footer rows that the
  ingestion pipeline strips.

## Up / down

- Parent: [`../CLAUDE.md`](../CLAUDE.md)
- Children: none
- Related repo docs: [`../macro_docs/README.md`](../macro_docs/README.md) · [`../macro_docs/credit-report.md`](../macro_docs/credit-report.md) · [`../macro_docs/west-central-customer-codes.md`](../macro_docs/west-central-customer-codes.md) · [`../macro_docs/zsd-currstk-hr.md`](../macro_docs/zsd-currstk-hr.md)
