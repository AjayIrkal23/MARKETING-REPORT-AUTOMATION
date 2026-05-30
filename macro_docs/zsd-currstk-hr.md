# ZSD_CURRSTK_HR — Current Stock, Hot-Rolled (HR)

**File:** `macro_files/ZSD_CURRSTK_HR.xlsx`  
**Sheet:** `Sheet1` · **Data rows:** 17,324 · **Columns:** 72

**Source:** SAP transaction ZSD_CURRSTK export for Hot-Rolled material.

**Row grain:** One row per **physical batch/coil in stock** (per storage location). ~17.3k rows.

**Use this file to:** Answer questions about **current inventory**: available (unrestricted) tonnage by grade/thickness/width/location, aging stock, stock tied to a sales order, NCO/rework stock, plus full **chemistry and mechanical properties** of each coil.

### Important notes / data-quality flags
- THIS FILE HAS INVALID XML: one numeric cell holds '1.057.000', which makes openpyxl FAIL to open it. Read with a tolerant XML parser (see README §Reading the files) or repair/re-save the file first.
- Quantities (Unrestr.Qty., In Quality Insp., Blocked, Stock Quantity) are in **metric tonnes (MT)**.
- Several numeric-looking columns are stored as TEXT: Act.Thickness (mm), Width (mm), Length(mm), HARDNESS, YIELD STRENGTH, UTS, LC Exp Date. Cast carefully.
- 'Customer' mixes short plant codes and 8-digit external codes; 'Party Code' is the zero-padded form.
- Available-to-sell stock = rows where Unrestr.Qty. > 0 and (typically) Usage Decision in ACCEPT/PRIME and Order Status = OPEN / blank SO.

## Column summary

