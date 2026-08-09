# People Trackers Australia — iTrace
## Reverse-Engineering Report & Web Application Build Specification

**Prepared:** 9 August 2026
**Source system:** `iTrace Recovered 3.53.23 pm.fmp12` — FileMaker Pro solution, opened in FileMaker Pro 19.6.3
**Method:** Read-only inspection of the live database, complete Database Design Report (DDR) export, and read-only CSV export of all data tables. No records, fields, scripts, layouts or relationships were modified.

---

### Evidence key

Every material statement in this document carries one of the following tags.

| Tag | Meaning |
|---|---|
| **[FM]** | CONFIRMED FROM FILEMAKER — observed directly in the database, DDR or exported data |
| **[CLIENT]** | CONFIRMED FROM CLIENT — stated by the client, not independently verified |
| **[DOC]** | FOUND IN DOCUMENTATION — from the supplied walkthrough / PDFs only |
| **[INF]** | INFERRED — reasoned from evidence, not directly observed |
| **[?]** | UNKNOWN — needs confirmation before build |

---

## 1. Executive Summary

iTrace is a single-file FileMaker Pro solution that runs a skip-tracing and process-serving business. It is not a bespoke build: it is a customisation of a generic CRM framework called **"Briefcase"**, authored by **Tahn Software Pty Ltd**, and the framework's original modules (Leads, Marketing, POP email harvesting) are still present but largely unused. **[FM]**

The operational core is far smaller than the file suggests. Three tables carry the business: **Files** (cases), **Clients** and **Agents**. There is **no Subjects table, no Reports table, no Packages table, no Rates table and no Statuses table** — all of that lives as flat fields and hard-coded calculations on the Files table. **[FM]**

Scale is modest and well within a standard web stack: **26,993 case records, 689 clients, 35 agents**, roughly 47 MB of exported case data. **[FM]**

Five findings materially shape the rebuild:

1. **Pricing is hard-coded in a field calculation, not data-driven.** `Rate 1` and `Rate 2` are a `Case()` statement with literal dollar amounts (Basic 7, Flat 100, Standard 150/50, Premium 400, Surveillance 120, Field Call 50, Process Serving 50). The per-client fee fields (`Locate Fee`, `Non Locate Fee`, `File Fee`, `Hourly Fee`) are populated on 359 clients but **are never read by any calculation or script**. The client's belief that "rates come from the client record" is only half-true — only the *package name* does. **[FM]**
2. **The agent link is a text string, not a key.** `Files::Agent` joins to `Agents::Name` by name match. 117 of 149 distinct agent strings in the data do not match any agent record. **[FM]**
3. **Status is free text with a value list on top.** 22 distinct values exist where the value list defines 7; 1,402 records (5.2%) hold a status outside the list, including three whitespace variants of "Located". Because `Fee` and `Date Closed` branch on exact status strings, this has real financial consequences. **[FM]**
4. **`Type` has two spellings for the same thing** — "Skip Trace" (13,418) and "Skip Tracing" (12,517). The `Package` calculation only fires when `Type = "Skip Trace"` exactly, which is why 13,554 records (50%) have no package. **[FM]**
5. **Reports are not templates in the software sense.** Five boilerplate text blocks are stored in a single-record table; a button copies one into the case's `Report` text field, the user edits it, and one of three print layouts renders it. **[FM]**

The system has real FileMaker accounts and privilege sets, including unused `[Client]` and `[Agent]` roles and a partially-built **client portal** (two layouts, per-client account name/password fields, configured for exactly one client). **[FM]**

Rebuilding at parity is a genuinely small application. The risk in this project is not functionality — it is **data migration**, where roughly 5–10% of historical records carry defects that a strict relational schema will reject.

---

## 2. Existing System Overview

| Attribute | Value | Evidence |
|---|---|---|
| Product | FileMaker Pro solution, single file | [FM] |
| File | `iTrace Recovered 3.53.23 pm.fmp12`, 150.5 MB | [FM] |
| Opened with | FileMaker Pro 19.6.3 (client states day-to-day use is FileMaker Pro 16) | [FM] / [CLIENT] |
| Minimum allowed version | 12.0 | [FM] |
| Underlying framework | "Briefcase" by Tahn Software Pty Ltd | [FM] |
| Theme | Classic | [FM] |
| Custom menu set | `iTrace` (replaces standard FileMaker menus) | [FM] |
| Tables | 10 (3 operational, 2 configuration, 3 vestigial, 2 empty) | [FM] |
| Layouts | 34 (31 real, 3 separators/duplicates) | [FM] |
| Scripts | 47 in 5 groups | [FM] |
| Custom functions | 25 (24 are generic MD5/bitwise helpers from the framework) | [FM] |
| Value lists | 27 | [FM] |
| Accounts | 4 | [FM] |
| Privilege sets | 5 | [FM] |
| Plug-ins enabled | 1 — 24U SimpleDialog | [FM] |
| Plug-ins referenced but missing | MBS FileMaker Plugin | [FM] |
| Encryption at rest | None (`Encryption type="0"`) | [FM] |

The file name contains "Recovered", indicating it has been through FileMaker's `Recover` process at some point. **[FM]** Recovered files are not considered production-safe by Claris and should not be the long-term system of record. **[INF]**

### 2.1 What the business actually does with it

A client (a law firm, collections agency, finance company or process server) sends an instruction to locate a person or serve documents. Staff create a case, capture the subject's details and last known address, optionally assign an external field agent, conduct database and field enquiries, write up findings in a free-text report, set an outcome status, print or PDF a letter-styled report and send it to the client. **[FM]** **[DOC]**

---

## 3. FileMaker Database Structure

### 3.1 Table inventory

| Table | Fields | Records | Role | Evidence |
|---|---:|---:|---|---|
| `itrace_files` | 64 | 26,993 | **Core.** Cases/files. Also holds all subject data and report text. | [FM] |
| `itrace_clients` | 38 | 689 | **Core.** Clients. | [FM] |
| `itrace_agents` | 21 | 35 | **Core.** Field agents / contractors. | [FM] |
| `itrace_templates` | 6 | 1 | Config. Five boilerplate report bodies in one record. | [FM] |
| `System` | 19 | 1 | Config. All-global POP email settings, set at startup. | [FM] |
| `Leads` | 36 | 9,513 | Vestigial CRM from the Briefcase framework. | [FM] |
| `Marketing` | 11 | 1 | Vestigial. Effectively empty. | [FM] |
| `Templates` | 8 | 1 | Vestigial. Marketing email templates. | [FM] |
| `itrace_leads` | 39 | 0 | **Obsolete.** Superseded by `Leads`; calculations reference `<Field Missing>`. | [FM] |
| `itrace` | 0 | 0 | Empty shell used only as the main-menu layout's table context. | [FM] |

Only `itrace_files`, `itrace_clients`, `itrace_agents` and `itrace_templates` are required for V1. **[INF]**

### 3.2 Naming and structural observations

- No table uses a UUID or system-generated GUID; keys are plain serial integers with `allowEditing = True`. **[FM]**
- Every operational table carries `Modified Account` and `Modified Time` auto-enter fields — a minimal audit trail (last change only, no history). `itrace_files` is the exception: **it has neither**, so case records have no modification tracking at all. **[FM]**
- Every table carries `calc_Found`, an unstored display calculation (`"Record " & Get(RecordNumber) & ": " & Get(FoundCount) & " / " & Get(TotalRecordCount) & " Found "`) used purely for the on-screen record counter. Do not migrate. **[FM]**
- Address data is duplicated into `zcalc_*` concatenation fields for indexing/printing. Do not migrate; recompute. **[FM]**

---

## 4. Tables / Entities

### 4.1 `itrace_files` — Case / File (the central object)

**Purpose:** one record per client instruction. Combines what would normally be four entities: the case, the subject, the investigation findings and the billing line. **[FM]**

**Identifier:** `ID` (Number, auto-enter serial, editable). This is the "OUR REF" printed on every report — e.g. 55418. **[FM]**

**Field groups:**

| Group | Fields |
|---|---|
| Identity & links | `ID`, `ID Client`, `Gl Client` (global, unused), `ID Reported`, `ID Invoiced`, `Agent`, `Type`, `Client Ref.` |
| Subject | `Subject Title`, `Subject Firstname`, `Subject Middlename`, `Subject Lastname`, `Subject Full Name` (calc), `Subject Gender`, `Subject DOB`, `Subject License`, `Subject Ph Home/Mobile/Work/Other` |
| Confirmed (found) address | `Subject Address 1/2`, `Subject City`, `Subject State`, `Subject Postcode`, `Subject Country`, `zcalc_Subject Address` |
| Last known address | `Previous Address 1/2`, `Previous City/State/Postcode/Country`, `zcalc_Previous Address` |
| Employer | `Employer`, `Employer Address 1/2`, `Employer City/State/Postcode/Country`, `Employer Phone`, `Employer Fax`, `zcalc_Employer Address` |
| Dates | `Date Entered`, `Date Due`, `Date Closed`, `Date Instruction Sent` |
| Workflow | `Status`, `Report`, `Agent Notes`, `Additional Info` |
| Money | `Package`, `Rate 1`, `Rate 2`, `Fee`, `Units`, `Amount` |
| Housekeeping | `zcalc_Report`, `zcalc_Rate`, `zcalc_Date`, `calc_Found`, `sum_Count`, `Attachments` (container) |

**Critical naming trap:** despite the names, **`Subject Address*` is the address the investigation *found* (labelled "Confirmed Address" on screen, inside the Report panel), and `Previous Address*` is the last known address supplied by the client** (labelled "Last Known Address" on screen and "Previous Address" on the Agent Instruction printout). Getting this backwards in migration would corrupt every case. **[FM]**

**Fill rates (of 26,993 records):** `Date Entered` 100%, `Type` 100%, `Status` 99.7%, `ID Client` 99.7%, `Date Due` 99.9%, `Subject Lastname` 98.8%, `Client Ref.` 95.8%, `Report` 94.0%, `Previous Address 1` 74.9%, `Amount` 65.1%, `Agent` 57.7%, `Package` 49.8%, `Subject DOB` 42.0%, `Subject Address 1` 9.7%, `Subject Ph Other` 0.1%, `Employer Country` 0%, `Employer Fax` 0%, `Gl Client` 0%, `Date Instruction Sent` 0.04% (11 records). **[FM]**

### 4.2 `itrace_clients` — Client

**Purpose:** the instructing organisation. **Identifier:** `ID` (Number). **[FM]**

Two address blocks: a physical block (`Address 1/2`, `City`, `State`, `Postcode`, `Country`) and a postal block (`Postal Address 1/2`, `Postal City/State/Postcode/Country`) whose fields auto-enter a copy of the physical address on creation and can then be edited independently. **[FM]** This matches the walkthrough's "2 addresses. 1 is mail, 1 is physical". **[DOC]**

Contact and commercial fields: `Name`, `Attention`, `Email`, `Email Invoice`, `Email Reports`, `Phone`, `Fax`, `ABN`, `Terms`, `Kind`, `Referrer`, `Notes`, `Package`, `File Fee`, `Locate Fee`, `Non Locate Fee`, `Hourly Fee`, `Account Name`, `Account Password`. **[FM]**

**Usage reality:** `Package` is set on only **3 of 689** clients. `Locate Fee` on 359, `Non Locate Fee` on 345, `File Fee` on 49, `Hourly Fee` on **0**. `Email Reports` on only 20 (vs `Email` on 358). `Account Name`/`Account Password` on exactly **1** client. **[FM]**

**`Non Locate Fee` auto-enters a copy of `Locate Fee`** on creation. **[FM]**

### 4.3 `itrace_agents` — Agent

**Purpose:** external field agents, process servers and investigators the business subcontracts to, plus internal staff. **Identifier:** `ID` (Number, 1123–1158). **[FM]**

Fields: `Name`, `Company`, address block, `Phone`, `Mobile`, `Fax`, `Email`, `Notes`, `Skills`, `Rate`, `zcalc_Address`, `Date Entered`, `Modified Account`, `Modified Time`. **[FM]**

`Skills` is a checkbox set (Skip Tracing / Process Serving / Debt Collection) stored as a newline-delimited string — note record 1136 holds the corrupted concatenation `"Skip TracingProcess Serving"`. **[FM]**

`Rate` is defined but **empty on all 35 agents**, and is not placed on any layout. `Mobile` is likewise defined but absent from the Agents layout. **[FM]**

