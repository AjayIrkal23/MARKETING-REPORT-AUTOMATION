# Marketing Report Automation — Data Dictionary

This folder documents the Excel source files in `macro_files/`. It is written **for an AI agent**: read this README first to decide *which file* answers a request, then open the matching per-file doc for exact columns and sample values.

All three files are **SAP exports / manual masters for JSW Steel (Hot-Rolled, West-Central region)**. Amounts are in **INR**; quantities are in **metric tonnes (MT)**.

---

## Files at a glance

| File | What it is | Grain (1 row =) | Rows | Cols | Detailed doc |
|------|------------|-----------------|-----:|-----:|--------------|
| `credit report.XLSX` | SAP **Credit Management** report | customer × credit control area | 195 | 33 | [credit-report.md](credit-report.md) |
| `west  central customer codes.xlsx` | Regional **customer master / account mapping** | customer account | 77 | 12 | [west-central-customer-codes.md](west-central-customer-codes.md) |
| `ZSD_CURRSTK_HR.xlsx` | SAP **ZSD_CURRSTK** current-stock report (HR) | physical batch/coil in stock | 17,324 | 72 | [zsd-currstk-hr.md](zsd-currstk-hr.md) |

> Note the **two spaces** in the filename `west  central customer codes.xlsx`.

---

## How the files connect (join keys)

The **customer code** is the universal link:

```
west-central.code  ─┬─►  credit report."Customer"        (credit limit / exposure / overdue)
                    └─►  ZSD_CURRSTK_HR."Customer"        (stock / coils / chemistry)
```

- `credit report.Customer`, `west-central.code`, and `ZSD_CURRSTK_HR.Customer` are the **same SAP customer code** (e.g. `40000088`).
- In `ZSD_CURRSTK_HR`, `Party Code` is the **zero-padded 10-digit** form (`0000040000088` style / `0000008001`). Strip leading zeros to match `Customer`.
- Short codes `8451–8499` / `8001`-style = **internal JSW stock-transfer yards**, not external customers.
- There is **no direct row-level join** between credit and stock other than the customer code (credit is per-CCA; stock is per-coil).

---

## Request routing — "when I ask to do something, use this file"

| If the user asks about… | Use this file | Key columns |
|--------------------------|---------------|-------------|
| Credit **limit**, sanctioned limit, "how much can X buy" | `credit report.XLSX` | CCA Credit Limit, Total amount, Individual limit |
| Credit **exposure / outstanding / over-limit** | `credit report.XLSX` | Credit Exposure, Credit Balance (negative = over limit) |
| **Overdue** amount / overdue receivables | `credit report.XLSX` | Overdue, Total receivables |
| Credit **block** status | `credit report.XLSX` | Blocked (`X` = blocked) |
| Who is the **CAM / account manager / sales owner** of a customer | `west  central customer codes.xlsx` | CAM, Head |
| **Contact / mobile number** for an account | `west  central customer codes.xlsx` | MOB No. |
| Customer **segment** (Retail/OEM/Project/MSME) | `west  central…` (per-account) or `ZSD_CURRSTK_HR.Distr.Chnl` (per-order) | Segment / Distr.Chnl |
| Default **route / destination** for a customer | `west  central customer codes.xlsx` | ROUTE, Destination |
| **Current stock / available tonnage / inventory** | `ZSD_CURRSTK_HR.xlsx` | Unrestr.Qty., Stock Quantity, Material, JSW Grade |
| Stock by **thickness / width / length / grade** | `ZSD_CURRSTK_HR.xlsx` | Act.Thickness (mm), Width (mm), Length(mm), JSW Grade |
| **Aging** / old stock | `ZSD_CURRSTK_HR.xlsx` | Aging, Production Date |
| Stock at a **yard / location / storage location** | `ZSD_CURRSTK_HR.xlsx` | Location, Storage Location, Sales Office |
| Stock tied to a **sales order** | `ZSD_CURRSTK_HR.xlsx` | Sales Order No, SO Item Num, Order Status |
| **NCO / rework / defective** stock | `ZSD_CURRSTK_HR.xlsx` | Usage Decision, NCO Declared, NCO Reason |
| **Chemistry** (C, Mn, Si, …) of a coil | `ZSD_CURRSTK_HR.xlsx` | S_*_PCT columns |
| **Mechanical properties** (YS, UTS, elongation, hardness) | `ZSD_CURRSTK_HR.xlsx` | YS in MPa, Tensile Strength MPa (B), Elongation(Mic), HARDNESS |
| **Export** logistics (port / country) | `ZSD_CURRSTK_HR.xlsx` | Port Name, UNLOADING POINT, RECIEVING POINT, LC Exp Date |

