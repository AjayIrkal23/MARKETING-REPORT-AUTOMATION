# West-Central Customer Codes (Account Master / Mapping)

**File:** `macro_files/west  central customer codes.xlsx` (legacy 12-col)  
**Updated workbook:** `~/Downloads/west  central customer codes_updated_ship_tp.xlsx` · **Sheet:** `Sheet1` · **Data rows:** 77 · **Columns:** 15 (source) → **13 (portal template)**  

**Source:** Manually maintained regional customer master for the West-Central zone.

**Row grain:** One row per **customer account × ship-to party** in the West-Central region.

**Use this file to:** Look up **who owns an account (CAM), their contact number, the segment, destination, reporting head, default route, ship-to details, ship-to city, rake, and transport mode** for a customer code/name.

### Important notes / data-quality flags
- PRIMARY mapping table: 'code' ↔ customer name ↔ CAM/Head/Route/Segment.
- Casing is NOT normalized (e.g. 'oem' and 'OEM' both appear; cities lower/upper mixed).
- The portal import template uses a **single** `SHIP TO` / `SHIP TO CUSTOMER` pair and **rejects** the duplicate columns present in the client's updated workbook.
- New columns kept in the portal template: `SHIP TO CITY`, `RAKE`, `TRANSPORT MODE`.
- The portal template contains a hidden fingerprint sheet (`_JSW_MRA_TEMPLATE_`) so the importer accepts only official portal-generated workbooks.
- Row 50 in the updated workbook has a blank `Segment`; the importer falls back to the string `unknown` instead of rejecting the row.
- Small codes (8451-8499) are JSW internal stock-transfer yards, not external customers.

## Column summary (portal import template)

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | Segment | text | Business segment of the account. Missing values become `unknown`. |
| 2 | code | number | SAP customer code. |
| 3 | Customer | text | Customer name (free text; some entries abbreviated/duplicated). |
| 4 | Destination | text | Destination city/location for the customer. |
| 5 | CAM | text | Customer Account Manager — the JSW sales person who owns the account. (Header may have trailing space.) |
| 6 | MOB No. | number/text | Mobile/contact number for the CAM or account. |
| 7 | Head | text | Regional / zonal sales head the account rolls up to. |
| 8 | ROUTE | text | Default logistics route code for the account. |
| 9 | SHIP TO | text | Ship-to party code (sparse override). |
| 10 | SHIP TO CUSTOMER | text | Ship-to party name (sparse override). |
| 11 | SHIP TO CITY | text | City associated with the ship-to party. |
| 12 | RAKE | text | Rake identifier. |
| 13 | TRANSPORT MODE | text | Transport mode (`RAKE`, `ROAD`, `ROAD/RAKE`). |

## Columns in detail (with up to 50 unique sample values)

### 1. Segment
Business segment of the account. Values: Retail, OEM/oem, PROJECT, MSME, SBU-A, Stock transfer. NOTE: casing not normalized ('oem' vs 'OEM').

**Type:** text · **Fill:** 98.7% (76/77) · **Distinct values:** 7

```
MSME, OEM, PROJECT, Retail, SBU-A, Stock transfer, oem
```

### 2. code
SAP customer code. Short codes (8451..8499) are JSW internal stock-transfer plants; 8-digit (40xxxxxx) are external customers. JOIN KEY to credit report.Customer and ZSD_CURRSTK_HR.Customer.

**Type:** number · **Fill:** 100.0% (77/77) · **Distinct values:** 74

### 3. Customer
Customer name (free text; some entries abbreviated/duplicated, e.g. 'Auto Profiles ltd' vs 'Auto Profiles Limited-unit1').

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 70

### 4. Destination
Destination city/location for the customer. Casing inconsistent (Indore/indore, kutch/KUTCH).

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 16

### 5. CAM
Customer Account Manager — the JSW sales person who owns the account. (Header may have a trailing space: 'CAM '.)

**Type:** text · **Fill:** 93.5% (72/77) · **Distinct values:** 24

### 6. MOB No.
Mobile/contact number for the CAM or account. Mostly numeric; one text entry '*017142 (Hot line)'.

**Type:** number/text · **Fill:** 89.6% (69/77) · **Distinct values:** 20

### 7. Head
Regional / zonal sales head the account rolls up to.

**Type:** text · **Fill:** 92.2% (71/77) · **Distinct values:** 9

### 8. ROUTE
Default logistics route code for the account (e.g. KAT036, KAR139).

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 20

### 9. SHIP TO
Ship-to party code (sparse — only ~5% of rows in the source workbook). Mapped to `ship_to`.

**Type:** text · **Fill:** 5.2% (4/77) · **Distinct values:** 4

### 10. SHIP TO CUSTOMER
Ship-to party name. Mapped to `ship_to_customer`.

**Type:** text · **Fill:** 5.2% (4/77) · **Distinct values:** 4

### 11. SHIP TO CITY
City associated with the ship-to party (casing inconsistent).

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 25

### 12. RAKE
Rake identifier / loading point.

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 8

### 13. TRANSPORT MODE
Transport mode for the account.

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 3  
**Values:** `RAKE`, `ROAD`, `ROAD/RAKE`