Two agent records have a blank `Name` (IDs 1145, 1152). **[FM]**

The supplied walkthrough describes Agents as "client's employees"; the data contradicts this — they are external investigation firms and contractors (e.g. "Street Watch Investigations", "Coastal Process Serving"). **[DOC]** vs **[FM]**

### 4.4 `itrace_templates` — Report boilerplate

One record, six fields: `ID` and five long-text bodies — `Located`, `Non Locate`, `Leads Obtianed` *(sic, misspelled in the schema)*, `Process Service`, `Field Call`. **[FM]**

### 4.5 `System` — runtime email configuration

19 global fields holding POP3 host, port, timeout, username, password, auth method, SSL flag and message-handling counters. All are **hard-coded by the `Open Script` on every launch** rather than being stored data. **[FM]** See §21 and §28.

---

## 5. Fields — auto-enter and calculation logic

This section is the business logic the rebuild must reproduce. All formulas below are transcribed verbatim from the DDR. **[FM]**

### 5.1 `itrace_files` — auto-enter on creation

| Field | Behaviour | Formula / value |
|---|---|---|
| `ID` | Auto-enter serial, user-editable | — |
| `Date Entered` | Auto-enter creation date | — |
| `Agent` | Auto-enter constant | `Nicole Gualtiera` |
| `Type` | Auto-enter constant | `Skip Trace` |
| `Status` | Auto-enter constant | `New Instruction` |
| `Units` | Auto-enter constant | `1` |
| `Date Due` | Auto-enter calculation | `Date Entered + 14` |

### 5.2 `itrace_files` — auto-enter calculations that *replace existing value*

These re-evaluate whenever a referenced field changes, overwriting whatever is there.

**`Package`**
```
Case ( Type = "Skip Trace" ;
       If ( IsEmpty ( Files to Clients...Company::Package ) ; "Standard" ;
            Files to Clients...Company::Package ) ;
       "" )
```
Only Skip Trace jobs get a package. It reads the *client's* `Package` field, defaulting to `"Standard"`. Because only 3 clients have a package set, in practice this always resolves to `"Standard"`. **[FM]**

**`Rate 1`** (the "locate"/standard rate)
```
Case ( Package = "Basic" ; 7 ; Package = "Flat" ; 100 ; Package = "Standard" ; 150 ;
       Package = "Premium" ; 400 ; Type = "Surveillance" ; 120 ;
       Type = "Field Call" ; 50 ; Type = "Process Serving" ; 50 ; 0 )
```

**`Rate 2`** (the "non-locate" rate) — identical except `Standard` yields **50** instead of 150.
```
Case ( Package = "Basic" ; 7 ; Package = "Flat" ; 100 ; Package = "Standard" ; 50 ;
       Package = "Premium" ; 400 ; Type = "Surveillance" ; 120 ;
       Type = "Field Call" ; 50 ; Type = "Process Serving" ; 50 ; 0 )
```

**`Fee`** — selects which rate applies, based on outcome
```
Case ( Status = "New Instruction" ; 0 ;
       Status = "Non Locate" ; Rate 2 ;
       Status = "Withdrawn" ; 0 ;
       Status = "Credited/Disputed" ; 0 ;
       Rate 1 )
```

**`Amount`** = `Fee * Units`

**`Date Closed`**
```
If ( Status ≠ "New Instruction" ; Get ( CurrentDate ) ; "" )
```
Any status change away from New Instruction stamps *today* as the close date — and re-stamps it on every subsequent status change. **[FM]**

**`zcalc_Report`** (Evaluate Always)
```
Case ( ID Reported = "Report Sent" ; "Reported " & Get ( CurrentTimestamp ) ; "Report" )
```

**`zcalc_Rate`** (Evaluate Always) = `Type & " " & Package`

### 5.3 `itrace_files` — stored calculations

| Field | Formula |
|---|---|
| `Subject Full Name` | `Substitute ( Subject Firstname & " " & Subject Middlename & " " & Subject Lastname ; "  " ; " " )` |
| `zcalc_Subject Address` | `Subject Address 1 & " " & Subject Address 2 & " " & Subject City & " " & Subject State & " " & Subject Postcode & " " & Subject Country` |
| `zcalc_Previous Address` | same pattern over `Previous *` |
| `zcalc_Employer Address` | same pattern over `Employer *` |
| `zcalc_Date` | `Year ( Date Entered ) & Right ( "0" & Month ( Date Entered ) ; 2 )` — a `YYYYMM` bucket, apparently for period reporting |
| `calc_Found` | unstored record-counter string |
| `sum_Count` | summary field, count |

### 5.4 `itrace_clients`

| Field | Behaviour |
|---|---|
| `Country` | Auto-enter constant `Australia` |
| `Postal Address 1/2`, `Postal City/State/Postcode/Country` | Auto-enter calculation copying the matching physical field |
| `Non Locate Fee` | Auto-enter calculation `= Locate Fee` |
| `zcalc_Address` | Stored concatenation |
| `Modified Account` / `Modified Time` | Auto-enter modification account name / timestamp |

### 5.5 Reference number generation — the exact answer

The reference number is `itrace_files::ID`, a **FileMaker auto-enter serial**, incremented on record creation, and **editable by the user** (`allowEditing = True`, no unique validation). **[FM]**

Observed range: **2921 to 55981** across 26,993 records — meaning roughly 26,083 numbers in the range are absent (deleted or never-created records). There are **15 records with a blank ID** and **15 duplicate IDs**. **[FM]**

This is important for V1: the new system must keep the existing numbers, continue the sequence from the current maximum, and cannot assume the reference number is unique in historical data.


---

## 6. Relationships

FileMaker's graph contains 19 table occurrences but only **10 relationships**, and only **two of them are real foreign keys**. **[FM]**

| Left | Right | Predicate | Meaning |
|---|---|---|---|
| Files | **Files to Clients...Company** | `ID Client = ID` | **The real client FK.** All client data on case screens and reports comes through this. |
| Files | **Files to Agents...Name** | `Agent = Name` | **The agent link — matched on a text name, not an ID.** |
| Files | Files to Clients | `ID × ID` (Cartesian) | Reaches *all* clients — used to populate the client picker value list. |
| Files | Files to Agents | `ID × ID` (Cartesian) | Reaches *all* agents — used for the agent picker value list. |
| Files | Files to Templates | `ID × ID` (Cartesian) | Reaches the single templates record. |
| Files | Files to Files | `ID = ID` | Self-join. |
| Clients | Clients to Clients | `ID = ID` | Self-join. |
| Agents | Agents to Agents | `ID = ID` | Self-join. |
| Leads | Leads to Leads | `Kind = Kind` | Vestigial. |
| Leads | Leads to Templates | `ID × ID` | Vestigial. |

**No relationship has cascade-create or cascade-delete enabled.** Deleting a client or agent silently orphans its cases. **[FM]** This is the direct cause of the 82 orphan client IDs and 117 unmatched agent names found in the data (§23).

There are **no portals anywhere in the solution** — no layout displays related records in a list. Every screen is a single flat record. **[FM]**

---

## 7. Layouts

31 real layouts. Every data-entry layout has an `OnLayoutKeystroke` script trigger running `Keystroke`; the main menu additionally runs `Main Menu` and `Lock Tools` on layout enter. **[FM]**

### 7.1 Navigation / data-entry layouts

| Layout | Table | Purpose | Fields |
|---|---|---|---|
| `iTrace` | itrace | Main menu. Five buttons only: Agents, Clients, Leads, Marketing, Files. | 0 |
| `Files List` | Files | Case list. Columns: File(ID), Client, Client Ref., Title, Subject First/Middle/Last, Agent, Instruction Sent, Due, Status. | 12 |
| `Files` | Files | Case detail — the main working screen. | 56 |
| `Clients List` | Clients | Client list: Company, Name, Kind, address, Phone, Email. | 7 |
| `Clients` | Clients | Client detail, including both address blocks and all fee fields. | 32 |
| `Agents List` | Agents | Agent list: Name, Company, address, Phone, Fax, Email. | 7 |
| `Agents` | Agents | Agent detail. **Omits `Mobile` and `Rate`** even though both exist. | 14 |
| `Leads List` / `Leads` | Leads | Vestigial CRM. `Leads` embeds a web viewer. | 15 / 27 |
| `Marketing List` / `Marketing` | Marketing | Vestigial. | 9 / 8 |
| `System` | System | POP email settings screen. Not reachable from the menu. | 18 |
| `TemplatesEdit` / `Templates` | Templates | Edit the five report boilerplate bodies. | 5 / 6 |

### 7.2 Print / report layouts

| Layout | Used for | Key content |
|---|---|---|
| `Print File Report` | The main client report | Letterhead, client address block, `<<Status>>` as the headline, `Our Ref: <<ID>>`, `Your Ref: <<Client Ref.>>`, fixed intro paragraph, "AGENTS REPORT", `RE: <<Subject Title>> <<Subject Firstname>> <<Subject Middlename>> <<Subject Lastname>>`, then the whole `<<Report>>` field, then a fixed sign-off from "People Trackers Australia" |
| `Print File Update` | Interim update to client | Different intro ("preliminary searches have not yet resulted in any confirmation…" plus the do-not-contact warning), headline "UPDATE Report", `{{CurrentDate}}`, then `<<Report>>`, then "FURTHER SEARCHES AND ENQUIRIES WILL BE MADE…" |
| `Print File Agent Instruction` | Instruction sheet sent to a field agent | `OUR REF <<ID>>`, `Date file due for completion <<Date Due>>`, subject name/DOB/licence/phones, `<<zcalc_Previous Address>>` labelled "Previous Address", employer block, `<<Additional Info>>`. **Contains no client identity** — deliberately, so the agent cannot see who instructed the job. |
| `Print File Report Batch` | Batch PDF variant of the main report | Identical body, but signs off **"Nicole Gualtiera / iTrace Australia Pty Ltd"** and labels the reference **"ITRACE Ref"** rather than "People Trackers Ref" — stale branding |
| `Print Client Status Report` | Multi-case status list for a client | Columns: Date Entered, Client, Client Ref., Subject, Type, Date Closed, Our Ref. Sorted by Status then Date Entered |
| `Print File List by Agent` | Internal workload list | Columns: ID, Client, Client Ref., Subject, Package, Agent, Status, Due. Sorted by Agent, Status, Date Entered |
| `Print Clients List` / `Print Clients Details` / `Print Clients Envelope` | Client admin printouts | — |
| `Print Agents List` / `Print Agents Details` / `Print Agents Envelope` | Agent admin printouts | — |
| `Print Leads` | Vestigial | — |

### 7.3 Client portal layouts (built, effectively unused)

`Client Portal Files` and `Client Portal Files List` are full case-detail and case-list screens filtered by `Files to Clients...Company::Account Name`, and `Client Portal Files` is **the only layout in the solution that exposes the `Attachments` container field**. **[FM]** Combined with the `[Client]` privilege set (§22) and the `fmwebdirect` extended privilege, this is an abandoned WebDirect client portal. Only one client record has portal credentials. **[FM]** **[INF]**

### 7.4 The `Files` (case detail) screen in detail

Screen regions, top to bottom: **[FM]**