**Common derived metric — "available to sell":**
`Unrestr.Qty. > 0` AND `Usage Decision ∈ {ACCEPT, ACCEPTED, PRIME}` AND (`Order Status = OPEN` OR `Sales Order No` is blank).

---

## Reading the files (IMPORTANT for tooling)

- `pandas`/`openpyxl` are **not installed by default** in this environment. Install with:
  `pip3 install --break-system-packages openpyxl` (and `pandas` if needed).
- **`ZSD_CURRSTK_HR.xlsx` contains invalid XML**: one numeric cell holds the value `1.057.000`, which makes `openpyxl.load_workbook(...)` **raise `ValueError: could not convert string to float`** in BOTH read-only and normal mode. Two ways around it:
  1. **Re-save / repair** the file (open in Excel/LibreOffice and save again), then read normally; **or**
  2. Parse the raw XLSX (zip → `xl/sharedStrings.xml` + `xl/worksheets/sheet1.xml`) with a tolerant reader that keeps a non-floatable numeric cell as a string. (A working `raw_parse()` reference implementation was used to build these docs.)
- The other two files (`credit report.XLSX`, `west  central customer codes.xlsx`) open cleanly with `openpyxl`.

### Type & quality gotchas to respect
- **Stored as TEXT even though they look numeric** (cast before doing math): `Act.Thickness (mm)`, `Width (mm)`, `Length(mm)`, `HARDNESS`, `YIELD STRENGTH`, `UTS` (in `ZSD_CURRSTK_HR`); `LC Exp Date` is text `dd.mm.yyyy`.
- **Excel error values** appear in data: `credit report.Validity Period End` has `#VALUE!`.
- **Casing not normalized**: `Segment` (`oem` vs `OEM`), cities (`Mumbai`/`mumbai`, `Indore`/`indore`). Normalize before grouping/joining.
- **Blank/footer rows**: `credit report.XLSX` has ~22 trailing blank rows (most columns ~88.7% filled). Filter rows with empty `Customer Name`.
- **Unnamed junk columns**: last 1–2 columns of `west  central customer codes.xlsx` have no header — ignore.
- **Headers with trailing spaces**: e.g. `"CAM "` in the customer-codes file.

---

## Glossary (domain terms)

| Term | Meaning |
|------|---------|
| **CCA** | Credit Control Area — SAP credit bucket, here encoded per plant + product line (e.g. `DV0H` = HR-Dolvi, `MH2H` = HR-Pune). |
| **CAM** | Customer Account Manager — the JSW salesperson owning an account. |
| **HR / CR / GI / GA / GL** | Hot-Rolled / Cold-Rolled / Galvanised Iron / Galvannealed / Galvalume product families. |
| **NCO** | Non-Conforming Output — material that failed spec / was re-graded. |
| **UD** | Usage Decision — QM verdict on a batch (ACCEPT / REWORK / etc.). |
| **STR / STO / DO** | Stock Transport Requisition / Stock Transport Order / Delivery Order. |
| **MT** | Metric Tonnes — unit for all stock quantities. |
| **Unrestricted stock** | Quality-released, sellable inventory. |
| **Special Stock E / Q** | E = sales-order (made-to-order) stock; Q = project stock. |
| **JSW Grade** | Internal steel grade code; `Eq. Sub Grade` maps it to external specs. |
| **YS / UTS** | Yield Strength / Ultimate Tensile Strength (MPa). |

---

## Per-file docs

Each linked doc contains: file overview, a **column summary table** (type, fill %, distinct count, one-line description), and **per-column detail with up to 50 unique sample values**.

- [credit-report.md](credit-report.md)
- [west-central-customer-codes.md](west-central-customer-codes.md)
- [zsd-currstk-hr.md](zsd-currstk-hr.md)

*Generated from the actual file contents on 2026-05-29.*
