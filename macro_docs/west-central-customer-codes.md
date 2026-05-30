# West-Central Customer Codes (Account Master / Mapping)

**File:** `macro_files/west  central customer codes.xlsx`  
**Sheet:** `Sheet1` · **Data rows:** 77 · **Columns:** 12

**Source:** Manually maintained regional customer master for the West-Central zone.

**Row grain:** One row per **customer account** in the West-Central region.

**Use this file to:** Look up **who owns an account (CAM), their contact number, the segment, destination, reporting head, and default route** for a customer code/name.

### Important notes / data-quality flags
- PRIMARY mapping table: 'code' ↔ customer name ↔ CAM/Head/Route/Segment.
- Casing is NOT normalized (e.g. 'oem' and 'OEM' both appear; cities lower/upper mixed).
- Last 1-2 columns are unnamed/stray (misaligned data) — ignore them.
- Small codes (8451-8499) are JSW internal stock-transfer yards, not external customers.

## Column summary

| # | Column | Type | Fill % | Distinct | Description |
|---|--------|------|-------:|---------:|-------------|
| 1 | Segment | text | 98.7 | 7 | Business segment of the account. |
| 2 | code | number | 100.0 | 74 | SAP customer code. |
| 3 | Customer | text | 100.0 | 70 | Customer name (free text; some entries abbreviated/duplicated, e. |
| 4 | Destination | text | 100.0 | 16 | Destination city/location for the customer. |
| 5 | CAM | text | 93.5 | 23 | Customer Account Manager — the JSW sales person who owns the account. |
| 6 | MOB No. | number | 89.6 | 19 | Mobile/contact number for the CAM or account. |
| 7 | Head | text | 92.2 | 9 | Regional / zonal sales head the account rolls up to. |
| 8 | ROUTE | text | 89.6 | 15 | Default logistics route code for the account (e. |
| 9 | SHIP TO | text | 3.9 | 3 | Override ship-to party code (sparse — only ~4% of rows). |
| 10 | SHIP TO CUSTOMER | text | 5.2 | 4 | Override ship-to party name (sparse). |
| 11 | *(unnamed)* | text | 0.0 | 0 | Unnamed/stray column — no header. |
| 12 | *(unnamed)* | number | 3.9 | 3 | Unnamed/stray column — no header. |

## Columns in detail (with up to 50 unique sample values)

### 1. Segment
Business segment of the account. Values: Retail, OEM/oem, PROJECT, MSME, SBU-A, Stock transfer. NOTE: casing not normalized ('oem' vs 'OEM').

**Type:** text · **Fill:** 98.7% (76/77) · **Distinct values:** 7

<details><summary>All distinct values (7 shown)</summary>

```
MSME, OEM, PROJECT, Retail, SBU-A, Stock transfer, oem
```
</details>

### 2. code
SAP customer code. Short codes (8451..8499) are JSW internal stock-transfer plants; 8-digit (40xxxxxx) are external customers. JOIN KEY to credit report.Customer and ZSD_CURRSTK_HR.Customer.

**Type:** number · **Fill:** 100.0% (77/77) · **Distinct values:** 74 · **Range:** 8451 … 4.01237e+07

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
8451, 8468, 8469, 8481, 8499, 40000001, 40000010, 40000042, 40000088, 40000936, 40002006, 40002036, 40002128, 40002296, 40002303, 40002353, 40007100, 40007137, 40007212, 40007312, 40010271, 40013393, 40013601, 40018499, 40020365, 40020381, 40020793, 40020842, 40020897, 40023992, 40025037, 40025038, 40025518, 40026134, 40026600, 40027897, 40028184, 40028527, 40033955, 40034267, 40034963, 40036137, 40039429, 40039848, 40041130, 40043094, 40043658, 40043872, 40044032, 40044971
```
</details>

### 3. Customer
Customer name (free text; some entries abbreviated/duplicated, e.g. 'Auto Profiles ltd' vs 'Auto Profiles Limited-unit1').

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 70

<details><summary>Sample of up to 50 distinct values (50 shown)</summary>

```
Ackroll Industries, Adani Green Energy Limited, Auto Profiles Limited-unit1, Auto Profiles ltd, Bajaj Industrial Alloys PVT. LTD., Bajel Projects Limited, Bavtawala Iron & Steel Pvt LTD., Bharat Iron syndicate, Bharatkumar Indrasen Trading PVT. L, Dewas Metal Sections Ltd, Dorabji Auto, Encorp Powertrans Pvt Ltd, GOVIND STEEL AGENCY, Geeta Udyog, Gopani Metal Industries PVT. LTD., Govind Steel Agency Private Limited, Heena Steel Llp, Indore Oem, JASH ENERGY, JSW STEEL LIMITED - AHMEDABAD SANAN, JSW STEEL LIMITED - MUM NAVKAR YARD, JSW STEEL LIMITED - MUM TALOJA YARD, JSW STEEL LIMITED - SANASWADI PUNE, JSW STEEL LTD - JAIPUR, JUPITER WAGONS LIMITED, Jindal Saw Limited, Jitf Urban Infrastructure Limited, Jsw MI Steel Service Centre P Ltd, Jsw One Distribution Limited, Kalyani Maxion Wheels Private Limi, LCC PROJECTS, Mahant Steel Private Limited, Maharastra Seamless Ltd, Mahavir, Mahindra, Meenakshi Metal Forms, Metamorphosis Engitech (india) PVT., Model infra corporation (p) ltd.,, Narmada Iron & Associates Private L, OM Fabtech Private Limited, PRANCY INFRACON, Pioneer Corporation, Posco Maharashtra Steel Private Lim, Prince Steel, Proto D Engg, R K Steels, Rane IndustriesPvt ltd.,, Rasnidhi Kumar & Brothers, Ratan Ispat Industries, Ratnadeep Steel Traders
```
</details>

### 4. Destination
Destination city/location for the customer. Casing inconsistent (Indore/indore, kutch/KUTCH).

**Type:** text · **Fill:** 100.0% (77/77) · **Distinct values:** 16

<details><summary>All distinct values (16 shown)</summary>

```
Indore, JVML - Sultanpur , JVML- Indore, Jamshedpur, KUTCH, MANDYA, Mumbai, NAGPUR, Nasik-Aurangabad, Pioneer Corporation, Pune, VJNR -KSV, ahmedabad, indore, jaipur, kutch
```
</details>

### 5. CAM
Customer Account Manager — the JSW sales person who owns the account. (Header has a trailing space: 'CAM '.)

**Type:** text · **Fill:** 93.5% (72/77) · **Distinct values:** 23

<details><summary>All distinct values (23 shown)</summary>

```
Aditya Kumar, Amit kumar, Amit tukaram patil, Anil kumar yadav, Ankesh Ramesh, Ankur Sharma, Anuj Updhaya, Aparna Shah, Ateeb Shaik, Farah Naaz, Hardik Jain, Manisha barik/Sudarshan Taur, Naveen kumar, PRANSHU, Priyanjali, Riyaz Ahmed, Shubham Gawande, Sumeet Dhanke, Tarun Jhakar, VIKRANT JSW ONE, Vikram Yadav, Yogesh, shashank gupta
```
</details>

### 6. MOB No.
Mobile/contact number for the CAM or account. Mostly numeric; one text entry '*017142 (Hot line)'.

**Type:** number · **Fill:** 89.6% (69/77) · **Distinct values:** 19 · **Range:** 7.0005e+09 … 9.92244e+09

<details><summary>All distinct values (19 shown)</summary>

```
7000501490, 7337817820, 8108094921, 8108152034, 8305587247, 8408006276, 8800460970, 8800987798, 8805023745, 8888681777, 9168539390, 9262737459, 9348992397, 9405888407, 9427334449, 9604026512, 9764463763, 9922435518, *017142 (Hot line)
```
</details>

### 7. Head
Regional / zonal sales head the account rolls up to.

**Type:** text · **Fill:** 92.2% (71/77) · **Distinct values:** 9

<details><summary>All distinct values (9 shown)</summary>

```
Anubhav Sexana, Ashwani Verma, Deepak dhamale, Gaurav, Gaurav Jadav, Mahesh garg, Raghavendra TS, Rajeev Pandey, mukul ghadgay
```
</details>

### 8. ROUTE
Default logistics route code for the account (e.g. KAT036, KAR139).

**Type:** text · **Fill:** 89.6% (69/77) · **Distinct values:** 15

<details><summary>All distinct values (15 shown)</summary>

```
Aurangabad, JAMSHEDPUR, JVR139, JVT204, JVT283, KAR047, KAR139, KAR213, KAR275, KAT036, KAT077, KAT138, KAT177, KAT238, KAT264
```
</details>

### 9. SHIP TO
Override ship-to party code (sparse — only ~4% of rows).

**Type:** text · **Fill:** 3.9% (3/77) · **Distinct values:** 3

<details><summary>All distinct values (3 shown)</summary>

```
40047421, 40121288, KAT039
```
</details>

### 10. SHIP TO CUSTOMER
Override ship-to party name (sparse).

**Type:** text · **Fill:** 5.2% (4/77) · **Distinct values:** 4

<details><summary>All distinct values (4 shown)</summary>

```
ALANDI, Dynamech Engineering & Coil Cutting, Rajan Steel Febricators, rajan, shree umiya,dynamic
```
</details>

### 11. (unnamed column)
Unnamed/stray column — no header. Contains scattered numeric values (likely a misaligned phone column). Treat as junk / ignore.

**Type:** text · **Fill:** 0.0% (0/77) · **Distinct values:** 0

_(no non-empty values)_

### 12. (unnamed column)
Unnamed/stray column — no header. Contains scattered numeric values (likely a misaligned phone column). Treat as junk / ignore.

**Type:** number · **Fill:** 3.9% (3/77) · **Distinct values:** 3 · **Range:** 2.65418e+07 … 2.65483e+07

<details><summary>All distinct values (3 shown)</summary>

```
26541780, 26545122, 26548309
```
</details>