- **Header strip** — File (`ID`), `Type`, `Agent` (with an "Agent" hyperlink that jumps to the agent's record), `Client` hyperlink + client company, `Client Ref.`, `Date Entered`, `Date Due`, `Package`, `Rate 1`/`Rate 2`, `Fee`, `Units`, `Inv. Amount`.
- **Status panel** — radio set: New Instruction, Leads Obtained, Non Locate, Located, Completed, Withdrawn, Credited/Disputed; checkboxes `Report Sent` (`ID Reported`) and `Invoiced` (`ID Invoiced`); `Date Closed`; and a large status badge.
- **Subject Details** — title, names, DOB, gender, four phone numbers, licence, `Additional Info`.
- **Last Known Address** — the `Previous *` fields.
- **Employer** — the `Employer *` fields.
- **Agent Notes** — free text, with an `Email Instruction` button.
- **Report panel** — "Confirmed Address" (the `Subject *` address fields), five template buttons (Located / Not Located / Leads Obtained / Process Service / Field Call), and the large `Report` text field.
- **Toolbar** — Main Menu, Files, Agents, Clients, Leads, Marketing, `<`, `>`, View, Find, New, Delete, Print.

Note: the layout is wider than the default window. A second **Print** button at layout x≈1450 — the one that invokes the interactive report-chooser dialog — sits **off-screen at normal window size**, which is why the visible Print button goes straight to `Print File Report`. **[FM]**

---

## 8. Scripts

47 scripts in 5 groups plus 6 top-level scripts. Full step-level detail was extracted; the operationally significant ones follow. **[FM]**

### 8.1 Startup and global

**`Open Script`** (runs on first window open)
1. Freeze window, set error capture, hide toolbars, adjust window.
2. **Check the 24U SimpleDialog plug-in is present** via `SDialog_Version("")`. If missing → beep, show "Briefcase Admin requires plugins which are missing…", **quit the application**. This is why the plug-in is mandatory.
3. Register SimpleDialog with a licence key (branches on plug-in major version 3 vs 4).
4. Call `MBS("Register"; "Tahn Software Pty Ltd"; …)` — **this function is missing**; the MBS plug-in is not installed.
5. Hard-code all nine `System::POP *` fields, **including a plaintext mailbox password**.
6. Go to `Files List`, run `File : Filter New Instruction`, then go to the `iTrace` main menu.

**`Keystroke`** — a large `OnLayoutKeystroke` handler implementing the whole keyboard UX: in Find mode Esc returns to Browse and Return performs the find; in list view Return opens the detail layout, Esc returns to the main menu, and single letters `f`/`a`/`c`/`l`/`m` jump to Files/Agents/Clients/Leads/Marketing; in detail view Return commits and Esc returns to the list; arrow keys move between records. **[FM]**

**`Main Menu`**, **`Lock Tools`**, **`Show Toolbar`**, **`Developer`** — window/toolbar chrome.

### 8.2 Report body scripts (5)

`File : Report Located`, `… Non Locate`, `… Leads Obtained`, `… Process Service`, `… Field Call`. All five are identical in shape:

```
If [ not IsEmpty ( Files::Report ) ]
    Show Custom Dialog [ "iTrace" ; "Replace exisiting contents?" ; "No" / "Yes" ]
    If [ Get(LastMessageChoice) = 1 ]   // "No"
        Halt Script
    End If
End If
Set Field [ Files::Report ; Files to Templates::<matching template field> ]
```

So: **the button copies boilerplate into the case's Report field, overwriting it after confirmation. There is no link back to the template afterwards.** Editing a template does not change any existing case. **[FM]**

### 8.3 Print scripts

**`File : Print`** — the interactive chooser. Uses `SDialog_InputDialog` to show a pull-down of *File Report / File Update / Agent Instruction / Client Status Report / File List by Agent*, plus radio buttons *Current Record* / *Records Being Browsed*. The **default selection is computed**:

```
If ( Get(LayoutViewState) = 1 ; "Client Status Report" ;
     Case ( Files::Status = "New Instruction" ; "Agent Instruction" ;
            Files::Status = "Leads Obtained"  ; "File Update" ;
                                                "File Report" ) )
```
It stores the current-record/found-set choice in `$$Record`, then dispatches with `MBS("FM.RunScript"; Get(FileName); "File : Print " & <chosen name>; "")`. **Because the MBS plug-in is not installed, this dispatch cannot execute** — the dialog would appear but nothing would print. **[FM]** **[INF]** The same pattern is used by `Client : Print` and `Agent : Print`.

**`File : Print File Report`** — opens a new window named "File Report", `Go to Related Record` onto the `Print File Report` layout, `Print Setup`, `Enter Preview Mode`. This is what the visible Print button on the case screen runs, and it works. Verified live. **[FM]**

**`File : Print File Update`**, **`File : Print Agent Instruction`** — same, onto their respective layouts.

**`File : Print Client Status Report`** — GTRR onto `Print Client Status Report` using the "File List" found set, sorts by `Status` then `Date Entered`, preview.

**`File : Print File List by Agent`** — GTRR onto `Print File List by Agent`, sorts by `Agent`, `Status`, `Date Entered`, preview.

None of these scripts print to a printer or produce a PDF automatically — they all stop at **Preview mode**, and the user then uses the toolbar's *Print* or *Save as PDF*. **[FM]**

### 8.4 `File : Batch PDF` — the only automated PDF path

```
New Window "File Report" → Go to Related Record [ Print File Report Batch ]
Print Setup → Enter Browse Mode → Sort by Files::ID Client → Go to first record
Loop
  Set Variable $File = "filemac:" & Get(DesktopPath)
                     & Upper(Substitute(Files to Clients...Company::Company;" ";"_"))
                     & "_" & Lower(Substitute(Files::Subject Full Name;" ";"_")) & ".pdf"
  Save Records as PDF [ current record → $File ]
  Go to Record [ Next; exit after last ]
End Loop
Replace Field Contents [ Files::ID Reported ; "Report Sent" ]
```

One PDF per case written to the **Desktop**, named `CLIENT_COMPANY_subject_name.pdf`, then the entire found set is stamped `Report Sent`. **[FM]** This is the closest thing to bulk report delivery in the system — and it still requires the user to attach the files to emails manually.

### 8.5 Status / filter scripts

| Script | Action |
|---|---|
| `File : Reported` | Confirm dialog → sets `ID Reported = "Report Sent"` |
| `File : Filter New Instruction` | Find `Status = "New"` (a *begins-with* match, so it also catches variants), sort by `Date Entered` |
| `File : Filter To Report` | Find `ID Reported = "="` (FileMaker for *is empty*) → cases not yet reported; sort Status, Date Entered |
| `File : Filter To Invoice` | Find `ID Invoiced = "="` → cases not yet invoiced; sort Status, Date Entered |

### 8.6 `File : Email Instruction` — the only outbound email in the case workflow

Opens a SimpleDialog form pre-filled with the agent's email, subject line `"iTrace Agent Instruction : 40093"` (**a hard-coded reference number, not the case's own**), and a body assembled from the subject's details. On Send it calls FileMaker's native `Send Mail` step configured for **direct SMTP**: from/reply-to `nicole@itrace.com.au`, server `smtp.optusnet.com.au`, **port 25, no authentication, no TLS**. On success it stamps `Files::Date Instruction Sent = Get(CurrentDate)`. **[FM]**

`Date Instruction Sent` is populated on only **11 of 26,993** records, so this feature is essentially unused — consistent with the client's statement that the system cannot currently email. **[FM]** **[CLIENT]**

### 8.7 Vestigial scripts

The 11 `Leads : *` scripts (POP mailbox polling, follow-up/promo/introduction mail-merges, web scraping via a web viewer, direct-mail printing) and `Marketing : Print List` belong to the Briefcase framework and are outside the business workflow. **[FM]** Exclude from V1.

---

## 9. Calculations — consolidated answers

| Question asked | Answer | Evidence |
|---|---|---|
| How is the reference number generated? | `itrace_files::ID`, auto-enter serial, user-editable, not unique-validated. Range 2921–55981. | [FM] |
| How are dates handled? | `Date Entered` = creation date. `Date Due` = `Date Entered + 14`. `Date Closed` = today, re-stamped on any status ≠ New Instruction. `Date Instruction Sent` = set by the email script only. | [FM] |
| How are rates set? | Hard-coded `Case()` on `Package` then `Type`. **Not** from the client's fee fields. | [FM] |
| How are fees set? | `Fee` branches on `Status`; `Amount = Fee × Units`. | [FM] |
| How is status set? | Auto-enters `New Instruction`; thereafter a radio button on the layout writing free text. | [FM] |
| How is client information populated? | Live, through the `Files to Clients...Company` relationship — client data is **not copied** onto the case, only `ID Client` is stored. | [FM] |
| How is agent information populated? | Live, through `Files to Agents...Name`, matching `Files::Agent` text to `Agents::Name`. | [FM] |
| What drives report values? | The `Report` text field (user-edited copy of a boilerplate) plus merge fields for subject, client, status, refs and dates. | [FM] |

---

## 10. Value Lists

27 value lists; 12 are custom static lists that define the system's controlled vocabularies. **[FM]**

| List | Values |
|---|---|
| **File Status** | New Instruction, Leads Obtained, Non Locate, Located, Completed, Withdrawn, Credited/Disputed |
| **File Type** | Skip Trace, Process Serving, Field Call, Surveillance |
| **File Package** | Basic, Flat, Standard, Premium, Custom |
| **File Title** | Mr., Mrs., Ms., Miss., Dr. |
| **File Gender** | Male, Female |
| **File States** / **States** | Victoria, ACT, NSW, NT, Queensland, South Australia, Tasmania, Western Australia |
| **File Country** | Australia |
| **File Report Sent** | Report Sent (single-value checkbox) |
| **File Invoiced** | Invoiced (single-value checkbox) |
| **Client Kind** | Lawyers, Collections, Private, Investigators, Finance, Professional, Process Servers |
| **Agent Skills** | Skip Tracing, Process Serving, Debt Collection |
| **Referrer** | DeskTop, ADMA, Web Designer, B&T, Exhibition, Word of mouth, Search Engine, AdWords, Email, FileMaker, Ultimate Guide, Facebook, Other |

Field-based (dynamic) lists: **File Agent** (agent names), **File Clients** and **File Clients Find** (client companies) — these drive the auto-complete pickers on the case screen. **[FM]** **[DOC]**

Marketing/Lead lists (Lead Kind, Lead Status, Lead Type, Marketing Product/Manager/Status, etc.) are vestigial. **[FM]**

**None of these value lists are enforced.** Field validation is set to "OnlyDuringDataEntry" with no strict value-list requirement, which is why the data contains 22 statuses, two spellings of Skip Trace and packages like `sarah1`. **[FM]**

---

## 11. Plugins

| Plug-in | State | Used for | Essential? |
|---|---|---|---|
| **24U SimpleDialog** | Installed and enabled | Rich modal dialogs — the report chooser (`File : Print`, `Client : Print`, `Agent : Print`) and the agent-instruction email composer. Also gate-keeps startup: the file **quits if the plug-in is absent**. | Functionally: no. Its jobs are a select-and-confirm dialog and a compose-email form — both are trivial native HTML in a web app. **Replace, do not reproduce.** |
| **MBS FileMaker Plugin** | **Referenced but NOT installed** | `MBS("Register"; …)` at startup and `MBS("FM.RunScript"; …)` to dispatch the chosen print layout. | No. In the web app, choosing a report type is a direct call. |

The absence of MBS means the interactive report chooser is currently non-functional; the working path is the direct Print button plus the layout selector in Preview mode. **[FM]** **[INF]** — *worth confirming with the client as an open question (§29).*

No other plug-ins, no external data sources, no external SQL. **[FM]**

---

## 12. User Navigation

Navigation is entirely layout-switching; there is no navigation state or routing concept. **[FM]**

```
iTrace (main menu)
├── Files List ──► Files (detail)
├── Clients List ──► Clients (detail)
├── Agents List ──► Agents (detail)
├── Leads List ──► Leads (detail)          [vestigial]
└── Marketing List ──► Marketing (detail)  [vestigial]
```

Every list and detail layout carries the same button bar: module buttons (Main Menu / Files / Agents / Clients / Leads / Marketing), record navigation (`<`, `>`), `View` (toggles list↔detail), `Find`, `New`, `Delete`, `Print`. **[FM]**

`Files List` adds column-header sort buttons (Client, File, Due, Status — the Status sort uses the *File Status* value list order rather than alphabetical) and a filter bar: **All / New Instruction / To Report / To Invoice**, plus **Batch PDF**. **[FM]**

On the case screen, the **Client** and **Agent** labels are hyperlink buttons that `Go to Related Record` and jump to that client's or agent's detail screen. **[FM]**

The standard FileMaker menu bar is replaced by the custom menu set `iTrace`, which strips out most commands — the Scripts menu, for example, exposes only *Script Workspace* and *Show Toolbar*, so users cannot run scripts directly. **[FM]**

---

## 13. Case Workflow — traced end to end

Verified against case **55418 / STEPHEN STERN / Integrated Recovery Services**, which is the same case shown in the supplied report PDFs. **[FM]**

