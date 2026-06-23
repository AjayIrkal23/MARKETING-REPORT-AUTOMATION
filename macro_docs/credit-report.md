# Credit Report

**File:** `macro_files/credit report.XLSX`  
**Sheet:** `Sheet1` · **Data rows:** 195 · **Columns:** 33

**Source:** SAP Credit Management report (UKMBP / FD33-style export).

**Row grain:** One row per **customer × credit control area (CCA)**. A single customer appears in many rows — one per CCA they trade in.

**Use this file to:** Answer questions about **credit limits, exposure, overdue amounts, available credit headroom, and credit blocks** for a customer.

### Important notes / data-quality flags
- All amounts are in **INR**.
- ~11% of rows are blank/footer rows (fill on most columns is ~88.7%) — filter out empty 'Customer Name' rows.
- 'Validity Period End' contains an Excel error value '#VALUE!' in at least one row — guard against it.
- Many rows use `9999-12-31` (or an equivalent Excel serial) as an open-ended validity date. These sentinel dates are dropped during ingestion because the UI does not use these columns and they can break timezone conversions.
- 'Credit Balance' negative = customer is OVER their sanctioned limit.

## Ingestion and query rules

### Allowed credit-control areas (CCA)
Only rows with a non-empty `Customer Name` **and** one of the following CCA codes are ingested:

| CCA code | Plant / entity |
|----------|----------------|
| `VJ0H`   | JSW Steel Vijayanagar |
| `1000`   | JSW Steel corporate/default |
| `JV0H`   | JSW VML (JVML) |

All other CCA codes are dropped at ingestion time.

### Plant filter in the UI / API
The list endpoint supports a `plant` query parameter that groups the allowed CCAs:

| `plant` value | Included CCA codes | UI label |
|---------------|--------------------|----------|
| `all`         | `VJ0H`, `1000`, `JV0H` | All plants |
| `jsw`         | `VJ0H`, `1000` | JSW (VJ0H + 1000) |
| `jvml`        | `JV0H` | JVML (JV0H) |

The default is `all`.

## Column summary