| # | Column | Type | Fill % | Distinct | Description |
|---|--------|------|-------:|---------:|-------------|
| 1 | SO Sales Org | text | 78.4 | 2 | Sales order's sales organization: 1001 (JSW Steel) / 1002. |
| 2 | Sales Order Type | text | 80.4 | 29 | SAP sales document type. |
| 3 | Distr.Chnl | text | 80.4 | 8 | Distribution channel (text): Retail, OEM, MSME, SBU-A, Auction, SEZ/Deemed Export, Stock Transfer, Others. |
| 4 | Sold To Party | text | 80.4 | 634 | Sold-to customer name. |
| 5 | Party Code | text | 80.4 | 693 | Sold-to/ship-to SAP code, zero-padded to 10 digits (e. |
| 6 | Ship To Party | text | 80.4 | 750 | Ship-to customer name. |
| 7 | Customer | text | 80.4 | 836 | Customer code. |
| 8 | Material | text | 100.0 | 6 | SAP material code. |
| 9 | Sales Office | text | 78.1 | 27 | Sales office / stockyard servicing city (Ahmedabad, Mumbai(HO), Pune, Vijaynagar, etc. |
| 10 | SO-Product Form | text | 78.4 | 29 | Product form on the sales order (S_HRCF, S_GICW, S_CRCACF . |
| 11 | JSW Grade | text | 99.8 | 549 | JSW internal steel grade code (e. |
| 12 | Act.Thickness (mm) | text | 100.0 | 200 | Actual sheet/coil thickness in mm. |
| 13 | Width (mm) | text | 99.8 | 745 | Coil/sheet width in mm. |
| 14 | Batch | text | 99.9 | 6000+ | Batch / coil number (unique per physical coil). |
| 15 | Unrestr.Qty. | number | 100.0 | 5038 | Unrestricted-use stock quantity in metric tonnes (MT) — sellable/available. |
| 16 | In Quality Insp. | number | 100.0 | 1033 | Quantity in quality inspection (MT) — not yet released. |
| 17 | Blocked | number | 100.0 | 233 | Blocked stock quantity (MT) — held, not sellable. |
| 18 | Stock Quantity | number | 100.0 | 5220 | Total stock quantity for the batch (MT) = Unrestricted + In-QI + Blocked. |
| 19 | Usage Decision | text | 82.4 | 17 | QM usage decision: ACCEPT/ACCEPTED/PRIME=good, NCO/REWORK/DEFECTIVE/ARISING=non-prime. |
| 20 | NCO Declared | text | 100.0 | 2 | Non-Conforming Output declared flag: Yes / No. |
| 21 | Next Workcenter | text | 66.8 | 21 | Next planned processing workcenter (CRM*, HRCTL*, PACKING*, DISPATCH, CUST). |
| 22 | Length(mm) | text | 93.8 | 2352 | Cut length in mm (relevant for cut-to-length/sheets). |
| 23 | NCO Reason | text | 27.9 | 143 | Free-text reason a coil is non-conforming / re-graded (e. |
| 24 | UD Remarks | text | 71.5 | 420 | Free-text usage-decision remarks (often truncated/dirty text). |
| 25 | Aging | number | 100.0 | 1275 | Stock aging in days since production. |
| 26 | Production Date | date | 99.9 | 1275 | Date the coil/batch was produced. |
| 27 | Shift | text | 84.7 | 3 | Production shift: A / B / C. |
| 28 | Sales Order No | text | 80.4 | 3681 | Linked sales order number (9-digit). |
| 29 | SO Item Num | text | 100.0 | 121 | Sales order line-item number. |
| 30 | Order Status | text | 80.4 | 7 | Order status: OPEN, CR/HR-Order Completed, ISO Qty Closure, or various Close-* reasons. |
| 31 | Location | text | 48.8 | 4171 | Yard / bay / rack location within the stockyard (free-form codes). |
| 32 | STR No | text | 2.5 | 232 | Stock Transport Requisition number (sparse). |
| 33 | STO No | text | 1.6 | 88 | Stock Transport Order number (sparse). |
| 34 | DO No | text | 11.2 | 1275 | Delivery Order / outbound delivery number (zero-padded). |
| 35 | Shipment | text | 5.1 | 677 | Shipment document number (sparse). |
| 36 | Storage Location | text | 99.9 | 92 | SAP storage location code (4-char, e. |
| 37 | Port Name | text | 1.7 | 4 | Dispatch port for exports (Ennore Bulk Terminal, Goa Port, Kattuppally, Mumbai Port). |
| 38 | UNLOADING POINT | text | 2.1 | 17 | Export unloading port (ANTWERP, JEBEL ALI, COLOMBO. |
| 39 | RECIEVING POINT | text | 1.8 | 11 | Export receiving country (sic spelling). |
| 40 | Purchase Order Number | text | 71.5 | 2319 | Customer purchase-order reference (free text, very dirty — dates, notes, multiple PRs). |
| 41 | Scheduled Status | text | 65.4 | 4 | Despatch scheduling status: SCHEDULED, SCH_LOAD, UNSCHEDULE, UNSCH_LOAD. |
| 42 | Eq. Specification | text | 99.6 | 183 | Equivalent / mapped product specification (e. |
| 43 | Eq. Sub Grade | text | 99.6 | 458 | Equivalent sub-grade under the specification (e. |
| 44 | SO-End Application | text | 72.8 | 154 | End application of the order (AUTO*, API_CT, AGRI, etc. |
| 45 | production workcenter | text | 91.8 | 15 | Workcenter that produced the coil (HSM1/2/3, CRM1APL, HRCTL5-8. |
| 46 | YS in MPa | number | 100.0 | 422 | Yield strength in MPa (numeric, 0 = not tested). |
| 47 | ELONGATION | text | 0.1 | 7 | Elongation % — nearly always blank (0. |
| 48 | Elongation(Mic) | number | 100.0 | 44 | Elongation measurement (numeric). |
| 49 | HARDNESS | text | 51.8 | 423 | Hardness value. |
| 50 | S_ALUMINIUM_PCT | number | 100.0 | 188 | Aluminium content (% by weight). |
| 51 | S_BORON_PCT | number | 100.0 | 31 | Boron content (%). |
| 52 | S_CARBON_PCT | number | 100.0 | 1014 | Carbon content (%). |
| 53 | S_CHROMIUM_PCT | number | 100.0 | 187 | Chromium content (%). |
| 54 | S_COPPER_PCT | number | 100.0 | 100 | Copper content (%). |
| 55 | S_MANGANESE_PCT | number | 100.0 | 431 | Manganese content (%). |
| 56 | S_MOLYBDENUM_PCT | number | 100.0 | 80 | Molybdenum content (%). |
| 57 | S_NICKEL_PCT | number | 100.0 | 52 | Nickel content (%). |
| 58 | S_NIOBIUM_PCT | number | 100.0 | 72 | Niobium content (%). |
| 59 | S_PHOSPHORUS_PCT | number | 100.0 | 91 | Phosphorus content (%) — impurity, kept low. |
| 60 | S_SILICON_PCT | number | 100.0 | 556 | Silicon content (%). |
| 61 | S_SULPHUR_PCT | number | 100.0 | 151 | Sulphur content (%) — impurity, kept low. |
| 62 | S_TITANIUM_PCT | number | 100.0 | 535 | Titanium content (%). |
| 63 | S_VANADIUM_PCT | number | 100.0 | 74 | Vanadium content (%). |
| 64 | Tensile Strength MPa (B) | number | 100.0 | 451 | Tensile strength in MPa (numeric, 0 = not tested). |
| 65 | YIELD STRENGTH | text | 46.6 | 258 | Yield strength (alternate field). |
| 66 | UTS | text | 46.7 | 108 | Ultimate tensile strength (alternate field). |
| 67 | Special Stock | text | 99.3 | 2 | Special stock indicator: E = sales-order stock (made-to-order), Q = project stock. |
| 68 | CP Number | text | 17.4 | 94 | Credit Proposal number tied to the order (sparse). |
| 69 | CP End Date | date | 17.4 | 7 | Credit Proposal validity end date (sparse). |
| 70 | LC Exp Date | text | 1.0 | 21 | Letter-of-Credit expiry date. |
| 71 | Route | text | 76.8 | 249 | Transport route code (e. |
| 72 | Route Desc | text | 76.8 | 248 | Human-readable route description (e. |

## Columns in detail (with up to 50 unique sample values)

### 1. SO Sales Org
Sales order's sales organization: 1001 (JSW Steel) / 1002.

**Type:** text · **Fill:** 78.4% (13,590/17,324) · **Distinct values:** 2

<details><summary>All distinct values (2 shown)</summary>

```
1001, 1002
```
</details>

### 2. Sales Order Type
SAP sales document type. Z* codes: ZISB/ZIST=stock transfer, ZSDP=domestic sale, ZEXP/ZNEX=export, ZSEZ=SEZ/deemed export, ZNCO/ZNCX=non-conforming, ZSAM=sample, ZRE1/ZRE2/ZSRE=returns, ZAUF/ZLOT=auction/lot.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 29

<details><summary>All distinct values (29 shown)</summary>

```
ZAUF, ZCUS, ZCUX, ZDSL, ZDSS, ZEXP, ZFAC, ZFAX, ZFCP, ZFCX, ZIJW, ZISB, ZISC, ZISO, ZIST, ZLOT, ZNCO, ZNCX, ZNEX, ZRE1, ZRE2, ZSAM, ZSDP, ZSDX, ZSEZ, ZSRE, ZSUB, ZSUC, ZVSR
```
</details>

### 3. Distr.Chnl
Distribution channel (text): Retail, OEM, MSME, SBU-A, Auction, SEZ/Deemed Export, Stock Transfer, Others.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 8

<details><summary>All distinct values (8 shown)</summary>

```
Auction, MSME, OEM, Others, Retail, SBU-A, SEZ/Deemed Export, Stock Transfer
```
</details>

### 4. Sold To Party
Sold-to customer name.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 634

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
5B Services India Private Limited, A-one Gold Pipes and Tubes Private, A.M.S. Steel Company, A.R.ENTERPRISES, AJAX ENGINEERING LIMITED, AL Ghurair Iron & Steel Llc, AL Hadid Steel Impex, ANAV INFRA STEEL PRIVATE LIMITED, ANAYAH STEEL, APCO INFRATECH PRIVATE LIMITED, APL APOLLO BUILDING PRODUCTS LTD, ARCH ROOF, ARDEE ENGINEERING LIMITED, ARS COATED STEEL, ASIAN COLOUR COATED ISPAT LIMITED, AZEEM STEEL, Aakaf Steel Private Limited, Aarav Industries, Abco Steel International Pvt Ltd, Abhijeet Engineers, Ackroll Industries, Adinath Enterprises, Aegis Manufacturing Systems, Agarwal Steel Enterprises, Ajay Metalloys Pvt Ltd, Ajmal Steel Tubes & Pipes Industrie, Alampally Brothers Limited, Albasider Spa, Alphonso Steel Pvt Ltd, Amafhh Steels, Amba Enterprises Ltd, Amitasha Enterprises P Ltd, Ammann India Private Limited, Andhra Ispat Udyog, Andritz Hydro Private Limited, Ankit Enterpirses, Ans Steel Tubes Limited, Ans Steel Tubes Ltd, Anuj Steels, Apex Auto Limited, Apl Apollo Tubes Limited, Apl Apollo Tubes Limited Unit-ii, Apl Apollo Tubes Ltd, Apollo Coated Products Private Limi, Aquasub Engineering, Arcedges Building India Llp, Arcelormittal Neel Tailored Blanks, Arihant Steel Corporation, Asahi Steel, Ashok Leyland Limited
```
</details>

### 5. Party Code
Sold-to/ship-to SAP code, zero-padded to 10 digits (e.g. 0000008001). Strip leading zeros to match the 'Customer' column.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 693

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0000001202, 0000001441, 0000001478, 0000008001, 0000008002, 0000008007, 0000008009, 0000008010, 0000008017, 0000008052, 0000008101, 0000008102, 0000008104, 0000008105, 0000008106, 0000008107, 0000008108, 0000008110, 0000008112, 0000008115, 0000008116, 0000008117, 0000008118, 0000008122, 0000008123, 0000008124, 0000008125, 0000008127, 0000008133, 0000008134, 0000008137, 0000008139, 0000008140, 0000008142, 0000008146, 0000008147, 0000008161, 0000008417, 0000008428, 0000008441, 0000008445, 0000008451, 0000008455, 0000008465, 0000008469, 0000008478, 0000008479, 0000008480, 0000008481, 0000008491
```
</details>

### 6. Ship To Party
Ship-to customer name.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 750

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
5B Services India Private Limited, A-one Gold Pipes and Tubes Private, A.M.S. Steel Company, A.R.ENTERPRISES, AD CONSTRUCTION, ADINATH ENTERPRISES, AJAX ENGINEERING LIMITED, AKEYEM SONS METAL FORMS PRIVATE LIM, AL Ghurair Iron & Steel Llc, AL Hadid Steel Impex, ANAV INFRA STEEL PRIVATE LIMITED, ANAYAH STEEL, ANKIT CONSTRUCTIONS, APCO INFRATECH PRIVATE LIMITED, APL APOLLO BUILDING PRODUCTS LTD, ARCH ROOF, ARMES MAINI STORAGE SYSTEMS PRIVATE, ASIAN COLOUR COATED ISPAT LIMITED, ASWARTHA CONDITION MONITORING ENGNE, ATULIT TECHNOLOGY PRIVATE LIMITED, AZEEM STEEL, Aakaf Steel Private Limited, Abco Steel International Pvt Ltd, Abhijeet Engineers, Ackroll Industries, Adinath Enterprises, Aegis Manufacturing Systems, Agarwal Steel Enterprises, Ajmal Steel Tubes & Pipes Industrie, Akeyem Sons Metal Forms Private Lim, Alampally Brothers Limited, Albasider Spa, Alphonso Steel Private Limited, Amafhh Steels, Amba Enterprises Ltd, Ammann India Private Limited, Andhra Ispat Udyog, Ankit Enterpirses, Ans Steel Tubes Limited, Ans Steel Tubes Ltd, Anuj Steels, Apex Auto Limited, Apl Apollo Tubes Limited, Apl Apollo Tubes Limited Unit-ii, Apl Apollo Tubes Ltd, Apollo Coated Products Private Limi, Aquasub Engineering, Arcedges Building India Llp, Arcelormittal Neel Tailored Blanks, Aria Industries
```
</details>

### 7. Customer
Customer code. Mix of short plant codes (1202, 8001) and 8-digit external codes (40xxxxxx). JOIN KEY to the other two files.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 836

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1202, 1441, 1478, 40000088, 40000166, 40000183, 40000280, 40000404, 40000406, 40000431, 40000518, 40000555, 40000585, 40000590, 40000609, 40000635, 40000645, 40000655, 40000656, 40000658, 40000691, 40000709, 40000713, 40000724, 40000729, 40000734, 40000741, 40000771, 40000840, 40000842, 40000879, 40000880, 40000936, 40000957, 40000966, 40001027, 40001053, 40001060, 40001138, 40001141, 40001143, 40001169, 40001216, 40001221, 40001271, 40001283, 40001304, 40001325, 40001355, 40001384
```
</details>

### 8. Material
SAP material code. S_HRCF=HR Coil, S_HRCW=HR Coil (W), S_HRCTLF/S_HRCTLW=HR Cut-To-Length, S_HRSLCW=HR Slit Coil, S_HRTCW. All Hot-Rolled here.

**Type:** text · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 6

<details><summary>All distinct values (6 shown)</summary>

```
S_HRCF, S_HRCTLF, S_HRCTLW, S_HRCW, S_HRSLCW, S_HRTCW
```
</details>

### 9. Sales Office
Sales office / stockyard servicing city (Ahmedabad, Mumbai(HO), Pune, Vijaynagar, etc.).

**Type:** text · **Fill:** 78.1% (13,532/17,324) · **Distinct values:** 27

<details><summary>All distinct values (27 shown)</summary>

```
Ahmedabad, Aurangabad, Bangalore, Chandigarh, Chennai, Cochin, Coimbatore, Cuttack, Delhi, Faridabad, Ghaziabad, Hubli, Hyderabad, Indore, Jaipur, Kanpur, Kolkata, Ludhiana, Mangalore, Mumbai(HO), Nagpur, Patna, Pune, Raipur, Rudrapur, Vijayawada, Vijaynagar
```
</details>

### 10. SO-Product Form
Product form on the sales order (S_HRCF, S_GICW, S_CRCACF ... CR/GI/GA/GL/HR variants).

**Type:** text · **Fill:** 78.4% (13,589/17,324) · **Distinct values:** 29

<details><summary>All distinct values (29 shown)</summary>

```
S_CRCACF, S_CRCACW, S_CRCARCW, S_CRCASF, S_CRFHCF, S_GACF, S_GACW, S_GASF, S_GICF, S_GICW, S_GLCF, S_HRCF, S_HRCTLF, S_HRCW, S_HRPKLCF, S_HRPKLSF, S_HRPOCW, S_HRSPOCW, S_HSAWPF, S_HSAW_PIPE, S_NOFPCF, S_NOFPCW, S_NOSPCF, S_NOSPCW, S_NOSPRCW, S_NOSPSF, S_PPGLCF, S_ZMCF, S_ZMCW
```
</details>

### 11. JSW Grade
JSW internal steel grade code (e.g. CS, HR50, JVH*, JDH*). 549 distinct grades.

**Type:** text · **Fill:** 99.8% (17,284/17,324) · **Distinct values:** 549

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
5M10P1, 5M35P1, 5M35P2, 5M47P2, 5M47P4, 5M53P1, 5M70H1, CAD110, CAU130, CAU210, CAU222, CAU326, CAU661, CAU899, CDR121, CEX160, CGN212, CS, GAU239, GAU659, GAU861, GAU898, HR50, HRB50, HRC50, JDHASM5AE0, JDHAWM3AJ0, JDHC422N0F, JDHC659T0S, JDHCP41ATN, JDHG210T0F, JDHSL02A00, JDHSN02A00, JDHST01A00, JDHST01B00, JDHST01C00, JDHVJ34ALZ, JDHZ932NA0, JDHZ935N00, JVHBH01A0S, JVHBQ02A00, JVHBQ03E0S, JVHBQ07B0S, JVHBQ07D0S, JVHBQ08A0S, JVHBQA1A0S, JVHBQS8A0S, JVHC120N00, JVHC120NA0, JVHC120T00
```
</details>

### 12. Act.Thickness (mm)
Actual sheet/coil thickness in mm. STORED AS TEXT (formatted to 3 decimals, e.g. '0.750'). Sort numerically with care.

**Type:** text · **Fill:** 100.0% (17,318/17,324) · **Distinct values:** 200

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.750, 1.500, 1.600, 1.700, 1.800, 1.850, 1.900, 1.930, 1.950, 1.960, 10.000, 10.100, 10.300, 10.500, 10.650, 10.700, 10.800, 11.000, 11.300, 11.500, 11.600, 11.700, 11.800, 11.900, 12.000, 12.100, 12.200, 12.500, 12.550, 12.700, 12.850, 13.000, 13.200, 13.500, 13.600, 13.700, 13.800, 14.000, 14.100, 14.200, 14.300, 14.500, 14.600, 14.800, 15.000, 15.500, 15.600, 15.800, 16.000, 16.850
```
</details>

### 13. Width (mm)
Coil/sheet width in mm. STORED AS TEXT. NOTE: this column contains the malformed value that breaks openpyxl ('1.057.000') — read with a tolerant parser.

**Type:** text · **Fill:** 99.8% (17,288/17,324) · **Distinct values:** 745

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1000.000, 1002.000, 1003.000, 1004.000, 1005.000, 1006.000, 1008.000, 1009.000, 1010.000, 1011.000, 1012.000, 1015.000, 1016.000, 1018.000, 1019.000, 1020.000, 1022.000, 1024.000, 1025.000, 1026.000, 1027.000, 1028.000, 1029.000, 1030.000, 1032.000, 1035.000, 1039.000, 1040.000, 1041.000, 1042.000, 1045.000, 1046.000, 1047.000, 1048.000, 1050.000, 1051.000, 1052.000, 1053.000, 1054.000, 1055.000, 1056.000, 1058.000, 1059.000, 1060.000, 1061.000, 1062.000, 1063.000, 1064.000, 1065.000, 1066.000
```
</details>

### 14. Batch
Batch / coil number (unique per physical coil). ~6000+ distinct values.

**Type:** text · **Fill:** 99.9% (17,303/17,324) · **Distinct values:** 6000+

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0CH00209, 131S1N004, 1354959004, 1357202205, 1357202206, 1357809307, 149S30885, 14CS30308, 151S31644, 151S31645, 151S31646, 151S31647, 151S31648, 151S31649, 151S31650, 151S31651, 151S31705, 151S31706, 151S31707, 151S31708, 151S31709, 151S31710, 151S31711, 151S31712, 1550913701, 1600907101, 165S30844, 165S30857, 175S30466, 17685674, 17685806, 17689212, 17JB01340, 1811510R, 18500326, 18500328, 18500329, 18500330, 1856816106, 18632847, 18H00152, 1915888702, 1950103903, 1951222904, 1954590401, 1964023703, 1964262105, 1964329203, 1966986904, 2001721702
```
</details>

### 15. Unrestr.Qty.
Unrestricted-use stock quantity in metric tonnes (MT) — sellable/available. Can be negative (correction).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 5038 · **Range:** -5.38 … 377.415

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-5.38, 0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.047, 0.048, 0.049
```
</details>

### 16. In Quality Insp.
Quantity in quality inspection (MT) — not yet released.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 1033 · **Range:** 0 … 34.89

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.085, 0.17, 0.195, 0.245, 0.295, 0.325, 0.36, 0.375, 0.38, 0.45, 0.47, 0.495, 0.5, 0.505, 0.575, 0.59, 0.595, 0.615, 0.68, 0.71, 0.715, 0.725, 0.74, 0.76, 0.8, 0.805, 0.81, 0.89, 0.92, 0.945, 0.955, 0.96, 0.97, 0.99, 1.0, 1.01, 1.03, 1.09, 1.145, 1.15, 1.155, 1.16, 1.18, 1.185, 1.19, 1.2, 1.26
```
</details>

### 17. Blocked
Blocked stock quantity (MT) — held, not sellable.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 233 · **Range:** 0 … 37.29

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.008, 4.775, 5.015, 5.45, 6.175, 10.85, 13.11, 13.935, 14.015, 14.53, 14.545, 15.275, 15.33, 15.38, 15.47, 15.49, 15.52, 15.53, 15.575, 15.65, 15.965, 16.035, 16.105, 16.2, 16.305, 16.31, 16.44, 16.615, 16.71, 16.73, 16.77, 16.86, 17.08, 17.21, 17.315, 17.635, 17.73, 17.79, 17.83, 17.86, 18.22, 18.24, 18.3, 18.32, 18.35, 18.535, 18.55, 18.62, 18.66
```
</details>

### 18. Stock Quantity
Total stock quantity for the batch (MT) = Unrestricted + In-QI + Blocked.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 5220 · **Range:** 0 … 377.415

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.047, 0.048, 0.049, 0.05
```
</details>

### 19. Usage Decision
QM usage decision: ACCEPT/ACCEPTED/PRIME=good, NCO/REWORK/DEFECTIVE/ARISING=non-prime. Single-letter codes (D,E,K,K1,N2) are SAP UD codes.

**Type:** text · **Fill:** 82.4% (14,267/17,324) · **Distinct values:** 17

<details><summary>All distinct values (17 shown)</summary>

```
ACCEPT, ACCEPTED, ARISING, COMMERCIAL, D, DEFECTIVE SHEET, E, K, K1, N2, NCO, NCO - DEFECT IN PACKET / COIL, NCO - NPF - REWORK, PRIME, PRIME NCO, REWORK, SEQ 1ST SLAB
```
</details>

### 20. NCO Declared
Non-Conforming Output declared flag: Yes / No.

**Type:** text · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 2

<details><summary>All distinct values (2 shown)</summary>

```
No, Yes
```
</details>

### 21. Next Workcenter
Next planned processing workcenter (CRM*, HRCTL*, PACKING*, DISPATCH, CUST). 'X'=none.

**Type:** text · **Fill:** 66.8% (11,570/17,324) · **Distinct values:** 21

<details><summary>All distinct values (21 shown)</summary>

```
CRM1CGL2, CRM1CPL2, CRM1PTM1, CRM2PTM2, CTL, CUST, DISPATCH, FG-DISP, HRCTL5, HRCTL6, HRCTL7, HRCTL8, HSM2HRS2, PACKING, PACKING2, PACKING3, SPCL, SPCLHRS1, SUBCONWC, VSORT5, X
```
</details>

### 22. Length(mm)
Cut length in mm (relevant for cut-to-length/sheets). STORED AS TEXT.

**Type:** text · **Fill:** 93.8% (16,255/17,324) · **Distinct values:** 2352

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.000, 100.000, 1000.000, 10000.000, 1001.000, 1001493.000, 1002.000, 1003.000, 1004.000, 1004073.000, 1005.000, 10050.000, 100614.000, 10065.000, 1006749.000, 1006764.000, 1007.000, 1007716.000, 1008939.000, 1009.000, 101.000, 1010.000, 10100.000, 1010447.000, 1011.000, 1011640.000, 1012.000, 1012436.000, 1012576.000, 1012599.000, 1012647.000, 1013.000, 10130.000, 1013952.000, 1014.000, 1015.000, 1016.000, 1018.000, 1018064.000, 1019.000, 1019070.000, 102.000, 1020.000, 10204.000, 1020550.000, 1020912.000, 1021.000, 1022.000, 1023.000, 1024.000
```
</details>

### 23. NCO Reason
Free-text reason a coil is non-conforming / re-graded (e.g. 'EDGE CUT', 'CLASS CHANGE', 'HANDLING DAMAGE').

**Type:** text · **Fill:** 27.9% (4,833/17,324) · **Distinct values:** 143

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
ADDITIONAL TEST REQUIRED, AS PER CSD, AS PER SHIVA MAIL >90 DAYS, AUCTION ROUTE-AS PER AKHIL CSD, AXA EDGE ROUND THE COIL ON CEN, BABY COIL, BODY SLIVERS, C, CLASS CHANGE, CLASS CHANGE - AS PER ARNAV, CLASS CHANGE - AS PER NIZAM, CLASS CHANGE - CRM REJECT, CLASS CHANGE - OLD AGE BTT COI, CLASS CHANGE AS PER ISP ASHOK, CLASS CHANGE AS PER SYED PPC, CLASS CHANGED, CLASS CHG CRM REJECTED, CLASS CHG FOR SCAB, CLASS DECISION CHANGED LATER D, CLASS DEVIATION, COIL TOPPLED, COILING TEMPERATURE HIGH., CONICAL TELESCOPICITY, CRFH LIQUIDATION AS PER VISHAL, CRM REJ SAM SIR APPROVED, CRM RETURN REINSP, CT VARIATION, CUSTOMER REJECTED COILS, DENT MARKS FROM MILLL4-CTL, EDGE BUILD UP PROFILE, EDGE BURST, EDGE CUT, EDGE CUT/FOLD/DAMAGE (DC)., EDGE DAMAGE, EDGE SLIVER O/S ON TOPL3-CTL, ELIPTICAL COIL, EXCESS WEIGHT, EXIT CHAIN MARKSL3-CTL, FOR CTL SCHEDULE, FS APRON MARKSL2, FS APRON MARKSL3-CTL, FT VARIATION, GAS CUTTING DONE DUE TO RESAMP, GRADE CHANGE, GRADE CHANGED, GRADE MISMATCH, GRADE NOT MATCHED, GRCK, HANDLING DAMAGE, HANDLING DAMAGE.
```
</details>

### 24. UD Remarks
Free-text usage-decision remarks (often truncated/dirty text).

**Type:** text · **Fill:** 71.5% (12,391/17,324) · **Distinct values:** 420

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
,EDGE CUT AND OVER WT, -CTL, 2 SERIES PACKETS, 4 WRAPS ID SHIFTING, GAS CUTTI, 8 WRAP OPEN, ALEL3-CTL, ALREADY PROCESSED, AMAGE- CTL, AMAGEL3-CTL, ANDLING SCRATCHES MEDIUM - CTL, ARKS FROM CTLL2-CTL, ARKS FROM CTLL3-CTL, ARKS FROM MILLL3-CTL, ARKS FROM MILLL4-CTL, AS PER AMIYA MAIL,EDGE CUT, AS PER CSD MAIL, AS PER HSM MAIL, AS PER KRISHNA SWAMY, AS PER PPC, AS PER PPC MAIL, AS PER PPC MAIL SENT TO HSM, AS PER SMS HIGH C, AUCTION ROUTE-AS PER AKHIL CSD, AXA EDGE ROUND THE COIL ON CEN, BABY COIL, BH, BODY SLIVERS, BURR ISSUES, CBLL2-CTL, CBLL3-CTL, CENTER BUCKING, CENTRE BUCKLING AT THE MIDDLE, CHAMBER-CTL, CLASS CHANGE FOR LAMN, CLASS DECISION CHANGED LATER D, CLEARED AS PER RAKESH SHUKLA, COIL ALREADY PROCESSED, COIL ALREADY ROLLED, COIL HANDLING S, COIL NOT AVAILABL AT YMS, COIL NOT AVAILABLE AT YMS, COIL NOT AVAILABLE IN YMS, COIL NOT FOUND, COIL NOT RECIVED IN HR YMS, COIL SCRATCHES HEAVY - CTL, COIL TOPPLED,HANDLING DAMAGE, COILING TEMPERATURE HIGH., COILING TEMPERATURE LOW., COLD/ BLACK SPOT, COMMERCIAL
```
</details>

### 25. Aging
Stock aging in days since production. Range 0..998. (Some fractional values present — data quirk.)

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 1275 · **Range:** 0 … 998

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0, 1, 1.003, 1.004, 1.005, 1.012, 1.022, 1.023, 1.032, 1.047, 1.057, 1.058, 1.059, 1.061, 1.062, 1.067, 1.07, 1.071, 1.079, 1.081, 1.082, 1.084, 1.085, 1.086, 1.09, 1.096, 1.1, 1.101, 1.103, 1.104, 1.106, 1.107, 1.108, 1.11, 1.111, 1.113, 1.114, 1.115, 1.116, 1.12, 1.121, 1.122, 1.123, 1.126, 1.135, 1.136, 1.143, 1.152, 1.154, 1.156
```
</details>

### 26. Production Date
Date the coil/batch was produced.

**Type:** date · **Fill:** 99.9% (17,303/17,324) · **Distinct values:** 1275

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
2013-03-31T00:00:00, 2013-04-06T00:00:00, 2013-04-09T00:00:00, 2013-04-29T00:00:00, 2013-05-05T00:00:00, 2013-05-06T00:00:00, 2013-05-09T00:00:00, 2013-05-12T00:00:00, 2013-05-16T00:00:00, 2013-05-20T00:00:00, 2013-06-01T00:00:00, 2013-06-22T00:00:00, 2013-06-28T00:00:00, 2013-07-12T00:00:00, 2013-08-02T00:00:00, 2014-03-28T00:00:00, 2014-09-12T00:00:00, 2014-09-17T00:00:00, 2014-12-02T00:00:00, 2014-12-16T00:00:00, 2014-12-17T00:00:00, 2015-01-04T00:00:00, 2015-01-23T00:00:00, 2015-01-25T00:00:00, 2015-02-04T00:00:00, 2015-04-29T00:00:00, 2015-05-20T00:00:00, 2015-05-22T00:00:00, 2015-05-28T00:00:00, 2015-06-23T00:00:00, 2015-06-27T00:00:00, 2015-07-04T00:00:00, 2015-07-06T00:00:00, 2015-07-31T00:00:00, 2015-08-30T00:00:00, 2015-08-31T00:00:00, 2015-09-01T00:00:00, 2015-09-05T00:00:00, 2015-09-06T00:00:00, 2015-10-18T00:00:00, 2015-11-03T00:00:00, 2015-11-12T00:00:00, 2016-01-27T00:00:00, 2016-05-07T00:00:00, 2016-05-24T00:00:00, 2016-09-04T00:00:00, 2016-12-07T00:00:00, 2017-04-25T00:00:00, 2017-06-01T00:00:00, 2017-06-02T00:00:00
```
</details>

### 27. Shift
Production shift: A / B / C.

**Type:** text · **Fill:** 84.7% (14,680/17,324) · **Distinct values:** 3

<details><summary>All distinct values (3 shown)</summary>

```
A, B, C
```
</details>

### 28. Sales Order No
Linked sales order number (9-digit). Blank = unallocated free stock.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 3681

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
400137058, 400154716, 400155771, 400187827, 400199357, 400212361, 400252064, 400352826, 400417465, 400510231, 400622024, 400648570, 400796476, 400827809, 400843014, 400861409, 400943835, 400948451, 401037433, 401132585, 401223605, 401226199, 401254199, 401260852, 401263013, 401308155, 401329487, 401396670, 401457027, 401461542, 401507058, 401553625, 401565355, 401576313, 401584518, 401599791, 401612631, 401622344, 401637576, 401642823, 401653461, 401653474, 401686578, 401699214, 401711105, 401716559, 401717480, 401717559, 401764349, 401766559
```
</details>

### 29. SO Item Num
Sales order line-item number.

**Type:** text · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 121

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0, 10, 100, 1070, 11, 110, 1100, 1110, 1120, 1190, 12, 120, 1230, 13, 130, 1330, 140, 1410, 1420, 1430, 1440, 1460, 1470, 1490, 150, 1550, 160, 1610, 1620, 1640, 170, 1770, 1780, 1790, 180, 1800, 1810, 1820, 1840, 190, 1980, 20, 200, 2030, 2080, 21, 210, 2100, 2130, 2140
```
</details>

### 30. Order Status
Order status: OPEN, CR/HR-Order Completed, ISO Qty Closure, or various Close-* reasons.

**Type:** text · **Fill:** 80.4% (13,926/17,324) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
CR/HR-Order Completed, Close-Customer cancels order w, Close-Order short closed, Close-Price validity is over, Close-Unreasonable request of, ISO Qty Closure, OPEN
```
</details>

### 31. Location
Yard / bay / rack location within the stockyard (free-form codes).

**Type:** text · **Fill:** 48.8% (8,448/17,324) · **Distinct values:** 4171

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
118, 136, 137, 156, 160, 161, 162, 165, 25I, 27P, 29P, 45, 66, 76, 83, 92, 96, A25, A26, A27, A28, A29, A30, A31, A34, A37, A39, A41, A42, AB10, AB19, AB19E, AB20E, AB21E, AB22E, AB23D, AB23E, AB24E, AB42L, AB43L, AB43M, AB43N, ACLAB10.1, B25, B26, B27, B28, B29, B30, B34
```
</details>

### 32. STR No
Stock Transport Requisition number (sparse).

**Type:** text · **Fill:** 2.5% (440/17,324) · **Distinct values:** 232

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1701495305, 1701495308, 1701495470, 1701495471, 6143686341, 6200143923, 6200148650, 6200152001, 6200183910, 6200184786, 6200516355, 6200603456, 6200798841, 6200799508, 6200813846, 6200883799, 6201578404, 6201966188, 6202087104, 6202402276, 6202831666, 6202925864, 6202938435, 6202938439, 6202961400, 6203000967, 6203025162, 6203031574, 6203070381, 6203087050, 6203146052, 6203171635, 6203175075, 6203219383, 6203232111, 6203251623, 6203270881, 6203278778, 6203286062, 6203303994, 6203309170, 6203313501, 6203313502, 6203313503, 6203313550, 6203317319, 6203318101, 6203320258, 6203347046, 6203348668
```
</details>

### 33. STO No
Stock Transport Order number (sparse).

**Type:** text · **Fill:** 1.6% (279/17,324) · **Distinct values:** 88

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
4400228806, 4400251922, 4400252582, 4400253135, 4400255014, 4400259866, 4400259872, 4400265903, 4400265980, 4400268266, 4400272071, 4400272889, 4400278380, 4400285685, 4400299888, 4400301956, 4400304618, 4400311464, 4400313476, 4400317466, 4400321399, 4400323060, 4400329639, 4400334424, 4400335402, 4400335611, 4400342727, 4400347624, 4400350111, 4400350448, 4400350720, 4400350824, 4400351335, 4400354812, 4400355951, 4400356118, 4400358678, 4400359114, 4400359743, 4400360263, 4400363580, 4400364558, 4400365233, 4400365526, 4400366327, 4400370717, 4400371127, 4400371821, 4400374568, 4400375176
```
</details>

### 34. DO No
Delivery Order / outbound delivery number (zero-padded).

**Type:** text · **Fill:** 11.2% (1,933/17,324) · **Distinct values:** 1275

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0000000002, 0701948910, 0702741600, 0703617927, 0705348082, 0705348109, 0705375595, 0705378804, 0705378805, 0705378808, 0705378812, 0706412918, 0710011953, 0711268278, 0711502327, 0711659076, 0711660850, 0711660853, 0711660855, 0711660862, 0711660865, 0711660867, 0711660870, 0711660873, 0711660874, 0711660876, 0711660877, 0711660879, 0711660882, 0711660884, 0711675230, 0712157342, 0713237728, 0713548742, 0713877828, 0714611970, 0715054638, 0715792848, 0715803383, 0715806508, 0715844774, 0715846113, 0715855723, 0715905568, 0715913335, 0715974793, 0716032431, 0716197727, 0716198003, 0716200379
```
</details>

### 35. Shipment
Shipment document number (sparse).

**Type:** text · **Fill:** 5.1% (879/17,324) · **Distinct values:** 677

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0000975572, 0001890925, 0002829051, 0002829065, 0002844220, 0002846321, 0002846322, 0002846325, 0002846328, 0006855830, 0007004110, 0008956360, 0009578635, 0010527189, 0010542923, 0010542930, 0010578459, 0010578465, 0010587281, 0010883920, 0010883964, 0010935599, 0010940602, 0011250934, 0011570327, 0011611497, 0011676635, 0011684285, 0011731721, 0011736660, 0011911674, 0012054270, 0012087182, 0012229327, 0012245128, 0012245132, 0012245999, 0012383300, 0012389107, 0012425451, 0012455371, 0012478819, 0012555902, 0012567165, 0012577788, 0012610311, 0012636631, 0012642613, 0012680116, 0012756064
```
</details>

### 36. Storage Location
SAP storage location code (4-char, e.g. C2HR, D101).

**Type:** text · **Fill:** 99.9% (17,303/17,324) · **Distinct values:** 92

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
ACSI, ACSR, ASP1, ASP2, ASS1, BATT, BWP2, C1AC, C1CD, C1PQ, C2HR, C2LM, C2MN, C2PQ, CAS1, CBW1, CKT1, CPHR, CRS3, CSSI, D101, D102, D104, D105, D106, D117, D118, D119, D120, D122, D123, D124, D126, D130, D135, D136, D137, D140, D146, D148, D152, D153, D154, D161, D172, D173, D175, D177, D183, D184
```
</details>

### 37. Port Name
Dispatch port for exports (Ennore Bulk Terminal, Goa Port, Kattuppally, Mumbai Port). Very sparse.

**Type:** text · **Fill:** 1.7% (300/17,324) · **Distinct values:** 4

<details><summary>All distinct values (4 shown)</summary>

```
Ennore Bulk Terminal, Goa Port, Kattuppally Port, Mumbai Port
```
</details>

### 38. UNLOADING POINT
Export unloading port (ANTWERP, JEBEL ALI, COLOMBO...). Very sparse.

**Type:** text · **Fill:** 2.1% (365/17,324) · **Distinct values:** 17

<details><summary>All distinct values (17 shown)</summary>

```
ABU DHABI, ANCONA, ANTWERP, Antwerp, BILBAO, BRISTOL, COLOMBO, JEBEL ALI, KOBE, MARGHERA, MARINA DI CARRARA, NA, RAVENNA, SAGUNTO, TARRAGONA, VIjaynagar, vijayanagar
```
</details>

### 39. RECIEVING POINT
Export receiving country (sic spelling). Very sparse.

**Type:** text · **Fill:** 1.8% (305/17,324) · **Distinct values:** 11

<details><summary>All distinct values (11 shown)</summary>

```
BELGIUM, Belgium, ITALY, JAPAN, SPAIN, SRI LANKA, UNITED ARAB EMIRATES, UNITED KINGDOM, United Kingdom, VIjaynagar, vijayanagar
```
</details>

### 40. Purchase Order Number
Customer purchase-order reference (free text, very dirty — dates, notes, multiple PRs).

**Type:** text · **Fill:** 71.5% (12,393/17,324) · **Distinct values:** 2319

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
 HRCW to HRCF, (Ashok Leyland )Aug-22, ., .PAH-932801, 00013263, 00014580, 00017930, 00020475, 00021104, 00024815, 00025379, 00051995, 00052037, 00052261, 001, 002/26-27, 1 Goa Pending Order, 1.75mm COIL, 100055780, 100063183, 1018 / 31.03.2026, 1030, 7.7mm - May'24, 1100001347, 1100001361, 1100001384, 1100001418, 1100002772, 1100008218, 1100008967, 1101121028, 1103565, 1103587, 1103607, 1103609, 1103669, 1103671, 1103675, 1103684, 1103687, 1103689, 1103694, 1103696, 1207, 123, 1250 width for HSM2&3, 13 MTPA Project, 13/5, 1452509887, 1452514366, 184855, 184859
```
</details>

### 41. Scheduled Status
Despatch scheduling status: SCHEDULED, SCH_LOAD, UNSCHEDULE, UNSCH_LOAD.

**Type:** text · **Fill:** 65.4% (11,328/17,324) · **Distinct values:** 4

<details><summary>All distinct values (4 shown)</summary>

```
SCHEDULED, SCH_LOAD, UNSCHEDULE, UNSCH_LOAD
```
</details>

### 42. Eq. Specification
Equivalent / mapped product specification (e.g. EN 10025 variants, IS specs, customer specs).

**Type:** text · **Fill:** 99.6% (17,254/17,324) · **Distinct values:** 183

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
-, 10025, 10025_2_2005, 10025_2_2011, 10025_2_2019, 10025_5_2004, 1006, 1008, 10083_3_2005, 10111, 10111_2005, 10111_2008, 10130_2006, 10132_2_2005, 10149, 10149_2_2005, 10149_2_2013, 1026, 10268_2006, 1030, 10338_2015, 10346, 10346_2009, 10346_2015, 10748, 10748_2004, 1079_2017, 11513_2017, 15391_2003, 15914_2011, 15961_2012, 17100, 18316_2023, 18513_2023, 2002_2009, 2062_2011, 277_2018, 30V, 3183_2019, 3502_2004, 3502_2009, 3589, 36V, 4011, 4011S4, 4011_S2, 4011_S3, 4011_S4, 4011_S5, 4011_S6
```
</details>

### 43. Eq. Sub Grade
Equivalent sub-grade under the specification (e.g. 1010, A36, 50C470).

**Type:** text · **Fill:** 99.6% (17,252/17,324) · **Distinct values:** 458

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
1006, 1008, 1010, 1010_JD49, 1015, 1020, 1021, 1026, 1045, 1060, 1065, 16MNCR5, 180LS, 1932_12, 1953_12, 1E1863, 20MNB5, 22MNB5, 30MNB5, 35C270, 35C360, 400-100-TF, 500, 50C1000, 50C350, 50C400, 50C470, 50C530, 50C600, 50C700, 50C800, 50SP1050, 50SP660, 50SP890, 60, 6000_12, 850LA, A, A06ZJSW, A36, ASTM_606_4, BH180, BH195, BH220, BSK46, BSK46_M, CLASS1, COMMERCIAL_01, CR, CR0
```
</details>

### 44. SO-End Application
End application of the order (AUTO*, API_CT, AGRI, etc.). 154 distinct.

**Type:** text · **Fill:** 72.8% (12,605/17,324) · **Distinct values:** 154

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
AGRI, API_CT, AS, AUTO, AUTOMOBILE_COMPONENT, AUTOMOTIVE_STEERING_, AUTO_CHASSIS, AUTO_CR, AUTO_CS, AUTO_CSL, AUTO_CSM, AUTO_EXP, AUTO_EXP_CRITICAL, AUTO_EXP_CR_EIF_JFE, AUTO_EXP_CR_FIF, AUTO_EXP_CR_FIF_JFE, AUTO_EXP_CR_JSW, AUTO_EXP_DIF_JFE, AUTO_EXP_DIF_TA, AUTO_EXP_EIF, AUTO_EXP_FIF, AUTO_EXP_FIF_JFE, AUTO_EXP_FIF_TA, AUTO_EXP_HIF_JFE, AUTO_EXP_HIF_TA, AUTO_EXP_HN, AUTO_EXP_SBO, AUTO_EXP_TA, AUTO_EXP_TA_TW, AUTO_EXP_TW, AUTO_HYDRO, AUTO_INT, AUTO_INT_CR, AUTO_INT_DIF, AUTO_INT_DIF_JFE, AUTO_INT_DIF_TA, AUTO_INT_EIF_TA, AUTO_INT_FIF, AUTO_INT_FIF_TA, AUTO_INT_HIF, AUTO_INT_HIF_JFE, AUTO_INT_HIF_TA, AUTO_INT_HN, AUTO_INT_IF, AUTO_INT_JFE, AUTO_INT_TA, AUTO_MC, AUTO_SAFETY, AUTO_STRL, AUTO_WHEELS
```
</details>

### 45. production workcenter
Workcenter that produced the coil (HSM1/2/3, CRM1APL, HRCTL5-8...).

**Type:** text · **Fill:** 91.8% (15,905/17,324) · **Distinct values:** 15

<details><summary>All distinct values (15 shown)</summary>

```
CRM1APL, CRM1PTM1, HRCTL5, HRCTL6, HRCTL7, HRCTL8, HSM1, HSM2, HSM2APL6, HSM2HRS2, HSM3, PACKING2, SPCLAPL, SPCLCRS3, SPCLHRS1
```
</details>

### 46. YS in MPa
Yield strength in MPa (numeric, 0 = not tested).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 422 · **Range:** 0 … 877

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 230.0, 231.0, 233.0, 235.0, 240.0, 241.0, 243.0, 245.0, 246.0, 247.0, 250.0, 251.0, 253.0, 254.0, 255.0, 256.0, 258.0, 260.0, 261.0, 262.0, 263.0, 264.0, 265.0, 266.0, 267.0, 268.0, 269.0, 270.0, 271.0, 272.0, 273.0, 274.0, 275.0, 276.0, 277.0, 278.0, 279.0, 280.0, 281.0, 282.0, 283.0, 284.0, 285.0, 286.0, 287.0, 288.0, 289.0, 290.0, 291.0
```
</details>

### 47. ELONGATION
Elongation % — nearly always blank (0.1% filled); the populated metric is 'Elongation(Mic)'.

**Type:** text · **Fill:** 0.1% (9/17,324) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
28.40, 31.00, 32.00, 33.00, 34.00, 36.00, 37.80
```
</details>

### 48. Elongation(Mic)
Elongation measurement (numeric).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 44 · **Range:** 0 … 62

<details><summary>All distinct values (44 shown)</summary>

```
0.0, 12.0, 13.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 27.0, 28.0, 29.0, 30.0, 31.0, 32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0, 39.0, 40.0, 41.0, 42.0, 42.3, 43.0, 44.0, 45.0, 46.0, 47.0, 48.0, 49.0, 50.0, 51.0, 52.0, 55.0, 62.0
```
</details>

### 49. HARDNESS
Hardness value. STORED AS TEXT (leading-space dirty values present).

**Type:** text · **Fill:** 51.8% (8,975/17,324) · **Distinct values:** 423

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
    366, 230, 231, 233, 235, 240, 241, 243, 245, 246, 247, 250, 251, 253, 254, 255, 256, 258, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291
```
</details>

### 50. S_ALUMINIUM_PCT
Aluminium content (% by weight).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 188 · **Range:** 0 … 0.9

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.015, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049, 0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057
```
</details>

### 51. S_BORON_PCT
Boron content (%). NOTE: a stray max of 2.0 looks like a data error (boron is normally <0.005).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 31 · **Range:** 0 … 2

<details><summary>All distinct values (31 shown)</summary>

```
0.0, 0.0001, 0.0002, 0.0003, 0.0004, 0.0005, 0.0006, 0.0007, 0.0008, 0.0009, 0.001, 0.0011, 0.0012, 0.0013, 0.0014, 0.0015, 0.0016, 0.0017, 0.0018, 0.0019, 0.002, 0.0021, 0.0022, 0.0023, 0.0024, 0.0025, 0.0026, 0.0027, 0.0028, 0.0033, 2.0
```
</details>

### 52. S_CARBON_PCT
Carbon content (%). Key grade driver.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 1014 · **Range:** 0 … 0.75

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.0006, 0.0007, 0.0008, 0.0009, 0.001, 0.0011, 0.0012, 0.0013, 0.0014, 0.0015, 0.0016, 0.0017, 0.0018, 0.0019, 0.002, 0.0021, 0.0022, 0.0023, 0.0024, 0.0025, 0.0026, 0.0027, 0.0028, 0.0029, 0.003, 0.0034, 0.0035, 0.0036, 0.004, 0.0043, 0.015, 0.017, 0.0175, 0.0179, 0.018, 0.02, 0.0206, 0.021, 0.022, 0.0221, 0.0222, 0.0228, 0.023, 0.0231, 0.0234, 0.024, 0.0243, 0.0247, 0.025
```
</details>

### 53. S_CHROMIUM_PCT
Chromium content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 187 · **Range:** 0 … 1.08

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.042, 0.044, 0.045, 0.048, 0.049, 0.05, 0.051, 0.052, 0.053, 0.055
```
</details>

### 54. S_COPPER_PCT
Copper content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 100 · **Range:** 0 … 0.368

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.045, 0.05, 0.051, 0.052, 0.054, 0.055, 0.057, 0.058, 0.059, 0.06
```
</details>

### 55. S_MANGANESE_PCT
Manganese content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 431 · **Range:** 0 … 3.35

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.075, 0.08, 0.083, 0.084, 0.09, 0.098, 0.1, 0.11, 0.114, 0.116, 0.12, 0.127, 0.13, 0.133, 0.138, 0.14, 0.143, 0.145, 0.147, 0.15, 0.151, 0.153, 0.154, 0.155, 0.156, 0.157, 0.159, 0.16, 0.161, 0.162, 0.163, 0.165, 0.166, 0.167, 0.169, 0.17, 0.171, 0.172, 0.173, 0.174, 0.176, 0.177, 0.178, 0.179, 0.18, 0.186, 0.187, 0.188, 0.189
```
</details>

### 56. S_MOLYBDENUM_PCT
Molybdenum content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 80 · **Range:** 0 … 0.275

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.02, 0.051, 0.053, 0.063, 0.065, 0.066, 0.067, 0.07, 0.071, 0.072, 0.073, 0.074, 0.075, 0.076, 0.077, 0.08, 0.081, 0.082, 0.083, 0.084, 0.085, 0.088, 0.091, 0.092, 0.093, 0.094, 0.096, 0.098, 0.1, 0.102, 0.103, 0.104, 0.11
```
</details>

### 57. S_NICKEL_PCT
Nickel content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 52 · **Range:** 0 … 0.768

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.03, 0.032, 0.035, 0.068, 0.071, 0.11, 0.119, 0.204, 0.209, 0.21, 0.211, 0.214, 0.216, 0.22, 0.223, 0.229, 0.234, 0.235, 0.24, 0.25, 0.26, 0.709, 0.714, 0.722, 0.723
```
</details>

### 58. S_NIOBIUM_PCT
Niobium content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 72 · **Range:** 0 … 0.074

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049
```
</details>

### 59. S_PHOSPHORUS_PCT
Phosphorus content (%) — impurity, kept low.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 91 · **Range:** 0 … 0.103

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.002, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049, 0.05, 0.051
```
</details>

### 60. S_SILICON_PCT
Silicon content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 556 · **Range:** 0 … 3.734

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049
```
</details>

### 61. S_SULPHUR_PCT
Sulphur content (%) — impurity, kept low.

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 151 · **Range:** 0 … 0.0198

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.0004, 0.001, 0.0012, 0.0015, 0.0018, 0.0019, 0.002, 0.0021, 0.0022, 0.0023, 0.0024, 0.0025, 0.0026, 0.0027, 0.0028, 0.0029, 0.003, 0.0031, 0.0032, 0.0033, 0.0034, 0.0035, 0.0036, 0.0037, 0.0038, 0.0039, 0.004, 0.0041, 0.0042, 0.0043, 0.0044, 0.0045, 0.0046, 0.0047, 0.0048, 0.0049, 0.005, 0.0051, 0.0052, 0.0053, 0.0054, 0.0055, 0.0056, 0.0057, 0.0058, 0.0059, 0.006, 0.0061, 0.0062
```
</details>

### 62. S_TITANIUM_PCT
Titanium content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 535 · **Range:** 0 … 0.15

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.0001, 0.0002, 0.0003, 0.0004, 0.0005, 0.0006, 0.0007, 0.0008, 0.0009, 0.001, 0.0011, 0.0012, 0.0013, 0.0014, 0.0015, 0.0016, 0.0017, 0.0018, 0.0019, 0.002, 0.0021, 0.0022, 0.0023, 0.0024, 0.0025, 0.0026, 0.0027, 0.0028, 0.0029, 0.003, 0.0031, 0.0032, 0.0033, 0.0034, 0.0035, 0.0036, 0.0037, 0.0038, 0.0039, 0.004, 0.0041, 0.0042, 0.0043, 0.0044, 0.0046, 0.0047, 0.0048, 0.0049, 0.005
```
</details>

### 63. S_VANADIUM_PCT
Vanadium content (%).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 74 · **Range:** 0 … 0.134

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.018, 0.019, 0.02, 0.021, 0.022, 0.023, 0.024, 0.025, 0.026, 0.027, 0.028, 0.029, 0.03, 0.031, 0.032, 0.033, 0.034, 0.035, 0.036, 0.037, 0.038, 0.039, 0.04, 0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049
```
</details>

### 64. Tensile Strength MPa (B)
Tensile strength in MPa (numeric, 0 = not tested).

**Type:** number · **Fill:** 100.0% (17,324/17,324) · **Distinct values:** 451 · **Range:** 0 … 994

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
0.0, 308.0, 322.0, 328.0, 330.0, 332.0, 334.0, 335.0, 339.0, 340.0, 341.0, 342.0, 343.0, 345.0, 347.0, 348.0, 349.0, 350.0, 351.0, 352.0, 353.0, 354.0, 355.0, 356.0, 357.0, 358.0, 359.0, 360.0, 361.0, 362.0, 363.0, 364.0, 365.0, 366.0, 367.0, 368.0, 369.0, 370.0, 371.0, 372.0, 373.0, 374.0, 375.0, 376.0, 377.0, 378.0, 379.0, 380.0, 381.0, 382.0
```
</details>

### 65. YIELD STRENGTH
Yield strength (alternate field). STORED AS TEXT; values overlap with thickness-like decimals — verify before use.

**Type:** text · **Fill:** 46.6% (8,065/17,324) · **Distinct values:** 258

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
18.89, 19.27, 19.33, 19.4, 19.41, 19.45, 19.46, 19.47, 19.48, 19.5, 19.52, 19.55, 19.58, 19.6, 19.62, 19.63, 19.64, 19.66, 19.67, 19.68, 19.69, 19.7, 19.71, 19.72, 19.73, 19.74, 19.75, 19.76, 19.77, 19.78, 19.79, 19.8, 19.81, 19.84, 19.85, 19.86, 19.87, 19.88, 19.89, 19.9, 19.92, 19.93, 19.94, 19.95, 19.96, 19.97, 19.98, 19.99, 20, 20.01
```
</details>

### 66. UTS
Ultimate tensile strength (alternate field). STORED AS TEXT.

**Type:** text · **Fill:** 46.7% (8,083/17,324) · **Distinct values:** 108

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
100, 105, 108, 114, 120, 125, 133, 140, 150, 152, 160, 171, 180, 185, 19, 190, 20, 200, 209, 210, 220, 228, 240, 2440, 25, 250, 259, 260, 266, 270, 280, 296, 300, 304, 312, 320, 333, 342, 348, 350, 353.00, 360, 370, 377, 38, 380, 390, 40, 400, 403
```
</details>

### 67. Special Stock
Special stock indicator: E = sales-order stock (made-to-order), Q = project stock.

**Type:** text · **Fill:** 99.3% (17,211/17,324) · **Distinct values:** 2

<details><summary>All distinct values (2 shown)</summary>

```
E, Q
```
</details>

### 68. CP Number
Credit Proposal number tied to the order (sparse).

**Type:** text · **Fill:** 17.4% (3,008/17,324) · **Distinct values:** 94

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
2600008700, 2600008709, 2600008710, 2600008718, 2600008721, 2600008722, 2600008725, 2600008727, 2600008732, 2600008740, 2600008747, 2600008752, 2600008759, 2600008761, 2600008762, 2600008767, 2600008768, 2600008769, 2600008770, 2600008780, 2600008781, 2600008791, 2600008813, 2600008818, 2600008821, 2600008826, 2600008827, 2600008836, 2600008837, 2600008838, 2600008850, 2600008851, 2600008858, 2600008862, 2600008871, 2600008876, 2600008877, 2600008881, 2600008887, 2600008892, 2600008894, 2600008911, 2600008912, 2600008917, 2600008919, 2600008920, 2600008921, 2600008931, 2600008933, 2600008946
```
</details>

### 69. CP End Date
Credit Proposal validity end date (sparse).

**Type:** date · **Fill:** 17.4% (3,008/17,324) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
2026-05-26T00:00:00, 2026-05-27T00:00:00, 2026-05-28T00:00:00, 2026-05-29T00:00:00, 2026-05-30T00:00:00, 2026-05-31T00:00:00, 2026-06-01T00:00:00
```
</details>

### 70. LC Exp Date
Letter-of-Credit expiry date. STORED AS TEXT in dd.mm.yyyy format (not a real date). Very sparse.

**Type:** text · **Fill:** 1.0% (167/17,324) · **Distinct values:** 21

<details><summary>All distinct values (21 shown)</summary>

```
01.07.2026, 03.07.2026, 06.07.2026, 10.07.2026, 11.03.2016, 13.06.2026, 14.08.2026, 15.06.2026, 16.07.2026, 21.04.2026, 21.06.2026, 21.07.2021, 21.07.2026, 21.08.2026, 21.10.2025, 22.06.2022, 26.04.2025, 26.06.2026, 27.06.2026, 28.09.2024, 30.06.2026
```
</details>

### 71. Route
Transport route code (e.g. KAR047, AMD009, DT-DOL).

**Type:** text · **Fill:** 76.8% (13,306/17,324) · **Distinct values:** 249

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
21T003, 22T002, 22T025, 26T002, 26T004, 40T001, 40T003, 40T004, 40T006, 40T011, 40T013, 41T072, 45T021, 55T003, 55T015, 55T018, 55T021, 68T007, 68T010, 81T028, 86T001, 86T005, 89T002, 93T037, AMD001, AMD009, AMD012, CNN040, DT-BEL, DT-DOL, DT-TAL, EX0001, GHZ044, GHZ075, GHZ087, HPT008, JVR308, KAR005, KAR011, KAR025, KAR027, KAR028, KAR031, KAR047, KAR048, KAR050, KAR055, KAR062, KAR068, KAR084
```
</details>

### 72. Route Desc
Human-readable route description (e.g. 'Depot - Bangalore, Hoskote-Jigani').

**Type:** text · **Fill:** 76.8% (13,306/17,324) · **Distinct values:** 248

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
 Palwal-Bawal,  Palwal-Kundli,  Palwal-Manesar,  Palwal-Neemrana, Bidadi Service Centre - Dabaspet (KA), CGPT : VJNR TO CGPT VIA HPT-HG, COIMBATORE STOCKYARD-COIMBATORE LOCAL, Chennai - Hosur, Chennai NUMBAL-Bangalore, Chennai NUMBAL-Ennore Port, Chennai Red Hills -Tambaram, Chennai Trading, Coimbatore stockyard - Tuticorin, DEPOT -SANAND- KALOL/ GANDHINAGAR, DEPOT PALWAL-FARIDABAD, Depot - Bangalore, Hoskote-Jigani, Depot - Chennai, Redhills-Chennai, Depot - Chennai, Redhills-KANCHEEPURAM, Depot - Chennai, Redhills-MANALI, Depot - Chennai, Redhills-Oragadam, Depot - Chennai, Redhills-SENGADU, Depot - Chennai, Redhills-SRIPERUMBUDUR, Depot - Faridabad, Palwal-FARIDABAD, Depot - Faridabad, Palwal-GURGAON, Depot - Hyderabad, Timmapur -  PATANCHER, Depot - Pune, Kanhe Phata-MAHALUNGE, Depot - Sricity - VELLORE, Depot -Coimbatore Keeranatham-COIMBATORE, Depot-Jaipur-Bagru, Depot-Jaipur-Jaipur Local, Depot-Pune Kanhe Phata - Pirangut, Export route, GHAZIABAD STK YARD - GREATER NOIDA, GHAZIABAD STK YARD - Rampur, Ghaziabad - Greater Noida, Ghaziabad -RAMPUR (UP), Ghaziabad -UDHAM SINGH NAGAR (UK), Indore Depot - Pithampur, Irrunkattukottai Service Center-Hosur, Irrunkattukottai Service Centre-Ambattur, MI Ahmedabad-Bavla, MI Ahmedabad-Sanand, MI Ahmedabad-Vitthalapur, MRP TO CUTTING YARD, Manali Service Center - Manali (TN), Manali Service Centre (TN) - Tada (AP), Manali Service Centre - Kanchipuram (TN), Manali Service Centre - Ormagadam (TN), Manali Service Centre - Pondicherry (TN), Manali Service Centre - Ranipet (TN)
```
</details>