| # | Step | What actually happens |
|---|---|---|
| 1 | **Create a case** | `New` button → `New Record/Request` on the `Files` layout. No script, no wizard. |
| 2 | **Reference number** | `ID` auto-enters the next serial. Editable; not unique-checked. |
| 3 | **Defaults applied** | `Type = "Skip Trace"`, `Status = "New Instruction"`, `Agent = "Nicole Gualtiera"`, `Units = 1`, `Date Entered = today`, `Date Due = today + 14`. |
| 4 | **Select client** | Auto-complete picker on `ID Client` backed by the *File Clients* value list. Only the ID is stored. |
| 5 | **Client info populates** | Nothing is copied. Client company/address/name resolve live through `Files to Clients...Company` wherever displayed or printed. |
| 6 | **Package & rates populate** | `Package` recalculates from the client's `Package` (→ almost always `"Standard"`), then `Rate 1` = 150 and `Rate 2` = 50 from the hard-coded `Case()`. `Fee` = 0 while status is New Instruction. |
| 7 | **Enter subject** | Typed directly into the `Subject *` fields on the case record. `Subject Full Name` recalculates. |
| 8 | **Enter last known address** | The "Last Known Address" block = `Previous *` fields. |
| 9 | **Assign agent** | Picker on `Files::Agent` backed by the *File Agent* value list of agent names. **Stores the name text.** |
| 10 | **Send agent instruction** | Either `Email Instruction` (SimpleDialog + direct SMTP; stamps `Date Instruction Sent`) or print the `Print File Agent Instruction` layout. In practice, printing. |
| 11 | **Conduct investigation** | Findings typed into `Agent Notes`; confirmed address typed into the "Confirmed Address" block (`Subject *` fields). |
| 12 | **Write the report** | Click one of five template buttons → confirm overwrite → boilerplate copied into `Report` → user edits it heavily. Mean report length in the data is ~1,173 characters, max 15,896. |
| 13 | **Update status** | Radio button. This immediately re-runs `Fee` (Non Locate → `Rate 2` = 50; Located/Completed → `Rate 1` = 150; Withdrawn or Credited/Disputed → 0) and stamps `Date Closed = today`. |
| 14 | **Choose the report** | Intended: the `File : Print` chooser, defaulting by status (New Instruction → Agent Instruction; Leads Obtained → File Update; otherwise File Report). Actual: the visible Print button goes straight to `Print File Report`, and the user switches layout in Preview if needed. |
| 15 | **Generate / print** | Script ends in **Preview mode** in a separate "File Report" window. |
| 16 | **Save as PDF** | Toolbar **Save as PDF**, manually, choosing a location. Or `Batch PDF` for the whole found set → Desktop. |
| 17 | **Send to client** | **Outside the system.** The user attaches the PDF to an email in their mail client. There is no case-report email script. |
| 18 | **Mark reported / invoiced** | `Report Sent` checkbox (`ID Reported`) — set manually, or automatically for every record in the set by `Batch PDF`. `Invoiced` checkbox (`ID Invoiced`) set manually; no invoice is produced. |
| 19 | **Close the case** | There is no explicit close action. `Date Closed` is a side-effect of any status change. "Completed" is just one more status value. |
| 20 | **Find it again** | `Cmd+F` → Find mode → type into any field → Return. Or the All / New Instruction / To Report / To Invoice filter buttons. |

**Status → report type mapping (the "final report changes depending on outcome" behaviour):** the report *layout* barely changes. What changes is (a) which of five boilerplate bodies the user pastes into `Report`, and (b) the `<<Status>>` merge field printed as the report's headline. The three case layouts differ only in their fixed intro/outro paragraphs. **[FM]**


---

## 14. Client Management

- Create/edit/delete via the same generic New / Delete buttons; no validation, no duplicate check. **[FM]**
- `ID` is a serial. All 689 IDs are unique and non-blank. **[FM]**
- Two address blocks; the postal block auto-copies the physical block on creation and is then independently editable. **[FM]**
- Three separate email fields with distinct intent: `Email` (general, 358 populated), `Email Invoice` (251), `Email Reports` (20). **[FM]** For V1's direct-email feature, **`Email Reports` is the correct destination field, falling back to `Email`** — but it is populated on only 3% of clients, so the new UI must make it easy to fill in. **[INF]**
- Commercial fields (`File Fee`, `Locate Fee`, `Non Locate Fee`, `Hourly Fee`, `Terms`, `ABN`) are captured but — apart from `Package` — **never consumed by any calculation, script or layout other than the client screen itself**. **[FM]**
- `Kind` classifies the client (Lawyers, Collections, Private, Investigators, Finance, Professional, Process Servers). **[FM]**
- `Account Name` / `Account Password` are the abandoned client-portal credentials, stored **in plain text**, set on one client. **[FM]**
- Printing: Client Details, Client Envelope, Client List. **[FM]**

## 15. Agent Management

- 35 records, IDs 1123–1158. **[FM]**
- The agent is chosen on a case **by name string**. Renaming an agent silently detaches every historical case. **[FM]**
- `Skills` is a three-way checkbox set; there is **no filtering of the agent picker by skill** — the value list offers all agents regardless of the case `Type`. **[FM]**
- `Rate` exists, is empty on all 35 records, and is not on any layout. Agent cost is not tracked. **[FM]**
- Printing: Agent Details, Agent Envelope, Agent List, plus `File : Print File List by Agent` for workload. **[FM]**
- Data quality: 2 blank names, 1 corrupted Skills value, several records where a company name occupies the `Name` field. **[FM]**

## 16. Subject Management

**There is no Subject entity.** Subject data is 20 flat fields on the case record. **[FM]**

Consequences observed in the data: **[FM]**

- The same person appearing in two cases is stored twice, with no link.
- There is no subject history, no "previously reported" flag — although report bodies contain manual notes such as "Subject was previously reported by ourselves on 13th August 2013", showing staff track this by memory and free text.
- Searching for a repeat subject means a Find on `Subject Lastname` / `Subject Full Name` across all cases.
- `Subject Full Name` is a stored calculation and is indexed, which is what makes that search fast today.

For V1 the recommendation is to **keep subject data denormalised on the case** (parity, simplicity, and it matches how the business thinks) while adding a cross-case subject search. A separate Subjects table is a Phase 3 idea, not V1. **[INF]**

## 17. Search / Filtering

**How users search today** — verified in the app and consistent with the walkthrough. **[FM]** **[DOC]**

1. `Cmd+F` or the **Find** button enters FileMaker Find mode. Every field on the layout becomes a query box.
2. The user types into one or more fields — pickers offer auto-complete from the *File Clients Find* / *File Agent* value lists.
3. Return (handled by the `Keystroke` trigger) performs the find; Esc cancels back to Browse.
4. The found count shows as "Record n: x / y Found"; `<` `>` step through results; **View** switches between list and detail.
5. `Show All Records` (`Cmd+J` / the **All** button) resets.

**Saved/one-click filters** (Files List only): **[FM]**

| Button | Query |
|---|---|
| All | Show all 26,993 |
| New Instruction | `Status = "New"` (begins-with), sorted by Date Entered — currently returns 201 |
| To Report | `ID Reported` is empty, sorted by Status, Date Entered |
| To Invoice | `ID Invoiced` is empty, sorted by Status, Date Entered |

**Sorting:** column-header buttons on `Files List` (Client, File/ID, Due, Status — Status sorts by value-list order, not alphabetically). **[FM]**

**Indexed fields** that make search viable today: `ID`, `ID Client`, `Client Ref.`, `Subject Full Name`, `Subject Lastname`, `Subject Firstname`, `Subject City/State/Country`, `zcalc_Subject Address`, `zcalc_Previous Address`, `Status`, `Type`, `Package`, `Report`, `Agent Notes`, `Additional Info`. **[FM]**

There is **no global/cross-module search** — a find on the Files layout searches only Files. **[FM]**

## 18. Status / Workflow Logic

**Defined statuses (value list):** New Instruction → Leads Obtained → Non Locate / Located → Completed, plus Withdrawn and Credited/Disputed. **[FM]**

There is **no state machine**. Any status can be selected from any other; no transition is validated, logged or restricted. **[FM]**

**Side effects of a status change:** **[FM]**

1. `Fee` recalculates immediately (New Instruction → 0; Non Locate → `Rate 2`; Withdrawn → 0; Credited/Disputed → 0; anything else → `Rate 1`).
2. `Amount` recalculates as `Fee × Units`.
3. `Date Closed` is set to **today** — every time, including on a status *correction* months later.
4. The default report type in the print chooser changes.
5. The `<<Status>>` merge field changes the headline printed on the client report.

**Two independent flags** sit outside the status: `ID Reported` ("Report Sent") and `ID Invoiced` ("Invoiced"). They are text fields with single-value checkbox lists, not statuses. **[FM]**

**Actual status values in the data (26,993 records):** **[FM]**

| Value | Count |
|---|---:|
| Non Locate | 11,601 |
| Located | 10,102 |
| Completed | 1,459 |
| Leads Obtained | 897 |
| `Located ` *(trailing space)* | 771 |
| Withdrawn by Client | 674 |
| Withdrawn | 435 |
| Closed | 272 |
| New Instruction | 201 |
| 3rd Party Locate | 169 |
| Leads obtained *(lowercase o)* | 121 |
| `Located     ` *(5 trailing spaces)* | 110 |
| Credited | 32 |
| Document served | 20 |
| Credited / client disputes | 16 |
| Credited/Disputed | 14 |
| File with Process server | 10 |
| Process, Investigations ongoing, others | ~10 |

22 distinct values; **1,402 records (5.2%) hold a status outside the value list**. Because `Fee` matches exact strings, every one of those 1,402 records was priced at `Rate 1` regardless of outcome — including the 674 "Withdrawn by Client" records that should arguably have been zero-rated. **[FM]** **[INF]**

## 19. Report System

### 19.1 The five boilerplate bodies

Stored as five text fields in the single `itrace_templates` record and editable through the `TemplatesEdit` layout (reachable from an **Edit Templates** button on the case screen). **[FM]**

| Template field | Button label | Typical content |
|---|---|---|
| `Located` | Located | REPORT SUMMARY / LOCATED RESULTS — residential address, mobile, DOB, email, source of confirmation |
| `Non Locate` | Not Located | NOT LOCATED RESULTS — last known address, neighbours, phone attempts, email attempts, then SEARCH RESULT NOTES (Electoral Roll, national databases, social media, property ownership, rental applications, employment/ABN) |
| `Leads Obtianed` *(sic)* | Leads Obtained | LEADS OBTAINED — possible address found, unverified, recommend a field call |
| `Process Service` | Process Service | Service-of-documents result wording |
| `Field Call` | Field Call | "Thank you for your instruction in this matter to serve Legal Documents on XXXXXX at the address XXXXXX / RESULT: Served / Unserved / Information Obtained / Our agent attended the given address on XXXX at XXXX am/pm / Affidavit has been completed…" |

The bodies contain literal `XXXXXX` placeholders the user overtypes. There is **no merge-field substitution inside the templates** — they are plain text. **[FM]**

The supplied `updatereport.pdf` and `skipreport .pdf` both show the Located + Leads Obtained + Non Locate bodies concatenated, which is what happens when a user clicks several template buttons in sequence or edits one heavily. **[FM]** **[INF]**

### 19.2 The report layouts and what populates them

| Element | Source | Static or dynamic |
|---|---|---|
| Letterhead (logo, "SKIP TRACING AND LOCATIONS AUSTRALIA PTY LTD", ABN 52 675822349, website, email) | Layout graphic + text | **Static** |
| Footer (ACN 623713593, ABN 97 623 713593, PO Box 86 Canterbury VIC 3126, 1800 053 299) | Layout text | **Static** |
| "PRIVATE AND CONFIDENTIAL" | Layout text | **Static** |
| Client address block | `Files to Clients...Company::Company / Name / Address 1 / Address 2 / City / State / Postcode / Country` | **Automatic** (from client record) |
| Report headline | `<<Status>>` | **Automatic** |
| `Date Closed` | `<<Date Closed>>` | Automatic |
| Date on Update report | `{{CurrentDate}}` | Automatic |
| "Our Ref" / "People Trackers Ref" | `<<ID>>` | Automatic |
| "Your Ref" | `<<Client Ref.>>` | Automatic |
| Intro paragraph | Layout text (differs per layout) | **Static** |
| `RE: <subject>` | `<<Subject Title>> <<Subject Firstname>> <<Subject Middlename>> <<Subject Lastname>>` | Automatic |
| Report body | `<<Report>>` | **User-entered** (seeded from a template) |
| Sign-off | Layout text | **Static** |

**Conditional content:** there is none inside a report. Nothing hides or shows based on data. The only conditionality in the whole system is *which layout* is chosen, and the default that the print chooser pre-selects. **[FM]**

### 19.3 Complete report inventory — the five supplied PDFs are not the full list