| # | Column | Type | Fill % | Distinct | Description |
|---|--------|------|-------:|---------:|-------------|
| 1 | Customer Name | text | 88.7 | 18 | Sold-to customer's legal name (SAP customer master). |
| 2 | City | text | 88.7 | 14 | City of the customer. |
| 3 | Customer | text | 99.5 | 21 | SAP customer master code (KUNNR). |
| 4 | Credit control area | text | 88.7 | 52 | SAP Credit Control Area key (KKBER). |
| 5 | CCA Description | text | 88.7 | 52 | Human-readable name of the credit control area (e. |
| 6 | Blocked | text | 7.7 | 1 | Credit block flag. |
| 7 | Currency | text | 100.0 | 1 | Reporting currency. |
| 8 | CCA Credit Limit | number | 100.0 | 56 | Sanctioned credit limit for this customer within this credit control area (INR). |
| 9 | Credit Proposal number | text | 5.1 | 9 | Credit proposal / sanction document number (sparse — only where a formal proposal exists). |
| 10 | Proposed Value | number | 100.0 | 13 | Proposed credit-limit value from the credit proposal (INR). |
| 11 | Credit Exposure | number | 100.0 | 115 | Current total credit exposure = open receivables + open orders/deliveries/billing (INR). |
| 12 | Credit Balance | number | 100.0 | 123 | Remaining credit headroom = limit minus exposure (INR). |
| 13 | Overdue | number | 100.0 | 20 | Overdue receivable amount past due date (INR). |
| 14 | Sales value | number | 100.0 | 78 | Open sales-order value contributing to exposure (INR). |
| 15 | Total receivables | number | 100.0 | 84 | Open accounts-receivable (FI) balance (INR). |
| 16 | Special liabilities | number | 100.0 | 71 | Special GL / liability amounts (advances, security deposits) (INR). |
| 17 | Open delivery credit | number | 100.0 | 78 | Value of open (un-billed) deliveries counted in exposure (INR). |
| 18 | Open bill.doc.credit | number | 100.0 | 4 | Value of open billing documents (INR). |
| 19 | Open orders credit | number | 100.0 | 1 | Value of open sales orders counted in exposure (INR). |
| 20 | Guaranteed open delivery | number | 100.0 | 1 | Portion of open deliveries covered by guarantee/LC/BG (INR). |
| 21 | Guarantd open billing docs | number | 100.0 | 1 |  |
| 22 | Guaranteed open orders | number | 100.0 | 1 | Guaranteed portion of open orders (INR). |
| 23 | Validity Per. Start | date | 88.7 | 76 | Start date of the credit-limit validity period. |
| 24 | Validity Period End | date | 88.7 | 8 | End date of credit-limit validity. |
| 25 | Risk category | text | 88.7 | 1 | Credit risk category (UKM risk class). |
| 26 | Total amount | number | 100.0 | 42 | Total credit limit amount across the hierarchy (INR). |
| 27 | Individual limit | number | 100.0 | 42 | Individual customer credit limit (INR). |
| 28 | Sales Organization | text | 88.7 | 1 | SAP sales organization. |
| 29 | Distribution Channel | text | 88.7 | 5 | Distribution channel: AU=Auction, MS=MSME, OE=OEM, RE=Retail, SA=SBU-A. |
| 30 | Division | text | 88.7 | 11 | Product division code (11,12,15,16,17,19,20,22,23,24,27). |
| 31 | Sales Group | text | 88.7 | 7 | Sales group org unit code. |
| 32 | Sales Office | text | 88.7 | 7 | Sales office: BR01,GJ01,MH01,MH02,MH05,MP01,RJ01 (Maharashtra/Gujarat/MP/Rajasthan region). |
| 33 | Hierarchy Customer | text | 0.0 | 0 | Customer-hierarchy parent node. |

## Columns in detail (with up to 50 unique sample values)

### 1. Customer Name
Sold-to customer's legal name (SAP customer master).

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 18

<details><summary>All distinct values (18 shown)</summary>

```
Ackroll Industries, Auto Profiles LTD. (unit-iii), Auto Profiles Limited-unit1, Bharatkumar Indrasen Trading PVT. L, Govind Steel Agency Private Limited, Jindal Saw Limited, Jsw One Distribution Limited, Kalyani Maxion Wheels Private Limi, Mahindra Accelo Limited, Mittal Agencies, Narmada Iron & Associates Private L, Posco Maharashtra Steel Private Lim, Ratan Ispat Industries, S.K.AGARWAL & Company, SATYASAI PRESSURE VESSELS PRIVATE L, Speedwell Abrasive P Ltd, VE Commercial, Valmont Structures Private Ltd
```
</details>

### 2. City
City of the customer. Note: casing is inconsistent (e.g. 'Mumbai' vs 'mumbai').

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 14

<details><summary>All distinct values (14 shown)</summary>

```
Ahmedabad, BELLARY, Daskroi, Indore, JAIPUR, JAMSHEDPUR, MUMBAI, Mumbai, PITHAMPUR, PUNE, RAJKOT, Sinnar, mumbai, raigad
```
</details>

### 3. Customer
SAP customer master code (KUNNR). PRIMARY JOIN KEY to the other two files.

**Type:** text · **Fill:** 99.5% (194/195) · **Distinct values:** 21

<details><summary>All distinct values (21 shown)</summary>

```
40000088, 40000936, 40002006, 40002296, 40007137, 40007312, 40020381, 40025038, 40025518, 40026134, 40028184, 40034267, 40043658, 40045973, 40101601, 40101605, 40102630, 40103829, 40109215, 40112173, 40122581
```
</details>

### 4. Credit control area
SAP Credit Control Area key (KKBER). Codes encode plant + product line, e.g. DV0H=HR-Dolvi, MH2H=HR-Pune. Generic numerics (1000, 1006) are default/legacy CCAs.

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 52

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1000, 1006, 1010, 1065, 1090, AN0H, AP1L, BP1C, BP1H, BP1L, BP1W, DV0C, DV0H, DV0L, GJ1C, GJ1H, GJ1L, JK1C, JK1G, JK1H, JV0H, KA1L, KA6L, MH2C, MH2G, MH2H, MH2L, MH2P, MH3C, MH3H, MH6C, MH6G, MH6H, MH7L, MH8L, MP2C, MP2G, MP2H, MP3C, MP3H, RJ1C, RJ1H, RV1H, TN1L, TN2L, TP0P, VJ0C, VJ0G, VJ0H, VJ0L
```
</details>

### 5. CCA Description
Human-readable name of the credit control area (e.g. 'HR-Dolvi', 'LP-Pune', 'CR-Indore2').

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 52

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
CP-Pune, CP-Tarapur, CR BPSL, CR-1481, CR-Ahmedabad, CR-Dolvi, CR-Indore Gram Sonvay, CR-Indore2, CR-Jaipur, CR-Jharkhand, CR-Navi Mumbai, CR-Pune, CR-Vijaynagar, Credit control area BPSL, Credit control area Neotrex Steel, Default CCA JSW Steel, Default CCA JSW VML, Default CCA JSWCPL, GA-Indore2, GI -1481, GI-Jharkhand, GI-Pune, GI-Vijaynagar, HR - NAVI Mumbai, HR BPSL, HR-1481, HR-Ahmedabad, HR-Anjar, HR-Dolvi, HR-Indore Gram Sonvay, HR-Indore2, HR-JVML VJNR, HR-Jaipur, HR-Jaipur JVML, HR-Jharkhand, HR-Pune, HR-Vijaynagar, LP BPSL, LP-1469, LP-Ahmedabad, LP-Bangalore, LP-Chennai, LP-Coimbatore, LP-Dolvi, LP-Hosapete, LP-Hyderabad, LP-Pune, LP-Vijaynagar, LP-WADA, OT-Vijaynagar
```
</details>

### 6. Blocked
Credit block flag. 'X' = customer/CCA is credit-blocked; blank = not blocked.

**Type:** text · **Fill:** 7.7% (15/195) · **Distinct values:** 1

<details><summary>All distinct values (1 shown)</summary>

```
X
```
</details>

### 7. Currency
Reporting currency. Always INR in this extract.

**Type:** text · **Fill:** 100.0% (195/195) · **Distinct values:** 1

<details><summary>All distinct values (1 shown)</summary>

```
INR
```
</details>

### 8. CCA Credit Limit
Sanctioned credit limit for this customer within this credit control area (INR). Value 1 is a placeholder for 'no real limit set'.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 56 · **Range:** 1 … 5.50064e+10

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1, 3, 4, 8, 9, 7372.64, 23876.45, 142527.05, 3500001, 5003702.6, 10766206, 12500001, 15000000, 15000001, 16300000, 16300005, 17100001, 17337417.94, 25000001, 26000001, 29500000, 29842948.85, 29985482.9, 30522585.87, 32100010, 35000001, 35325000, 46091210, 46868675.03, 50000001, 55014407.35, 60000000, 70000001, 80000001, 86000001, 100000000, 105014415.35, 119999999, 120000001, 143000000, 147526310.47, 155000007, 270000000, 323300000, 360000001, 450000001, 456000004, 480000003, 530000003, 550000006
```
</details>

### 9. Credit Proposal number
Credit proposal / sanction document number (sparse — only where a formal proposal exists).

**Type:** text · **Fill:** 5.1% (10/195) · **Distinct values:** 9

<details><summary>All distinct values (9 shown)</summary>

```
2600008818, 2600008821, 2600009104, 2600009105, 2600009155, 2600009178, 2600009181, 2600009183, 2600009185
```
</details>

### 10. Proposed Value
Proposed credit-limit value from the credit proposal (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 13 · **Range:** 0 … 1.28522e+09

<details><summary>All distinct values (13 shown)</summary>

```
0, 1, 21546730.22, 65681785.1, 67653689.36, 83466784.73, 87228515.32, 174217976.27, 194716268.65, 250138038.73, 427797754.33, 1130336822.71, 1285219029.39
```
</details>

### 11. Credit Exposure
Current total credit exposure = open receivables + open orders/deliveries/billing (INR). Negative = customer is in credit (advance/overpaid).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 115 · **Range:** -7.47211e+07 … 5.76542e+09

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-74721103.73, -23841676.17, -20213986.49, -11488201.5, -5715426.51, -4339705.49, -3497502.17, -3465651.07, -2979394.03, -2942001.55, -2477210.51, -1926288.54, -1767079.9, -1649034.23, -1616002.85, -1502134.61, -1324914.01, -1004164.24, -849177, -776374.55, -727362.25, -700250.65, -398964.56, -321377.1, -281939.5, -266581.57, -118873.42, -99925, -45353.99, -40290.95, -38781.57, -24966.25, -17903, -12304, -8230.5, -81.11, 0, 0.01, 0.02, 0.03, 0.06, 0.08, 0.14, 0.16, 0.42, 0.73, 0.8, 1.07, 1375.07, 3354.01
```
</details>

### 12. Credit Balance
Remaining credit headroom = limit minus exposure (INR). Negative = OVER the sanctioned limit.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 123 · **Range:** -2.40992e+08 … 4.9241e+10

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-240992209.83, -227797754.33, -208958729.15, -94839513.49, -50776221.83, -50138038.73, -46874854.86, -42558129.58, -31263585.67, -30623926.6, -29659848.11, -27653689.36, -15575128.25, -13466784.73, -11934206.97, -5070706.95, -5041572.9, -2786135.86, -2044806.62, -1937547.79, -1482281.82, -1478144.29, -738471.07, -107259.83, -27256.61, -3353.01, -1374.07, 0, 0.2, 0.27, 0.84, 0.92, 0.94, 0.97, 0.98, 0.99, 1, 8, 8231.5, 12305, 24967.25, 24970.25, 38782.57, 45354.99, 99926, 118874.42, 266582.57, 281940.5, 321378.1, 398965.56
```
</details>

### 13. Overdue
Overdue receivable amount past due date (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 20 · **Range:** 0 … 2.79447e+08

<details><summary>All distinct values (20 shown)</summary>

```
0, 1606342.9, 1742089.18, 2116651.74, 5202562.94, 5761816.59, 6843442.51, 8796436.5, 13998999.44, 14301478.92, 14321878.11, 15575129.25, 16177073.06, 16438529.85, 21802820.77, 36045660.19, 62907702.66, 66245664.96, 119142788.7, 279446750.28
```
</details>

### 14. Sales value
Open sales-order value contributing to exposure (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 78 · **Range:** 0 … 9.12555e+08

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0, 0.01, 0.02, 0.03, 0.05, 0.06, 0.08, 0.09, 0.11, 0.14, 0.15, 0.16, 0.42, 0.73, 0.8, 1.07, 1.13, 3354.01, 16972.65, 27257.61, 306116.09, 554894.21, 620632.65, 1264369.37, 1478145.29, 1589079.45, 1716195.07, 1826355.36, 1842392.73, 2079153.22, 2113099.57, 2388403.46, 2449223.1, 2476620.03, 2786136.86, 3052548.88, 3064794.73, 3064795.01, 3409794.81, 3866548.78, 4204642.4, 4251557.27, 4257765.09, 4636283.92, 4697496.32, 4759536.73, 4905656.08, 4947744.57, 5391372.1, 5860337.25
```
</details>

### 15. Total receivables
Open accounts-receivable (FI) balance (INR). Negative = net credit balance.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 84 · **Range:** -3.0579e+07 … 6.53575e+09

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-30578987.79, -24310209.43, -7799396.69, -3465651.07, -2979394.06, -2942001.55, -2477210.53, -1649034.23, -1251119.59, -1161630.76, -281939.5, -99925, -49144, -38781.57, -17903, -12304, -4565, 0, 1375.07, 7372.62, 9043.81, 35072.8, 93293.34, 200740.18, 294033.52, 1181991, 1551458.8, 2116651.74, 2287924.23, 3690485.75, 3766145.64, 4719818.89, 4780568.43, 5065444.43, 5453922.52, 5708653.44, 6067680.25, 6593535.13, 8796794, 10218012.9, 10421093.61, 10784241.54, 11623020.66, 12387263.72, 12679890.12, 13017095.55, 14321878.11, 15575129.25, 17712822.63, 18106429.13
```
</details>

### 16. Special liabilities
Special GL / liability amounts (advances, security deposits) (INR). Often negative.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 71 · **Range:** -1.68289e+09 … 2.39538e+08

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-1682892553.73, -1052353125.21, -995870069.23, -220384852.65, -218807760.26, -213408904.76, -147836949.73, -147836868.62, -92531088.26, -74730147.65, -61044919.77, -46061529.19, -37569367.62, -35738233.88, -29969003.19, -21234498.84, -21099219.88, -20000000, -19479902.62, -19410024.48, -18962866.9, -18167877.13, -17809367.31, -17019595.61, -16268770.08, -15125201.49, -10400000, -10049347, -10000000, -8349880.73, -7050494.2, -5753691.88, -3788235.47, -3752643.9, -3153766.99, -3113475.99, -3066621.71, -1777286.67, -1694459.86, -1610619.96, -1324914.15, -1206957.25, -776374.57, -700250.65, -454372.11, -398964.57, -321378.23, -154180.09, -118873.42, -40789
```
</details>

### 17. Open delivery credit
Value of open (un-billed) deliveries counted in exposure (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 78 · **Range:** 0 … 9.17388e+08

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0, 0.01, 0.02, 0.03, 0.05, 0.06, 0.08, 0.09, 0.11, 0.14, 0.15, 0.16, 0.42, 0.73, 0.8, 1.07, 1.13, 3354.01, 16972.65, 27257.61, 306116.09, 554894.21, 620632.65, 1264369.37, 1478145.29, 1589079.45, 1716195.07, 1826355.36, 1842392.73, 2388403.46, 2449223.1, 2476620.03, 2786136.86, 3052548.88, 3064794.73, 3064795.01, 3409794.81, 3866548.78, 3945937.22, 4204642.4, 4251557.27, 4257765.09, 4636283.92, 4697496.32, 4759536.73, 4905656.08, 4947744.57, 5079035.57, 5391372.1, 5860337.25
```
</details>

### 18. Open bill.doc.credit
Value of open billing documents (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 4 · **Range:** -4.83272e+06 … 0

<details><summary>All distinct values (4 shown)</summary>

```
-4832720, -2965936, -1866784, 0
```
</details>

### 19. Open orders credit
Value of open sales orders counted in exposure (INR). All 0 in this extract.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 1 · **Range:** 0 … 0

<details><summary>All distinct values (1 shown)</summary>

```
0
```
</details>

### 20. Guaranteed open delivery
Portion of open deliveries covered by guarantee/LC/BG (INR). All 0 here.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 1 · **Range:** 0 … 0

<details><summary>All distinct values (1 shown)</summary>

```
0
```
</details>

### 21. Guarantd open billing docs

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 1 · **Range:** 0 … 0

<details><summary>All distinct values (1 shown)</summary>

```
0
```
</details>

### 22. Guaranteed open orders
Guaranteed portion of open orders (INR). All 0 here.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 1 · **Range:** 0 … 0

<details><summary>All distinct values (1 shown)</summary>

```
0
```
</details>

### 23. Validity Per. Start
Start date of the credit-limit validity period.

**Type:** date · **Fill:** 88.7% (173/195) · **Distinct values:** 76

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
2013-02-01T00:00:00, 2013-03-22T00:00:00, 2013-07-01T00:00:00, 2013-08-01T00:00:00, 2013-09-01T00:00:00, 2014-09-01T00:00:00, 2015-01-08T00:00:00, 2015-01-13T00:00:00, 2015-04-04T00:00:00, 2015-08-18T00:00:00, 2015-08-25T00:00:00, 2015-10-20T00:00:00, 2016-12-01T00:00:00, 2016-12-12T00:00:00, 2016-12-28T00:00:00, 2017-02-22T00:00:00, 2017-03-02T00:00:00, 2017-03-04T00:00:00, 2017-08-02T00:00:00, 2017-08-29T00:00:00, 2018-04-24T00:00:00, 2020-02-14T00:00:00, 2020-07-23T00:00:00, 2020-07-24T00:00:00, 2020-08-13T00:00:00, 2020-08-21T00:00:00, 2020-09-02T00:00:00, 2020-11-01T00:00:00, 2021-07-23T00:00:00, 2022-04-30T00:00:00, 2022-12-30T00:00:00, 2023-01-06T00:00:00, 2023-02-09T00:00:00, 2023-04-01T00:00:00, 2023-04-06T00:00:00, 2023-04-24T00:00:00, 2023-05-16T00:00:00, 2023-05-24T00:00:00, 2023-06-16T00:00:00, 2023-09-20T00:00:00, 2023-10-07T00:00:00, 2023-11-02T00:00:00, 2024-01-05T00:00:00, 2024-01-06T00:00:00, 2024-04-01T00:00:00, 2024-04-29T00:00:00, 2024-05-06T00:00:00, 2024-05-07T00:00:00, 2024-05-08T00:00:00, 2024-06-05T00:00:00
```
</details>

### 24. Validity Period End
End date of credit-limit validity. 9999-12-31 = open-ended. WARNING: contains an Excel error value '#VALUE!' in at least one row.

**Type:** date · **Fill:** 88.7% (173/195) · **Distinct values:** 8

<details><summary>All distinct values (8 shown)</summary>

```
#VALUE!, 2013-09-30T00:00:00, 2022-11-30T00:00:00, 2024-03-31T00:00:00, 2025-03-31T00:00:00, 2026-03-31T00:00:00, 2027-03-31T00:00:00, 9999-12-31T00:00:00
```
</details>

### 25. Risk category
Credit risk category (UKM risk class). All '001' here.

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 1

<details><summary>All distinct values (1 shown)</summary>

```
001
```
</details>

### 26. Total amount
Total credit limit amount across the hierarchy (INR).

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 42 · **Range:** 2 … 9.01751e+10

<details><summary>All distinct values (42 shown)</summary>

```
2, 5, 8, 20, 40, 160, 19800100, 25000012, 35000021, 45884725, 46200100, 65000100, 70000005, 107935992.51, 118800600, 235000009, 238593700.83, 277200600, 300000004, 367077800, 378786127.57, 385000231, 490000101, 550000006, 590000100, 630000045, 780001200, 900000012, 971423932.59, 1080000020, 1560000100, 1645000063, 2450000505, 2780603217, 3240000060, 3409075148.13, 3540000600, 4400000048, 5726248819.92, 14040000900, 47270254689, 90175085473.64
```
</details>

### 27. Individual limit
Individual customer credit limit (INR). Usually equals Total amount.

**Type:** number · **Fill:** 100.0% (195/195) · **Distinct values:** 42 · **Range:** 2 … 9.01751e+10

<details><summary>All distinct values (42 shown)</summary>

```
2, 5, 8, 20, 40, 160, 19800100, 25000012, 35000021, 45884725, 46200100, 65000100, 70000005, 107935982.51, 118800600, 235000009, 238593700.83, 277200600, 300000004, 367077800, 378786127.57, 385000231, 490000101, 550000006, 590000100, 630000045, 780001200, 900000012, 971423842.59, 1080000020, 1560000100, 1645000063, 2450000505, 2780603217, 3240000060, 3409075148.13, 3540000600, 4400000048, 5726248819.92, 14040000900, 47270254689, 90175085383.64
```
</details>

### 28. Sales Organization
SAP sales organization. All '1001' (JSW Steel domestic).

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 1

<details><summary>All distinct values (1 shown)</summary>

```
1001
```
</details>

### 29. Distribution Channel
Distribution channel: AU=Auction, MS=MSME, OE=OEM, RE=Retail, SA=SBU-A.

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 5

<details><summary>All distinct values (5 shown)</summary>

```
AU, MS, OE, RE, SA
```
</details>

### 30. Division
Product division code (11,12,15,16,17,19,20,22,23,24,27).

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 11

<details><summary>All distinct values (11 shown)</summary>

```
11, 12, 15, 16, 17, 19, 20, 22, 23, 24, 27
```
</details>

### 31. Sales Group
Sales group org unit code.

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
101, 115, 116, 123, 126, 127, 137
```
</details>

### 32. Sales Office
Sales office: BR01,GJ01,MH01,MH02,MH05,MP01,RJ01 (Maharashtra/Gujarat/MP/Rajasthan region).

**Type:** text · **Fill:** 88.7% (173/195) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
BR01, GJ01, MH01, MH02, MH05, MP01, RJ01
```
</details>

### 33. Hierarchy Customer
Customer-hierarchy parent node. Empty in this extract.

**Type:** text · **Fill:** 0.0% (0/195) · **Distinct values:** 0

_(no non-empty values)_