| # | Report | Layout | Supplied as PDF? |
|---|---|---|---|
| 1 | Case report to client | `Print File Report` | Yes — `skipreport .pdf` and `fieldcallreport.pdf` are **both this layout**, differing only in `Report` content and `Status` |
| 2 | Update report to client | `Print File Update` | Yes — `updatereport.pdf` |
| 3 | Agent instruction sheet | `Print File Agent Instruction` | Yes — `newinstructionstemplate.pdf` |
| 4 | Client status report | `Print Client Status Report` | Yes — `clientstatusreport.pdf` |
| 5 | **File list by agent** | `Print File List by Agent` | **No** |
| 6 | **Batch case report** (different sign-off/branding) | `Print File Report Batch` | **No** |
| 7 | **Client list** | `Print Clients List` | No |
| 8 | **Client details** | `Print Clients Details` | No |
| 9 | **Client envelope** | `Print Clients Envelope` | No |
| 10 | **Agent list** | `Print Agents List` | No |
| 11 | **Agent details** | `Print Agents Details` | No |
| 12 | **Agent envelope** | `Print Agents Envelope` | No |
| 13 | Leads list | `Print Leads` | No (vestigial) |

So: **12 live report outputs, not 5.** The client-facing case reports are only three of them. **[FM]**

## 20. PDF / Printing

- Every print script ends at **Preview mode** in a secondary window; nothing prints or saves automatically. **[FM]**
- PDF is produced by the user pressing **Save as PDF** in FileMaker's preview toolbar and choosing a filename and folder. **[FM]**
- The single exception is `File : Batch PDF`, which writes one PDF per case to the **Desktop** as `CLIENT_COMPANY_subject_name.pdf` and then flags the whole found set as `Report Sent`. **[FM]**
- `Print Setup` is called before each preview, so page setup is whatever was last configured in FileMaker. **[FM]**
- Reports are laid out for A4 portrait with letterhead/footer text repeated per page. **[FM]** **[INF]**
- There is no PDF archive: generated PDFs live in the filesystem, unlinked from the case. **[FM]**

## 21. Email behaviour

| Mechanism | Detail | Evidence |
|---|---|---|
| `File : Email Instruction` | The only case-related email. SimpleDialog compose form → native `Send Mail` via **direct SMTP** (`smtp.optusnet.com.au`, port 25, no auth, no TLS), from `nicole@itrace.com.au`. Subject line contains a **hard-coded** reference "40093". Stamps `Date Instruction Sent`. Used on 11 of 26,993 records. | [FM] |
| List-screen "Email" buttons | On Clients List, Agents List, Leads List and the print list layouts. Native `Send Mail` **via the local e-mail client**, subject `"Briefcase Order " & …`. Field references are broken (`<Table Missing>::<Field Missing>`) — leftovers from the Briefcase framework. | [FM] |
| `Leads : Get Mail` | POP3 polling of `pop.briefcase.net.au` to harvest website enquiries into the Leads table. Credentials hard-coded in `Open Script`. Vestigial. | [FM] |
| `Leads : Email Follow Up / Introducing / Promo / International` | Marketing mail-merges. Vestigial. | [FM] |
| **Emailing a case report to a client** | **Does not exist.** No script attaches or sends a report PDF. | [FM] |

This confirms the client's statement that the current system cannot send reports by email, and makes direct email the single highest-value new capability in V1. **[FM]** **[CLIENT]**

## 22. Permissions / Users

**Accounts (4):** **[FM]**

| Account | Notes |
|---|---|
| `[Guest]` | FileMaker default |
| `Developer` | Vendor account |
| `Nicole Gualtiera` | Owner. DDR reports `emptyPassword = True` |
| `Megan Campbell` | Second staff member |

The file **does require a login** — verified: opening it presents FileMaker's sign-in dialog. `OnOpen` specifies a default account name of `Admin` and permits saving the password to Keychain. **[FM]**

**Privilege sets (5):** **[FM]**

| Set | Records | Layouts | Scripts | Notes |
|---|---|---|---|---|
| `[Full Access]` | Create/Edit/Delete | Modifiable | Modifiable | Everything |
| `[Data Entry Only]` | Create/Edit/Delete | View only | Execute only | Idle disconnect on |
| `[Read-Only Access]` | View only | View only | Execute only | Idle disconnect on |
| **`[Client]`** | **Custom** — `itrace_files`: create/view/edit (no delete); `itrace_clients`: view only; **all other tables: no access** | Custom per-layout | Execute only | No export; no password change. The client-portal role. |
| **`[Agent]`** | Create/Edit (no delete) | View only | Execute only | No export; no password change |

**Extended privileges present:** `fmapp`, `fmwebdirect`, `fmxml`, `fmxdbc`, `fmphp`, `fmiwp`, `fmreauthenticate0/10`. The presence of `fmwebdirect` alongside the `[Client]` set and the two Client Portal layouts confirms a planned external portal. **[FM]** **[INF]**

**No per-record ownership, no field-level restrictions in use, no audit log.** `itrace_files` — the table that matters — records neither who last modified a case nor when. **[FM]**

**Expected user count:** 2 named staff accounts exist. **[FM]** Actual concurrent users unconfirmed. **[?]**


---

## 23. Data Migration

All figures below are measured from a full read-only export of the live tables on 9 August 2026. **[FM]**

### 23.1 Volumes

| Table | Records | Exported size |
|---|---:|---:|
| `itrace_files` | 26,993 | 46.8 MB |
| `itrace_clients` | 689 | 292 KB |
| `itrace_agents` | 35 | 7 KB |
| `Leads` | 9,513 | not exported — out of scope |

### 23.2 Identifier integrity

| Check | Result | Severity |
|---|---|---|
| `Files::ID` blank | **15 records** | High — no reference number |
| `Files::ID` duplicated | **15 records** | High — reference number is not unique |
| `Files::ID` range | 2921 – 55981 | — |
| Numbers absent in range | ~26,083 | Expected (deletions/archiving) |
| `Clients::ID` unique & non-blank | 689/689 ✔ | None |
| `Agents::ID` unique & non-blank | 35/35 ✔ | None |

### 23.3 Referential integrity

| Check | Result | Severity |
|---|---|---|
| Files with blank `ID Client` | **93** | High |
| Distinct client IDs referenced by files | 753 | — |
| Client IDs referenced that **do not exist** | **82** | High |
| Files pointing at a missing client | **1,294 (4.8%)** | High |
| Clients with no files at all | 19 | Low |
| Files with blank `Agent` | 11,405 (42%) | Expected — unassigned |
| Distinct `Agent` strings | 149 |  |
| Agent strings matching **no** agent record | **117 of 149** | High |
| Files with an unmatchable agent | **985 (3.6%)** | High |

Unmatchable agent examples: case variants (`SCOTT GILES` vs `Scott Giles`), trailing whitespace (`VICTOR `, `Kady Reynolds `), agent **ID numbers used as names** (`01109`, `01106`), company names (`EXPRESS MERCANTILE`, `DATA LINK`, `Nautilus Investigations`), and initials (`M.B.`). **[FM]**

### 23.4 Controlled-vocabulary drift

| Field | Values allowed | Values present | Non-conforming rows |
|---|---:|---:|---|
| `Status` | 7 | **22** | 1,402 (5.2%) — plus whitespace variants of "Located" |
| `Type` | 4 | **7** | "Skip Tracing" 12,517 and "Process" 277 are non-list synonyms — **47.4% of all rows** |
| `Package` | 5 | 8 | Includes `$150+gst bonus` (90), `sarah1` (1), `StandPremiumard` (1); 13,554 blank |

The `Type` issue is the single largest normalisation job: `Skip Trace` (13,418) and `Skip Tracing` (12,517) are the same service, and the split explains why half the records carry no package or rate. **[FM]**

### 23.5 Date quality — the highest-risk item

FileMaker date fields tolerate values it cannot parse; those values export with a different separator. Counting them: **[FM]**

| Field | Non-blank | Valid `dd/mm/yyyy` | **Malformed** |
|---|---:|---:|---:|
| `Date Entered` | 26,990 | 26,873 | **117** (e.g. `25.08.2008`, `17.5.2007`) |
| `Date Closed` | 25,931 | 25,237 | **694** (e.g. `04.06.2007`, `3.07.2008`) |
| `Subject DOB` | 11,336 | 10,705 | **631** (e.g. `01.01.1944`) |
| `Date Due` | 26,977 | 26,977 | 0 ✔ |
| `Date Instruction Sent` | 11 | 11 | 0 ✔ |

**1,442 malformed date values in total.** Most are dot-separated and mechanically convertible, but each must be verified — `3.07.2008` is unambiguous, `01.02.2008` is not (the file's locale is Australian dd/mm, so it should be read as 1 February). A dry-run conversion report is mandatory before cutover. **[FM]** **[INF]**

### 23.6 Financial data

| Field | Populated | Min | Max | Mean |
|---|---:|---:|---:|---:|
| `Rate 1` | 26,885 | 0 | **100,300** | 744.37 |
| `Rate 2` | 14,123 | 0 | 500 | 63.40 |
| `Fee` | 26,796 | 0 | **100,300** | 679.49 |
| `Amount` | 17,584 | 0 | 100,300 | 124.45 |
| `Units` | 14,124 | 0 | 1 | 1.00 |

**7,512 records (27.8%) have a `Fee` that does not match what the current formula would produce** from their `Status`, `Rate 1` and `Rate 2`. Causes: historical records predating the formula, manual overrides, and the status-drift described above. **Migrate these values as stored history; do not recompute them.** **[FM]** **[INF]**

The 100,300 maximum in `Rate 1`/`Fee` is a clear outlier requiring review. **[FM]**

### 23.7 Report text

25,373 records carry a `Report` body; mean 1,173 characters, maximum 15,896. Only 8 records contain HTML-like markup. The text is plain, with newlines. **[FM]** Migrate verbatim into a text column; do not attempt to parse it into structured fields.

### 23.8 Attachments

`itrace_files::Attachments` is a container field, exposed only on the unused Client Portal layout. FileMaker refused to export it ("Container fields cannot be exported"). A binary scan of the whole 150 MB file finds **only 2 JPEG and 2 PNG signatures** — consistent with the two layout logo graphics and nothing else. **Conclusion: no documents are stored in the database.** This corroborates the client's statement. **[FM]** **[CLIENT]**

### 23.9 Fields that appear obsolete — do not migrate

`Gl Client` (global, 0% populated) · `calc_Found` (UI helper) · `sum_Count` (summary) · `zcalc_Subject Address`, `zcalc_Previous Address`, `zcalc_Employer Address`, `zcalc_Address` (recomputable) · `zcalc_Report`, `zcalc_Rate`, `zcalc_Date` (UI/report helpers) · `Subject Full Name` (recomputable) · `Employer Fax`, `Employer Country` (0%) · `Attachments` (empty) · entire `Leads`, `Marketing`, `Templates` (marketing), `itrace_leads`, `itrace` tables · `Agents::Rate` (0%) · `Clients::Hourly Fee` (0%). **[FM]**

### 23.10 Fields that must be preserved exactly

`Files::ID` (the reference number printed on thousands of historical reports) · `Client Ref.` (the client's own reference) · `Report` (the deliverable text) · `Status`, `Type`, `Package` (**raw values, alongside a normalised value — never overwrite the original**) · all four date fields · `Fee`, `Amount`, `Rate 1`, `Rate 2`, `Units` · `ID Reported`, `ID Invoiced` · `Agent` (raw string, alongside a resolved `agent_id`) · all subject, previous-address and employer fields · `Clients::ID` and `Agents::ID`. **[INF]**

### 23.11 Recommended migration strategy

1. Load **raw** into staging tables, one column per FileMaker field, everything as text.
2. Add `legacy_status`, `legacy_type`, `legacy_package`, `legacy_agent_name` columns preserving originals verbatim.
3. Normalise into typed columns using an explicit, reviewable mapping table (see §32.9).
4. Resolve agents by trimmed case-insensitive name match; leave `agent_id` NULL and keep the raw string where no match exists (985 rows).
5. Create placeholder client records (`"Unknown client (legacy #NNNN)"`) for the 82 orphan IDs rather than dropping 1,294 cases.
6. Convert dates with a logged, reviewable dry run; flag the 1,442 malformed values for human sign-off.
7. Reconcile: row counts, sum of `Amount`, count per status, count per client — old vs new — before cutover.
8. Freeze the FileMaker file read-only at cutover and retain it as the archive of record.

---

## 24. Current Limitations

**[FM]** unless noted.

| # | Limitation | Impact |
|---|---|---|
| 1 | Single-user desktop file on one Mac; no remote access | The business stops if that machine does. **[FM]** **[CLIENT]** |
| 2 | Cannot email a report to a client | Every delivery is manual |
| 3 | PDF export is one-at-a-time and manual; batch dumps to the Desktop | Slow, error-prone, files unlinked from cases |
| 4 | Reference numbers are editable, not unique — 15 blanks, 15 duplicates | Ambiguous references on client correspondence |
| 5 | Agent linked by name text | 985 broken links; renaming an agent orphans history |
| 6 | Value lists are advisory, not enforced | 22 statuses, two spellings of Skip Trace, junk packages |
| 7 | Pricing hard-coded in a formula | Any price change is a schema change; per-client rates captured but ignored |
| 8 | `Date Closed` re-stamps on every status change | Close dates are unreliable for reporting |
| 9 | No audit trail on cases | Cannot tell who changed a case or when |
| 10 | No cascade rules | 1,294 cases point at deleted clients |
| 11 | No subject entity | Repeat subjects invisible; no cross-case history |
| 12 | Report generation ends at Preview; no archive of what was sent | No proof of what the client received |
| 13 | Depends on a paid plug-in (24U SimpleDialog) that **quits the app** if absent | Fragile |
| 14 | Depends on a second plug-in (MBS) that is **not installed** — the report chooser cannot dispatch | Feature silently broken |
| 15 | Plaintext credentials in scripts and in client records | Security exposure (§28) |
| 16 | Direct SMTP on port 25 with no auth or TLS | Will not work with modern mail providers |
| 17 | ~40% of the file (Leads, Marketing, POP harvesting) is dead framework weight | Confusion, maintenance burden |
| 18 | No reporting or analytics beyond two printed lists | No visibility on volume, turnaround or revenue |
| 19 | The file has been through FileMaker `Recover` | Not a trustworthy long-term system of record **[INF]** |
| 20 | Stale branding in `Print File Report Batch` ("iTrace Australia Pty Ltd") | Wrong entity on batch-sent reports |

---

## 25. V1 Web Application Requirements

Scope discipline: V1 = **everything the business does today, done better, plus direct email**. Nothing else.

### 25.1 In scope

| Module | Requirements |
|---|---|
| **Auth** | Email + password login, session management, password reset. 2–5 users. Roles: Admin, Staff. |
| **Dashboard** | Counts and quick links for the four existing filters: All, New Instruction, To Report, To Invoice. Plus overdue (`date_due < today` and not closed) — a genuine gap today. |
| **Cases** | List with the current columns, server-side sort on Client/ID/Due/Status, pagination. Detail screen mirroring the current field groups. Create with the same defaults. Client and agent pickers with type-ahead. Live-computed package/rates/fee/amount with a manual override. Status control with side effects. Five report-body template buttons with overwrite confirmation. Rich-enough text editor for the report body. |
| **Clients** | CRUD, both address blocks with "copy physical → postal", three email fields, fee fields, Kind, Package, notes. List + search. |
| **Agents** | CRUD, contact details, skills, notes. List + search. |
| **Search** | Per-module filtered search on the fields indexed today, **plus** one global search box across case ID, client ref, subject name, client company and agent. |
| **Reports** | Server-side PDF generation for the three case reports (Case Report, Update Report, Agent Instruction) and the two list reports (Client Status Report, File List by Agent), pixel-faithful to the current letterhead. Preview in-browser, download, and **store every generated PDF against the case**. |
| **Email** | Send a generated report to the client (default recipient `Email Reports` → fallback `Email`) with editable subject/body from a saved template, PDF attached. Send an agent instruction to the agent's email. Log every send (to, when, by whom, which document) on the case. |
| **Templates admin** | Edit the five report bodies and the email bodies. |
| **Settings** | Company details for letterheads, packages and their rates **as data**, status list, type list, user management. |
| **Audit** | Created/modified by + timestamp on every record; a simple change log for case status and financial fields. |

### 25.2 Explicitly out of scope for V1

Invoicing · accounting/MYOB/Xero integration · document & photo attachments · client portal · agent portal · Leads · Marketing · POP mail harvesting · automated notifications · analytics dashboards · case timelines · a Subjects entity · mobile app. **[CLIENT]**

### 25.3 Deliberate parity-breaks (small, justified, agree before build)

| Change | Why |
|---|---|
| Reference number becomes **unique and non-editable** for new cases; the sequence continues from 55,982. Historical duplicates/blanks are migrated as-is. | Removes a real correctness bug without touching history |
| `date_closed` is set **once**, when the case first leaves New Instruction, and is thereafter editable but not auto-re-stamped | Makes close dates trustworthy |
| Agent stored as `agent_id`, with the legacy name string retained | Removes the 985 broken links |
| `Status`, `Type` and `Package` become enforced enumerations for new records | Stops vocabulary drift at source |
| Package rates move from a hard-coded formula into a `packages` table | Nicole can change prices without a developer |
| Per-client fee overrides become live (currently captured but ignored) | The client already believes this works |

Each of these is a small change with a large payoff. Item 5 in particular should be confirmed: it is the difference between "reproduce what exists" and "reproduce what the client thinks exists". **[?]**

---

## 26. Future Features (post-V1, in suggested order)

1. **Report delivery archive & read receipts** — building on V1's PDF store.
2. **Document / photo attachments** on cases (S3 + presigned URLs). **[CLIENT]**
3. **Invoicing** — the data is already there (`Fee`, `Units`, `Amount`, `ID Invoiced`, client `Terms`/`ABN`). **[CLIENT]**
4. **Accounting integration** — Xero or MYOB. **[CLIENT]**
5. **Client portal** — the old system half-built one; `[Client]` privileges and the two portal layouts are the spec.
6. **Agent portal** — agents submit findings directly; `[Agent]` privilege set is the precedent.
7. **Subjects entity** with cross-case history and duplicate detection.
8. **Case timeline / activity feed.**
9. **Notifications** — overdue cases, unreported cases.
10. **Analytics** — volume by client, turnaround time, locate rate, revenue by package.
11. **Additional report templates** and a template editor with merge fields.

---

## 27. Recommended Architecture

Sized for 2–5 concurrent users, ~27k rows and modest growth. Boring and cheap is correct here.

| Layer | Recommendation | Rationale |
|---|---|---|
| Frontend | React + TypeScript, Vite, TanStack Query, Tailwind + a component library | Standard, hireable, fast to build |
| Backend | Node.js + TypeScript (NestJS or Fastify), REST | One language across the stack |
| Database | **PostgreSQL** | Real constraints, `tsvector` full-text search for the report/notes search that FileMaker does with indexes today |
| ORM/migrations | Prisma or Drizzle | Versioned schema |
| Auth | Session cookies or JWT + refresh; Argon2id password hashing; TOTP 2FA available | Small user base, no need for an external IdP |
| **PDF generation** | **Headless Chromium (Playwright) rendering an HTML/CSS A4 template** | The reports are letterhead documents with repeating headers/footers — CSS `@page` handles this well and keeps templates editable |
| Email | Transactional provider (Postmark / SendGrid / SES) with a verified sending domain, SPF + DKIM + DMARC | Replaces unauthenticated port-25 SMTP; gives delivery logs |
| File storage | S3-compatible object store for generated PDFs (and future attachments) | Cheap, durable |
| Hosting | A managed platform (Render / Fly.io / Railway) or a small AWS footprint, in an **Australian region** | Data residency for Australian personal data |
| Backups | Automated daily encrypted DB snapshots, 30-day retention, **restore tested quarterly** | The current system's backup story is a single Mac |
| Observability | Error tracking (Sentry) + structured logs | — |

Deliberately **not** recommended: microservices, event sourcing, GraphQL, Kubernetes, a separate mobile app. The whole system is three entities and twelve documents. **[INF]**

---

## 28. Security Requirements

### 28.1 Issues found in the current system — act on these regardless of the rebuild

| # | Finding | Action |
|---|---|---|
| 1 | **A plaintext POP mailbox password is embedded in `Open Script`**, along with the mailbox username and host. Anyone with the file can read it. | **Rotate that mailbox password now.** It is visible to anyone who has ever had a copy of the .fmp12 — including this project's working copies. |
| 2 | Outbound SMTP is `smtp.optusnet.com.au:25`, **no authentication, no TLS** | Replace with an authenticated TLS provider |
| 3 | Client portal credentials (`Clients::Account Name` / `Account Password`) are stored **in plain text** | Never migrate as-is; hash or discard |
| 4 | Database file is **not encrypted at rest** and contains ~27,000 people's names, dates of birth, addresses, phone numbers and licence numbers | Encrypt any copy; control distribution |
| 5 | The DDR reports the owner account (`Nicole Gualtiera`) as having an **empty password** | Verify and set a strong password |
| 6 | No audit trail on case records | Add in V1 |
| 7 | Plug-in licence keys embedded in scripts | Not sensitive, but note for decommissioning |

Working copies of this database, the DDR XML and the three CSV exports now exist in the project folder. They contain personal information and should be treated as confidential and deleted when the project completes.

### 28.2 Requirements for the new system

- **This is sensitive personal data under the Australian Privacy Act 1988 / Australian Privacy Principles.** Subject records include full name, DOB, driver's licence number, home address, employer and phone numbers, collected without the subject's knowledge. Treat it accordingly.
- Host in an **Australian region**; document data residency.
- TLS 1.2+ everywhere; HSTS.
- Passwords hashed with Argon2id; 2FA available for all users, enforced for Admin.
- Role-based access control (Admin / Staff), enforced server-side on every endpoint — not just hidden in the UI.
- Full audit log: who created/modified/deleted each case, client and agent, with before/after values on status and financial fields.
- Log every report generation and every email send, with recipient and timestamp.
- Rate-limit login; lock out after repeated failures.
- Generated PDFs served via short-lived signed URLs, never public.
- Encryption at rest for the database and object store.
- Daily encrypted backups, tested restores, documented retention.
- A data-retention policy — the oldest cases are from 2007 and there is currently no deletion rule. **[?]**
- Input validation and parameterised queries throughout; no raw SQL string building.
- Dependency scanning in CI.

---

## 29. Open Questions

Ordered by how much they could change the build.

| # | Question | Why it matters |
|---|---|---|
| 1 | Should per-client fee fields (`Locate Fee`, `Non Locate Fee`, `File Fee`) **actually drive pricing** in V1, or continue to be ignored as they are today? | Changes the pricing engine. 359 clients have these set. |
| 2 | Are "Skip Trace" and "Skip Tracing" the same service? Likewise "Process" and "Process Serving"? | Affects 12,794 records and their packages/rates |
| 3 | The 15 non-list statuses (Withdrawn by Client, Closed, 3rd Party Locate, Document served, Credited…) — map each to one of the 7 official statuses, or extend the official list? | 1,402 records; affects fee logic |
| 4 | Does the interactive **report chooser** (the SimpleDialog + MBS dispatcher) work today, or has it been broken since the MBS plug-in was removed? | Determines whether we are reproducing a live feature or a dead one |
| 5 | Which sign-off is correct — "People Trackers Australia" or "Nicole Gualtiera / iTrace Australia Pty Ltd"? Two report layouts disagree. | Client-facing branding |
| 6 | Two ABNs appear on the letterheads (52 675822349 on the report header, 97 623 713593 in the footer). Both current? | Legal accuracy of every report |
| 7 | Should the 1,294 cases with a missing client be attached to placeholder clients, or is there a lookup for those 82 IDs? | Migration completeness |
| 8 | Migrate **all** 26,993 cases, or only from a cut-off date with the rest archived read-only? | Migration effort and cost |
| 9 | Confirm the Australian dd/mm reading of the 1,442 malformed dates. | Data correctness |
| 10 | Should `Report Sent` and `Invoiced` remain independent flags, or become part of the status? | Workflow model |
| 11 | Is the client portal genuinely wanted later, or abandoned? | Influences V1 data model (client accounts) |
| 12 | How many concurrent users, and will agents ever log in? | Licensing/hosting sizing |
| 13 | What is the `100,300` rate/fee outlier? | Data validation rule |
| 14 | Data retention policy for cases and subject personal data? | Privacy compliance |
| 15 | Is the `Leads` table (9,513 rows) of any residual value, or purely dead? | Migration scope |
| 16 | Preferred sending domain and address for outbound email? | Email deliverability setup |

---

## 30. Scope Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Data migration underestimated** — 1,442 bad dates, 1,294 orphan clients, 985 broken agent links, 1,402 rogue statuses | High | High | Treat migration as its own workstream with its own budget. Build the ETL early, run it repeatedly, produce a reconciliation report each time. |
| **Report fidelity disputes** — the reports are the product; a client noticing a layout change is a business problem | High | Medium | Pixel-compare generated PDFs against the supplied originals for a sample of 20 real cases and get written sign-off before cutover. |
| **Scope creep into invoicing** — the fee data is right there and it is tempting | High | High | Hold the line. Fees are *recorded* in V1, not invoiced. |
| **"It should work like FileMaker"** — keyboard-driven Find mode, single-letter navigation, arrow-key record stepping are deeply habitual | Medium | Medium | Keep a persistent search box, keyboard shortcuts, and prev/next record navigation on the case screen. Budget for training. |
| **Hidden workflows** not visible in schema or scripts (spreadsheets, manual steps, email conventions) | Medium | Medium | One observed working session with Nicole before build sign-off. |
| **Email deliverability** — reports going to spam would be worse than the status quo | Medium | High | Verified domain, SPF/DKIM/DMARC, transactional provider, monitored bounces. |
| **The 100,300 outlier and similar** indicate unknown manual practices | Medium | Low | Resolve in §29 Q13 |
| **Recovered-file corruption** — subtle damage from the FileMaker `Recover` that only surfaces during migration | Low | High | Reconcile counts and totals per table and per client after every ETL run |
| **Single-person knowledge** — one person holds the whole workflow | Medium | High | Document as you build; record the working session |
| **Privacy incident** during migration (copies of 27k people's personal data on laptops) | Medium | High | Encrypt working copies, minimise distribution, delete on completion |

---

## 31. Development Phases

| Phase | Content | Est. duration |
|---|---|---|
| **0 — Discovery close-out** | Answer §29 with the client. One observed working session. Sign off the status/type mapping table. Rotate the exposed mailbox password. | 1 week |
| **1 — Foundations** | Repo, CI, environments, Postgres schema, auth, roles, audit scaffolding, app shell + navigation. | 2 weeks |
| **2 — Core CRUD** | Clients, Agents, Cases. Field groups, pickers, defaults, package/rate/fee engine, status side effects. Per-module search and the four saved filters. | 3 weeks |
| **3 — Migration ETL v1** | Staging load, normalisation, date conversion, agent/client resolution, reconciliation report. Run against a copy; iterate. | 2 weeks (overlaps Phase 2) |
| **4 — Reports & PDF** | HTML/CSS templates for all five live reports, headless-Chromium rendering, in-browser preview, PDF storage against the case. Pixel sign-off. | 2 weeks |
| **5 — Email** | Provider integration, domain auth, report-to-client send, agent-instruction send, editable templates, send log. | 1 week |
| **6 — Admin & settings** | Packages/rates as data, status & type lists, report body templates, company details, user management. | 1 week |
| **7 — UAT & migration rehearsal** | Nicole works real cases in parallel with FileMaker for a week. Full migration rehearsal with reconciliation. Fix list. | 2 weeks |
| **8 — Cutover** | Final migration, freeze FileMaker read-only, go live, hypercare. | 1 week |

**Indicative total: 13–15 weeks**, assuming one full-stack developer and prompt client availability for Phase 0 and Phase 7. Phases 2–4 are the critical path.


---
---

# 32. BUILD SPECIFICATION FOR THE NEW WEB APPLICATION

> This section is written for the developer or AI coding agent who will build the system. It is self-contained. **Do not begin implementation until §29 Open Questions Q1, Q2, Q3 and Q5 are answered** — they change the pricing engine, the migration mapping and the report letterheads.

## 32.1 Product definition

A cloud-hosted Investigation & Case Management System for People Trackers Australia, replacing a FileMaker Pro desktop solution. Central object: the **Case**. Supporting entities: **Client**, **Agent**, **Package**, **Report Template**, **Generated Document**, **User**.

Non-negotiable outcomes: browser access from any device; the same day-to-day workflow the owner uses now; letterhead-faithful PDF reports; and the ability to email a report to a client directly from the case.

Scale: 2–5 users, ~27,000 existing cases, ~700 clients, ~35 agents, growth of roughly 200 cases/month.

## 32.2 Data model (PostgreSQL)

```
users              id, email(uniq), password_hash, name, role(admin|staff),
                   is_active, totp_secret, created_at, updated_at

clients            id, legacy_id(uniq), company, contact_name, kind,
                   phone, fax, email, email_invoice, email_reports,
                   addr1, addr2, city, state, postcode, country DEFAULT 'Australia',
                   postal_addr1, postal_addr2, postal_city, postal_state,
                   postal_postcode, postal_country,
                   attention, terms, abn, notes,
                   package_id NULL REFERENCES packages,
                   file_fee, locate_fee, non_locate_fee, hourly_fee,   -- see Q1
                   created_at, updated_at, created_by, updated_by

agents             id, legacy_id(uniq), name, company,
                   addr1, addr2, city, state, postcode, country,
                   phone, mobile, fax, email, notes, rate,
                   is_active, created_at, updated_at, created_by, updated_by
agent_skills       agent_id, skill(skip_tracing|process_serving|debt_collection)

packages           id, code(uniq), name, locate_rate, non_locate_rate,
                   is_active, sort_order
case_types         id, code(uniq), name, default_locate_rate,
                   default_non_locate_rate, is_active
case_statuses      id, code(uniq), name, is_open, sort_order,
                   zero_rates(bool), uses_non_locate_rate(bool)

cases              id,
                   reference        int UNIQUE NOT NULL,   -- the FileMaker ID
                   client_id        REFERENCES clients,
                   agent_id         NULL REFERENCES agents,
                   legacy_agent_name text,                 -- unresolved originals
                   client_ref, case_type_id, status_id,
                   legacy_status, legacy_type, legacy_package,   -- raw originals
                   package_id NULL,
                   rate_locate numeric(12,2), rate_non_locate numeric(12,2),
                   fee numeric(12,2), units numeric(10,2) DEFAULT 1,
                   amount numeric(12,2),
                   rates_overridden boolean DEFAULT false,
                   date_entered date NOT NULL,
                   date_due date, date_closed date, date_instruction_sent date,
                   report_sent boolean DEFAULT false, report_sent_at timestamptz,
                   invoiced boolean DEFAULT false,
                   -- subject (denormalised, matches source)
                   subject_title, subject_firstname, subject_middlename,
                   subject_lastname, subject_gender, subject_dob date,
                   subject_licence,
                   subject_ph_home, subject_ph_mobile, subject_ph_work,
                   subject_ph_other,
                   -- CONFIRMED / located address  (FileMaker "Subject Address*")
                   confirmed_addr1, confirmed_addr2, confirmed_city,
                   confirmed_state, confirmed_postcode, confirmed_country,
                   -- LAST KNOWN address           (FileMaker "Previous Address*")
                   last_known_addr1, last_known_addr2, last_known_city,
                   last_known_state, last_known_postcode, last_known_country,
                   -- employer
                   employer, employer_addr1, employer_addr2, employer_city,
                   employer_state, employer_postcode, employer_country,
                   employer_phone,
                   additional_info text, agent_notes text, report text,
                   search_vector tsvector,
                   created_at, updated_at, created_by, updated_by

report_templates   id, code(located|non_locate|leads_obtained|
                            process_service|field_call), name, body text,
                   updated_at, updated_by
email_templates    id, code(report_to_client|agent_instruction),
                   subject_template, body_template, updated_at, updated_by

generated_documents id, case_id, kind(case_report|update_report|
                                      agent_instruction|client_status|
                                      file_list_by_agent),
                    filename, storage_key, byte_size,
                    generated_at, generated_by

email_log          id, case_id NULL, document_id NULL, to_address, cc,
                    subject, body, provider_message_id,
                    status(queued|sent|bounced|failed),
                    sent_at, sent_by, error

audit_log          id, entity(case|client|agent|user|settings), entity_id,
                    action(create|update|delete), field, old_value, new_value,
                    changed_at, changed_by

settings           key(uniq), value jsonb    -- company details, letterhead,
                                             -- ABNs, sign-off, next reference
```

**Indexes:** `cases(reference)`, `cases(client_id)`, `cases(agent_id)`, `cases(status_id)`, `cases(date_entered)`, `cases(date_due)`, `cases(report_sent)`, `cases(invoiced)`, `cases(lower(subject_lastname))`, `cases(client_ref)`, GIN on `cases.search_vector`.

`search_vector` = weighted tsvector over subject names, `client_ref`, `reference`, confirmed + last-known address, `report`, `agent_notes`, `additional_info`.

**Deliberate schema decisions and why:**
- `reference` is `UNIQUE NOT NULL` for new records. Migration handles the 15 blanks and 15 duplicates explicitly (§32.9).
- `legacy_*` columns preserve the original uncontrolled strings forever. Never overwrite them.
- Subject stays denormalised — parity with the source, and matches how the business reasons about cases.
- `packages`, `case_types` and `case_statuses` are **tables, not enums**, so pricing and vocabulary are editable without deployment.
- `ON DELETE RESTRICT` for `cases.client_id` and `cases.agent_id`. Deletion of a client or agent that has cases must be refused — that is exactly the bug that produced 1,294 orphans.

## 32.3 Business rules to implement (transcribed from the source system)

**On case create:**
```
reference          = settings.next_reference++          (unique, not user-editable)
date_entered       = today
date_due           = date_entered + 14 days
case_type          = 'Skip Trace'
status             = 'New Instruction'
agent              = default agent from settings        (currently Nicole Gualtiera)
units              = 1
```

**Package resolution** (on create, and whenever client or type changes, unless `rates_overridden`):
```
if case_type == 'Skip Trace':
    package = client.package ?? package('Standard')
else:
    package = null
```

**Rate resolution** (same trigger conditions):
```
if package:
    rate_locate     = package.locate_rate
    rate_non_locate = package.non_locate_rate
else:
    rate_locate     = case_type.default_locate_rate
    rate_non_locate = case_type.default_non_locate_rate
```
Seed values reproducing today's behaviour exactly:

| Package | locate_rate | non_locate_rate |
|---|---:|---:|
| Basic | 7 | 7 |
| Flat | 100 | 100 |
| Standard | 150 | **50** |
| Premium | 400 | 400 |
| Custom | 0 | 0 |

| Case type | default_locate_rate | default_non_locate_rate |
|---|---:|---:|
| Skip Trace | (package-driven) | (package-driven) |
| Surveillance | 120 | 120 |
| Field Call | 50 | 50 |
| Process Serving | 50 | 50 |

*If Q1 is answered "yes", client-level `locate_fee` / `non_locate_fee` override the package rates here. Build the resolution as one function so this is a one-line change.*

**Fee resolution** (whenever status, rates or units change, unless `rates_overridden`):
```
if status.zero_rates:            fee = 0        # New Instruction, Withdrawn,
                                                # Credited/Disputed
elif status.uses_non_locate_rate: fee = rate_non_locate    # Non Locate
else:                             fee = rate_locate
amount = fee * units
```
Setting any of `rate_locate`, `rate_non_locate`, `fee` or `amount` by hand sets `rates_overridden = true` and stops automatic recalculation for that case. This is new, and it is what makes the 7,512 historically-inconsistent records safe to hold.

**Status change side effects:**
```
if new_status != 'New Instruction' and date_closed is null:
      date_closed = today          # set ONCE, not re-stamped  (parity-break, §25.3)
recompute fee and amount unless rates_overridden
write an audit_log row
```

**Report body button** (five of them):
```
if case.report is not empty:
      confirm "Replace existing report contents?"  -> abort on No
case.report = report_templates[code].body
```
No link is retained between the case and the template. Editing a template must not alter existing cases.

**Default report type** (pre-selection in the report dialog, reproducing the source logic):
```
status == 'New Instruction'  -> Agent Instruction
status == 'Leads Obtained'   -> Update Report
otherwise                    -> Case Report
list view                    -> Client Status Report
```

**Derived display values:** `subject_full_name` = firstname + middlename + lastname, collapsing double spaces. Compute in SQL/app; do not store.

## 32.4 Screens

| Route | Screen | Notes |
|---|---|---|
| `/login` | Login | Email + password, optional TOTP |
| `/` | Dashboard | Tiles: New Instruction, To Report, To Invoice, Overdue, Total open. Recent cases. Global search box. |
| `/cases` | Case list | Columns: Reference, Client, Client Ref., Title, Subject First/Middle/Last, Agent, Instruction Sent, Due, Status. Server-side sort and pagination. Filter chips: All / New Instruction / To Report / To Invoice / Overdue. Free-text search. |
| `/cases/new`, `/cases/:id` | Case detail | Sections in the source order: Header (reference, type, agent, client, client ref, dates, package, rates, fee, units, amount) · Status panel (status control, Report Sent, Invoiced, Date Closed) · Subject Details · Last Known Address · Employer · Agent Notes (+ Email Instruction) · Report panel (Confirmed Address, five template buttons, report editor). Client and agent links navigate to those records. |
| `/clients`, `/clients/:id` | Client list / detail | Both address blocks with a "copy physical → postal" action. Three email fields with inline help on which is used for report delivery. Fee fields. Tab or panel listing that client's cases. |
| `/agents`, `/agents/:id` | Agent list / detail | Contact, skills, notes. Panel listing that agent's open cases. |
| `/reports` | Report centre | Client Status Report and File List by Agent, with client / date-range / agent / status filters. |
| `/settings/*` | Admin | Packages & rates, statuses, case types, report body templates, email templates, company/letterhead details, users. |

**Interaction requirements carried over from FileMaker** (these are habits, and ignoring them will make the system feel worse than what it replaces):
- Prev/next record navigation on the case detail screen that walks the current filtered list.
- A persistent search box reachable with `/` or `Cmd/Ctrl+K`.
- Keyboard shortcuts: `n` new case, `Esc` back to list, `Cmd/Ctrl+S` save.
- The found-count indicator ("Showing 201 of 26,993").

## 32.5 Report generation

Render **HTML + CSS to PDF via headless Chromium (Playwright)**, A4 portrait, using CSS `@page` with repeating header and footer.

Five templates:

1. **Case Report** (`Print File Report`) — letterhead; PRIVATE AND CONFIDENTIAL; client address block; right column `{{status}}`, `{{date_closed}}`, `OUR REF: {{reference}}`, `YOUR REF: {{client_ref}}`; fixed intro paragraph; `AGENTS REPORT`; `RE: {{subject_full_name}}`; `{{report}}` (preserve line breaks); fixed sign-off.
2. **Update Report** (`Print File Update`) — as above but with the "preliminary searches have not yet resulted…" intro including the do-not-contact warning, headline `UPDATE REPORT`, `{{current_date}}`, and the "FURTHER SEARCHES AND ENQUIRIES WILL BE MADE…" outro.
3. **Agent Instruction** (`Print File Agent Instruction`) — `OUR REF {{reference}}`, `Date file due for completion {{date_due}}`, subject name/DOB/licence/phones, `Previous Address` = last-known address block, employer block, `Additional Info`. **Must not contain any client identifying information.**
4. **Client Status Report** — table: Date Entered, Client, Client Ref., Subject, Type, Date Closed, Our Ref. Sorted by Status then Date Entered.
5. **File List by Agent** — table: Reference, Client, Client Ref., Subject, Package, Agent, Status, Due. Sorted by Agent, Status, Date Entered.

Letterhead content, both ABNs, the sign-off block and the logo come from `settings` so they can be corrected without a deploy (see Q5 and Q6 — the two existing report layouts disagree on the sign-off).

Every generated PDF is written to object storage and recorded in `generated_documents` against the case. Preview in-browser before download or send.

**Acceptance test:** generate all three case reports for 20 real migrated cases and diff visually against PDFs produced by FileMaker for the same cases. Sign-off required before cutover.

## 32.6 Email

Two flows.

**Report to client** — from a case, choose a generated (or newly generated) report → recipient defaults to `client.email_reports`, falling back to `client.email`, editable → subject and body prefilled from `email_templates.report_to_client` with merge fields (`{{client_contact}}`, `{{subject_full_name}}`, `{{reference}}`, `{{client_ref}}`) → PDF attached → send → write `email_log` and optionally set `report_sent = true`.

**Agent instruction** — recipient defaults to `agent.email`; subject `Agent Instruction: {{reference}}` (**fixing the hard-coded "40093" in the current system**); body prefilled from the template with the subject's details; optionally attach the Agent Instruction PDF; on success set `date_instruction_sent = today`.

Both must show a confirmation step displaying recipient, subject and attachment before sending. Never send silently.

Use a transactional provider with a verified domain and SPF/DKIM/DMARC. Handle bounces into `email_log.status`.

## 32.7 Search

- **Global** (`Cmd/Ctrl+K`): matches case reference, client ref, subject name, client company, agent name. Grouped results.
- **Case search**: full-text over `search_vector` plus structured filters (client, agent, status, type, package, date-entered range, date-due range, report_sent, invoiced).
- **Client / Agent search**: name, company, email, phone.
- Saved filters equivalent to the four FileMaker buttons, plus Overdue.

## 32.8 Roles

| Capability | Admin | Staff |
|---|---|---|
| Cases: create, view, edit | ✔ | ✔ |
| Cases: delete | ✔ | ✖ |
| Clients / Agents: create, edit | ✔ | ✔ |
| Clients / Agents: delete | ✔ | ✖ |
| Generate reports, send email | ✔ | ✔ |
| Override rates/fees | ✔ | ✔ (audited) |
| Settings, packages, templates | ✔ | ✖ |
| User management | ✔ | ✖ |
| View audit log | ✔ | ✖ |

Enforce server-side on every endpoint.

## 32.9 Migration specification

**Source:** `iTrace Recovered 3.53.23 pm.fmp12`, exported as UTF-8 CSV per table, all fields from *Current Table* (container fields cannot be exported and contain nothing).

**Pipeline:** raw CSV → staging tables (all text) → transform → typed tables → reconciliation report.

**Order:** packages/types/statuses (seed) → clients → agents → cases.

**Field mapping — cases** (source → target): `ID`→`reference` · `ID Client`→`client_id` (via `clients.legacy_id`) · `Agent`→`agent_id` (resolved) + `legacy_agent_name` · `Type`→`case_type_id` + `legacy_type` · `Status`→`status_id` + `legacy_status` · `Package`→`package_id` + `legacy_package` · `Client Ref.`→`client_ref` · `Subject *`→`subject_*` · **`Subject Address*`→`confirmed_*`** · **`Previous *`→`last_known_*`** · `Employer *`→`employer_*` · `Date Entered/Due/Closed/Instruction Sent`→ matching date columns · `Status`,`Report`,`Agent Notes`,`Additional Info` → as named · `Rate 1`→`rate_locate` · `Rate 2`→`rate_non_locate` · `Fee`,`Units`,`Amount` → as named · `ID Reported = "Report Sent"`→`report_sent = true` · `ID Invoiced = "Invoiced"`→`invoiced = true`.

**Do not migrate:** `Gl Client`, `calc_Found`, `sum_Count`, `zcalc_*`, `Subject Full Name`, `Attachments`, `Employer Fax`, `Employer Country`, and the `Leads` / `Marketing` / `Templates` / `itrace_leads` / `itrace` tables.

**Transformation rules:**

*Reference numbers* — 15 blanks: assign from a reserved negative/high block and flag for review; do not invent plausible numbers. 15 duplicates: keep the first, suffix subsequent ones and flag. Set `settings.next_reference = 55982`.

*Type* — `Skip Trace` and `Skip Tracing` → `skip_trace`; `Process` and `Process Serving` → `process_serving`; `Field Call` → `field_call`; `Surveillance` → `surveillance`; blank → `skip_trace` + flag. **Confirm via Q2.**

*Status* — trim whitespace, then map. Confirmed list: `New Instruction`, `Leads Obtained`/`Leads obtained`, `Non Locate`, `Located`, `Completed`, `Withdrawn`, `Credited/Disputed`. **Requires a client decision (Q3)** for: `Withdrawn by Client` (674), `Closed` (272), `3rd Party Locate` (169), `Credited` (32), `Document served` (20), `Credited / client disputes` (16), `File with Process server` (10), `Process` (4), `Investigations ongoing` (3), and the remainder. Every original string is preserved in `legacy_status` regardless.

*Package* — map the five known codes; `$150+gst bonus` (90), `sarah1` (1), `StandPremiumard` (1) → NULL + flag; blank stays NULL.

*Dates* — accept `dd/mm/yyyy`; also accept `d.m.yyyy` / `dd.mm.yyyy` reading as **Australian day-first**; anything else → NULL + flag. Expect ~117 `Date Entered`, ~694 `Date Closed`, ~631 `Subject DOB` to take this path. Produce a reviewable CSV of every converted value before the final run (Q9).

*Clients* — 82 referenced IDs do not exist. Create placeholder clients `"Unknown client (legacy #NNNN)"` flagged `needs_review`, preserving the 1,294 cases (Q7). 93 cases have no client at all → attach to a single `"No client recorded (legacy)"` placeholder.

*Agents* — resolve by `TRIM(LOWER(name))`. 117 of 149 strings will not match: leave `agent_id` NULL, retain `legacy_agent_name`, and output the distinct unmatched list for manual mapping — many are simple case/whitespace variants and several are agent ID numbers.

*Money* — migrate `Rate 1`, `Rate 2`, `Fee`, `Units`, `Amount` **as stored**. Set `rates_overridden = true` on every migrated case so the engine never silently rewrites 27,000 historical figures. Flag the `100,300` outlier (Q13).

*Report text* — verbatim, preserving newlines.

**Reconciliation report (required output of every ETL run):**
- Row counts per table, source vs target.
- `SUM(amount)`, `SUM(fee)` source vs target.
- Case counts by status, by type, by client — source vs target.
- Counts of every flagged category: bad dates, unmatched agents, placeholder clients, duplicate/blank references, unmapped statuses/packages.
- A random sample of 25 cases rendered old vs new, field by field.

**Cutover:** freeze FileMaker read-only, final ETL, reconcile, sign off, go live. Retain the .fmp12 as the archive of record.

## 32.10 Definition of done for V1

- [ ] All 26,993 cases, 689 clients and 35 agents migrated, with a signed-off reconciliation report.
- [ ] Nicole can complete the full workflow (§13 steps 1–20) in the browser without touching FileMaker.
- [ ] All five reports generate as PDFs that have passed visual sign-off against FileMaker output on 20 real cases.
- [ ] A report can be emailed to a client with the PDF attached, and the send is logged on the case.
- [ ] An agent instruction can be emailed to an agent, and it stamps the instruction-sent date.
- [ ] The four legacy filters plus Overdue work and return counts consistent with FileMaker.
- [ ] Global search finds a case by reference, client ref, subject name, client and agent.
- [ ] Packages and rates are editable in Settings without a deploy.
- [ ] Every case, client and agent change is audited with user and timestamp.
- [ ] Two users can work concurrently without conflict.
- [ ] Automated daily encrypted backups, with a documented and *tested* restore.
- [ ] Hosted in an Australian region, TLS enforced, 2FA available.
- [ ] No invoicing, accounting integration, attachments, portal, Leads or Marketing has been built.

---

## Appendix A — Artefacts produced during this analysis

All in the project folder. **All contain personal information and should be deleted at project close.**

| File | Contents |
|---|---|
| `iTrace Recovered 3_53_23 pm_fmp12.xml` | Complete FileMaker Database Design Report (5.6 MB) — the authoritative schema record: every field, calculation, script step, layout object, value list, account and privilege set |
| `iTrace_DDR.xml` | DDR summary index |
| `export_files.csv` | All 26,993 case records, 63 fields |
| `export_clients.csv` | All 689 client records, 38 fields |
| `export_agents.csv` | All 35 agent records, 21 fields |

## Appendix B — Changes made to the client's environment

| Change | Reversible? |
|---|---|
| Enabled *Use advanced tools* in FileMaker Pro **application** preferences (required to generate the DDR) | Yes — FileMaker Pro ▸ Settings ▸ General ▸ untick |
| Quit and reopened the database file to apply that preference | n/a — file closed cleanly and reopened |
| Wrote the DDR XML and three CSV exports into the project folder | Yes — delete the files |

**No table, field, relationship, layout, script, value list, account or record in the database was created, modified or deleted.** All Manage dialogs were exited via Cancel. The only data-touching operations were exports, which are read-only.

---

*End of document.*
