# People Trackers Australia
## Investigation & Case Management System — V1 Build Specification

**Version:** 4.0 — FINAL
**Date:** 9 August 2026
**Evidence base:** `PeopleTrackers_ReverseEngineering_Spec.md` and the FileMaker Database Design Report (retained, not superseded)
**Status:** For approval. **No code is to be written until this document is approved.**

---

## 0. Guiding principle

> **Where a behaviour has not been explicitly changed by a client decision, reproduce the existing FileMaker system exactly.**

This is a faithful rebuild, not a redesign and not an enterprise system. Business logic, defaults, side effects, screen content, report wording and workflow carry across as-is.

Anything that is neither existing FileMaker behaviour nor an explicit client decision is **out of scope**. §2.6 lists everything removed from earlier drafts of this specification under that rule.

### 0.1 How to read this document

| Marker | Meaning |
|---|---|
| **[R]** | **Reproduce.** Verified behaviour of the existing FileMaker system. |
| **[D]** | **Decision.** An explicit client decision. See §2.1. |
| **[A]** | **Adaptation.** The existing mechanism cannot exist on the web as-is. Intent preserved, mechanism differs. See §2.4. |
| **[?]** | **Unknown.** See §21. |

---

## 1. Scope

### 1.1 In scope

Login · Main menu · Cases (list + detail) · Clients (list + detail) · Agents (list + detail) · One-off load of the existing client and agent records · Report body templates · All twelve existing report outputs as PDFs · Email from a case with an attached report · Search and the existing saved filters · Settings.

### 1.2 Out of scope

| Excluded | Reason |
|---|---|
| **Historical case records** | **[D3]** The Cases table starts empty. Clients and agents *are* loaded — §8 |
| **Field-level audit log, change history, audit viewer** | **[D10]** Not present in FileMaker, not a client requirement |
| **Client data cleanup — merging or deleting duplicates** | **[D11]** Not a V1 requirement |
| Invoicing, accounting / MYOB / Xero integration | Client confirmed not required |
| Document and photo attachments | Client confirmed future feature. The `Attachments` container in the old system is empty **[R]** |
| Client portal · Agent portal | Half-built and abandoned; never built **[R]** |
| Leads module (9,513 rows) · Marketing module | Vestigial framework modules **[R]** |
| POP3 mailbox harvesting · marketing email templates | Vestigial **[R]** |
| Global cross-module search | Does not exist today **[R]** |
| Dashboard tiles, analytics, charts | Do not exist today — the old main menu is five buttons **[R]** |
| Subjects entity | Does not exist today; subject data is flat on the case **[R]** |
| Case timeline, notifications, automation | Do not exist today |
| Self-service password reset | Not in the source; an Admin resets passwords (§2.6) |

### 1.3 Scale

Starting data: **689 clients, 35 agents, 0 cases.** 2–5 users. Roughly 200 new cases per month.

---

## 2. Decisions

### 2.1 Client decisions

| # | Decision | Effect |
|---|---|---|
| **D1** | **Pricing stays exactly as today.** Client-level `Locate Fee`, `Non Locate Fee`, `File Fee`, `Hourly Fee` do **not** drive pricing. | The rate engine is the existing hard-coded package/type table (§6.3). Client fee fields are captured and displayed as today, read by nothing. |
| **D2** | **Consolidate duplicate service names.** `Skip Trace` + `Skip Tracing` → **Skip Tracing**. `Process` + `Process Serving` → **Process Serving**. | Four case types. The package rule keys on Skip Tracing (§6.2). |
| **D3** | **No historical case migration.** | The Cases table starts fresh. No case ETL, staging, reconciliation, legacy columns, date conversion, orphan handling, rehearsal or cutover. |
| **D4** | **Seven statuses only.** | New Instruction · Leads Obtained · Non Locate · Located · Completed · Withdrawn · Credited/Disputed. Enforced. Fee logic keys on these (§6.4). |
| **D5** | **Confirmed business and branding details** (§2.2). No iTrace branding, ABN, email or website. **No other legal/ABN details to be invented or substituted.** | One letterhead across all reports, from Settings, pre-populated with the confirmed values. |
| **D6** | **Direct email is required in V1.** Provider/domain configuration must not block scope. | Compose → edit recipient → edit subject/body → attach PDF → confirm → send → record. Provider, domain and credentials are a **deployment configuration item** (§14.3). |
| **D7** | **Existing clients carried across.** | One-off load of all 689 client records (§8). |
| **D8** | **Existing agents carried across.** | One-off load of all 35 agent records (§8). |
| **D9** | **Case reference sequence starts at 55982.** | First new case `55982`, incrementing by one (§6.1). |
| **D10** | **No expanded audit system.** Keep the existing created/modified account and timestamp behaviour only. | The `audit_log` table, change-history capture, the Admin audit viewer and the audit permission are **removed** (§16). |
| **D11** | **Load all 689 clients as-is.** Do not merge, delete, consolidate or modify duplicate or blank records as part of the build. | The load performs no de-duplication. `needs_review` remains purely as an informational filter (§8.5). |
| **D12** | **The agent instruction email does not attach a PDF**, reproducing the existing behaviour. | Details go in the editable body text only (§14.2). |
| **D13** | **`Mobile` and `Rate` stay in the database but are not displayed** on the agent screen, reproducing the existing layout. | §9.8. |
| **D14** | **Envelope page size is not a blocker.** Reproduce the existing envelope output as closely as reasonable and verify during report testing. | §13.3. |

### 2.2 Confirmed business details **[D5]**

Seeded into Settings and used on every report and outbound email.

| Field | Confirmed value |
|---|---|
| Legal / company name | **SKIP TRACING AND LOCATIONS AUSTRALIA PTY LTD** |
| Trading as | **People Trackers Australia** |
| ABN | **52 675822349** |
| Email | **admin@peopletrackers.com.au** |
| Website | **www.peopletrackers.com.au** |
| Additional website | **https://skiptracingserviceaustralia.com/** |

This set matches the header block already used on the existing Case Report layout **[R]**, so the primary client report is unchanged in appearance.

**Consequence.** The existing Agent Instruction and Update Report *footers* additionally print `ACN: 623713593` and `ABN: 97 623 713593`. Neither is in the confirmed set, so per **D5** they will **not** be printed and will **not** be substituted. Settings fields for ACN and a secondary ABN exist but are left empty. See §21.

Other footer content — the postal address `P O Box 86, Canterbury Victoria 3126 Australia`, `Contact Number: 1800053299`, and *"For security purposes our office address is made known by appointment only."* — is carried across from the current People Trackers footer **[R]** and pre-populated in Settings.

**Not to be used anywhere:** iTrace Australia Pty Ltd · the iTrace ABN · `nicole@itrace.com.au` · `itrace.com.au` · `smtp.optusnet.com.au` · `pop.briefcase.net.au`.

### 2.3 Defects corrected

| Defect in the existing system | Correction |
|---|---|
| Agent-instruction email subject hard-codes `"iTrace Agent Instruction : 40093"` — the same fixed reference on every email **[R]** | Use the case's own reference, with People Trackers wording |
| The batch report layout signs off "Nicole Gualtiera / iTrace Australia Pty Ltd" and labels the reference "ITRACE Ref" **[R]** | Per **D5**, one branding. The batch output is the standard Case Report |
| Template field misspelled `Leads Obtianed` in the schema **[R]** | Code `leads_obtained`, label "Leads Obtained". The button label was already correct |
| `Skip Trace` / `Skip Tracing` and `Process` / `Process Serving` duplicates **[R]** | Per **D2** |

### 2.4 Adaptations

Kept to the minimum required to run on the web.

| Existing mechanism | V1 equivalent |
|---|---|
| Print scripts end in FileMaker **Preview mode**; user then clicks Print or Save as PDF | Server-rendered PDF in a browser preview, with Download and Print |
| `Batch PDF` writes one file per case to the **Mac Desktop** | Same PDFs, same filename pattern, delivered as one ZIP download |
| Agent stored as a **text string** matched to `Agents::Name` | Foreign key to the agent record. Same user-facing behaviour — pick an agent from the list |
| Deleting a client or agent silently orphaned its cases (no cascade rules) | `ON DELETE RESTRICT`. A required foreign key cannot permit orphans. Deleting a client or agent that has cases is refused with a clear message |
| The case reference was editable and not unique-checked | Still editable, but `UNIQUE` at database level. A colliding edit is rejected with a clear message |
| `24U SimpleDialog` plug-in modals (report chooser, email composer) | Native web modals with the same fields, options and defaults |
| `MBS("FM.RunScript")` dispatch | Direct function call |
| Value lists (advisory in FileMaker — which is how 22 statuses and two spellings of Skip Trace arose) | Enforced reference tables |
| Unauthenticated SMTP on port 25 | Transactional provider, configured at deployment **[D6]** |

### 2.5 Behaviours deliberately **not** "improved"

| Behaviour | Note |
|---|---|
| `Date Closed` is set to **today every time** the status is anything other than New Instruction — including on a later correction, which re-stamps it **[R]** | Reproduce as-is |
| Auto-calculated `Package`, `Rate 1`, `Rate 2`, `Fee`, `Amount` use *replace existing value* — a manual edit is overwritten the next time a trigger field changes **[R]** | Reproduce as-is |
| Client fee fields are captured but unused **[R]** / **[D1]** | Reproduce as-is |
| `Report Sent` and `Invoiced` are flags **independent** of status, ticked by hand **[R]** | Reproduce as-is |
| No agent-skill filtering — the picker offers every agent regardless of case type **[R]** | Reproduce as-is |
| Subject data is denormalised onto the case; repeat subjects are not linked **[R]** | Reproduce as-is |
| No explicit "close case" action; `Completed` is just another status **[R]** | Reproduce as-is |
| `Mobile` and `Rate` exist on agents but are not shown **[R]** / **[D13]** | Reproduce as-is |

### 2.6 Additions removed in this revision

A full review of the specification against §0 was carried out. Everything below was present in an earlier draft as an "improvement" and has been removed or downgraded.

| Removed / downgraded | Was | Now |
|---|---|---|
| **Audit log table, change capture, Admin audit viewer, audit permission** | A field-level history system | **Removed** **[D10]**. Only created/modified stamps remain (§16) |
| **Client de-duplication and cleanup workflow** | A required Phase 7 activity | **Removed** **[D11]**. `needs_review` is an informational filter only |
| **PDF attached to the agent instruction email** | Optional attachment | **Removed** **[D12]** |
| **`Mobile` and `Rate` on the agent screen** | Open question | **Removed** **[D13]**. Fields exist, not displayed |
| **Envelope page size** | Blocking open question | **Downgraded** **[D14]** to a report-testing item |
| **Data retention policy** | An open question and a requirement | **Removed.** The source has no retention rule; imposing one is not in scope. Noted once in §17 as a business consideration, not a build item |
| **Storing every generated PDF** | All previews and downloads archived | **Downgraded.** Only PDFs that are actually emailed are stored, because **D6** requires the email action to be recorded (§13.5) |
| **Offering to tick `Report Sent` after emailing** | Automatic prompt | **Removed.** The user ticks the checkbox, as today |
| **Email template management module** | A CRUD screen for email templates | **Downgraded** to two editable text blocks in Settings (§14.3) |
| **Enforced two-factor authentication for Admin** | Mandatory | **Downgraded** to optional/available (§17) |
| **Self-service password reset** | A login feature | **Removed.** Admin resets passwords, matching the source's model |
| **`is_active` flag on agents** | Soft-delete for agents | **Removed.** No such concept in the source |
| **Blocking send on an invalid recipient** | Hard gate | **Downgraded** to basic validation with a warning (§14.1) |
| **Formal load reconciliation framework** | Migration-style verification | **Downgraded** to a short load checklist (§8.7) |
| Overdue filter · global search · dashboard tiles · Subjects entity · case timeline | Various | Removed in an earlier revision; confirmed still absent |

---

## 3. Existing system — what is being reproduced

A single-file FileMaker Pro solution, itself a customisation of a generic CRM framework ("Briefcase" by Tahn Software Pty Ltd). Of its ten tables, **three carry the business**: cases, clients and agents. A fourth holds five boilerplate report bodies. The rest are framework leftovers and are excluded. **[R]**

The workflow: a client sends an instruction → a case is created and auto-numbered → subject details and last known address are captured → an agent may be assigned and instructed → enquiries are conducted → findings are written into a free-text report seeded from a boilerplate → a status records the outcome → a letterhead PDF is produced → it is sent to the client → flags record that it was reported and invoiced. **[R]**

---

## 4. Domain model

```
User            login account (Admin | Staff)
Client          the instructing organisation
Agent           external field agent / process server / investigator
Case            the central object — instruction, subject, investigation, report, billing line
Package         pricing package (reference data)
CaseType        service type (reference data)
CaseStatus      workflow status (reference data)
ReportTemplate  one of five boilerplate report bodies
GeneratedDocument  a PDF that was emailed
EmailLog        a record of every message sent  [D6]
Setting         company/letterhead details, email configuration, defaults, email body text
```

There is deliberately **no Subject entity** — subject data lives on the case, as it does today. **[R]**

**Relationships**

- `Case → Client` — many-to-one, **required**, `ON DELETE RESTRICT`.
- `Case → Agent` — many-to-one, **optional** (42% of cases have no agent today **[R]**), `ON DELETE RESTRICT`.
- `Case → CaseType`, `Case → CaseStatus` — required. `Case → Package` — optional.
- `Client → Package` — optional. The only client field that influences pricing. **[R]**
- `Agent → Skills` — many-to-many over a fixed three-value list. **[R]**

Client and agent data is **referenced live, never copied onto the case** — exactly as the old system resolved it through relationships at display and print time. **[R]**

---

## 5. Database schema (PostgreSQL)

```sql
users              id, email UNIQUE, password_hash, name,
                   role ('admin'|'staff'), is_active, totp_secret NULL,
                   created_at, updated_at

packages           id, code UNIQUE, name, locate_rate numeric(12,2),
                   non_locate_rate numeric(12,2), sort_order
case_types         id, code UNIQUE, name, locate_rate numeric(12,2) NULL,
                   non_locate_rate numeric(12,2) NULL,
                   uses_package boolean, sort_order
case_statuses      id, code UNIQUE, name, sort_order,
                   fee_rule ('zero'|'non_locate_rate'|'locate_rate')

clients            id,
                   reference          int UNIQUE NOT NULL,   -- the client ID
                   company, contact_name, kind,
                   phone, fax, email, email_invoice, email_reports,
                   addr1, addr2, city, state, postcode,
                   country DEFAULT 'Australia',
                   postal_addr1, postal_addr2, postal_city, postal_state,
                   postal_postcode, postal_country,
                   attention, terms, abn, notes,
                   package_id NULL REFERENCES packages,
                   file_fee, locate_fee, non_locate_fee, hourly_fee, -- captured, unused (D1)
                   needs_review boolean DEFAULT false,               -- informational only (D11)
                   created_at, created_by, updated_at, updated_by

agents             id,
                   reference          int UNIQUE NOT NULL,   -- the agent ID
                   name, company,
                   addr1, addr2, city, state, postcode, country,
                   phone, mobile, fax, email, notes, rate numeric(12,2),
                                                    -- mobile & rate stored, not displayed (D13)
                   needs_review boolean DEFAULT false,
                   created_at, created_by, updated_at, updated_by
agent_skills       agent_id, skill ('skip_tracing'|'process_serving'|'debt_collection')

cases              id,
                   reference          int UNIQUE NOT NULL,   -- OUR REF, starts at 55982
                   client_id          NOT NULL REFERENCES clients,
                   agent_id           NULL REFERENCES agents,
                   case_type_id       NOT NULL REFERENCES case_types,
                   status_id          NOT NULL REFERENCES case_statuses,
                   package_id         NULL REFERENCES packages,
                   client_ref         text,
                   rate_locate numeric(12,2), rate_non_locate numeric(12,2),
                   fee numeric(12,2), units numeric(10,2) DEFAULT 1,
                   amount numeric(12,2),
                   date_entered date NOT NULL, date_due date,
                   date_closed date, date_instruction_sent date,
                   report_sent boolean DEFAULT false,
                   invoiced boolean DEFAULT false,
                   subject_title, subject_firstname, subject_middlename,
                   subject_lastname, subject_gender, subject_dob date,
                   subject_licence,
                   subject_ph_home, subject_ph_mobile,
                   subject_ph_work, subject_ph_other,
                   -- CONFIRMED address (the address the investigation found)
                   confirmed_addr1, confirmed_addr2, confirmed_city,
                   confirmed_state, confirmed_postcode, confirmed_country,
                   -- LAST KNOWN address (supplied by the client)
                   last_known_addr1, last_known_addr2, last_known_city,
                   last_known_state, last_known_postcode, last_known_country,
                   employer, employer_addr1, employer_addr2, employer_city,
                   employer_state, employer_postcode, employer_country,
                   employer_phone, employer_fax,
                   additional_info text, agent_notes text, report text,
                   search_vector tsvector,
                   created_at, created_by, updated_at, updated_by

report_templates   id, code UNIQUE, name, body text, updated_at, updated_by
generated_documents id, case_id, kind, filename, storage_key,
                    generated_at, generated_by          -- emailed PDFs only (§13.5)
email_log          id, case_id NULL, document_id NULL, to_address,
                    subject, body, provider_message_id,
                    status ('queued'|'sent'|'bounced'|'failed'),
                    sent_at, sent_by, error             -- required by D6
settings           key UNIQUE, value jsonb
```

There is **no `audit_log` table** **[D10]**.

**Naming note.** The old field names `Subject Address*` and `Previous Address*` are misleading: `Subject Address*` holds the address the investigation **confirmed**, and `Previous Address*` holds the **last known** address given by the client. Confirmed by the on-screen labels ("Confirmed Address" inside the Report panel; "Last Known Address") and by the Agent Instruction printout. **[R]** The schema uses `confirmed_*` and `last_known_*` so the meaning cannot be misread. **Screen labels stay exactly as they are today.**

**Indexes:** `cases(reference)`, `cases(client_id)`, `cases(agent_id)`, `cases(status_id)`, `cases(date_entered)`, `cases(date_due)`, `cases(report_sent)`, `cases(invoiced)`, `cases(client_ref)`, `cases(lower(subject_lastname))`, GIN on `cases.search_vector`; `clients(lower(company))`, `agents(lower(name))`.

**Fields deliberately not carried across** — UI helpers and dead fields with no behaviour attached: `Gl Client` (global, never populated), `calc_Found` (record-counter string), `sum_Count` (summary), `zcalc_Subject Address` / `zcalc_Previous Address` / `zcalc_Employer Address` / `zcalc_Address` (concatenations — computed on demand), `Subject Full Name` (computed on demand), `zcalc_Rate` and `zcalc_Date` (on no layout, used by no script), and `Clients::Account Name` / `Account Password` (plaintext client-portal credentials; the portal is out of scope). `Clients::Referrer` is empty on all 689 records **[R]**; it is retained on the schema and screen for parity but nothing depends on it.

`zcalc_Report` **is** displayed on the case screen and is reproduced as a derived label (§6.6). **[R]**


---

## 6. Business rules

Transcribed from the source system's field definitions and scripts.

### 6.1 Case defaults on create **[R]** / **[D9]**

```
reference             = next value in the case reference sequence   -- starts at 55982
date_entered          = today
date_due              = date_entered + 14 days
case_type             = 'Skip Tracing'                  (D2 — the source constant was 'Skip Trace')
status                = 'New Instruction'
agent                 = settings.default_agent_id       (the source hard-codes one agent)
units                 = 1
report_sent           = false
invoiced              = false
```

**Case reference sequence: first value `55982`, increment 1.** **[D9]** The old system reached 55,981, so new references continue on from historical correspondence without colliding with any reference already quoted to a client.

The reference is generated on create and remains **editable by the user**, reproducing the source. **[R]** It is `UNIQUE` at database level; a colliding edit is rejected with a clear message. **[A]**

### 6.2 Package resolution **[R]** / **[D2]**

On create, and whenever `client_id` or `case_type_id` changes. Overwrites any existing value.

```
if case_type.uses_package:            -- true only for Skip Tracing
    package = client.package ?? package('Standard')
else:
    package = null
```

Source formula: `Case ( Type = "Skip Trace" ; If ( IsEmpty ( client::Package ) ; "Standard" ; client::Package ) ; "" )`. The literal becomes `Skip Tracing` per **D2**, expressed as the `uses_package` flag.

Only 2 of the 689 loaded clients carry a package (both `Standard`) **[R]**, so in practice this resolves to `Standard` for almost every skip-tracing case — exactly as today.

### 6.3 Rate resolution **[R]** / **[D1]**

Whenever `package_id` or `case_type_id` changes. Overwrites any existing value.

```
if package is not null:
    rate_locate     = package.locate_rate
    rate_non_locate = package.non_locate_rate
else:
    rate_locate     = case_type.locate_rate
    rate_non_locate = case_type.non_locate_rate
```

**packages** seed

| code | name | locate_rate | non_locate_rate |
|---|---|---:|---:|
| `basic` | Basic | 7 | 7 |
| `flat` | Flat | 100 | 100 |
| `standard` | Standard | **150** | **50** |
| `premium` | Premium | 400 | 400 |
| `custom` | Custom | 0 | 0 |

**case_types** seed

| code | name | uses_package | locate_rate | non_locate_rate |
|---|---|---|---:|---:|
| `skip_tracing` | Skip Tracing | **true** | — (from package) | — (from package) |
| `process_serving` | Process Serving | false | 50 | 50 |
| `field_call` | Field Call | false | 50 | 50 |
| `surveillance` | Surveillance | false | 120 | 120 |

If neither applies the rate is `0`, reproducing the source's trailing `; 0` fallback. **[R]**

Per **D1**, `clients.locate_fee`, `non_locate_fee`, `file_fee` and `hourly_fee` are **not** consulted.

### 6.4 Fee and amount **[R]** / **[D4]**

Whenever `status_id`, `rate_locate`, `rate_non_locate` or `units` changes. Overwrites any existing value.

```
fee    = { 0                 if status.fee_rule = 'zero'
         { rate_non_locate   if status.fee_rule = 'non_locate_rate'
         { rate_locate       otherwise
amount = fee * units
```

**case_statuses** seed, reproducing `Case ( Status = "New Instruction" ; 0 ; Status = "Non Locate" ; Rate 2 ; Status = "Withdrawn" ; 0 ; Status = "Credited/Disputed" ; 0 ; Rate 1 )`:

| # | code | name | fee_rule |
|---|---|---|---|
| 1 | `new_instruction` | New Instruction | `zero` |
| 2 | `leads_obtained` | Leads Obtained | `locate_rate` |
| 3 | `non_locate` | Non Locate | `non_locate_rate` |
| 4 | `located` | Located | `locate_rate` |
| 5 | `completed` | Completed | `locate_rate` |
| 6 | `withdrawn` | Withdrawn | `zero` |
| 7 | `credited_disputed` | Credited/Disputed | `zero` |

Sort order is the order above — the value-list order used by the status column sort. **[R]**

`rate_locate`, `rate_non_locate`, `fee`, `units` and `amount` are editable on the case screen, as today. A manual edit **will be overwritten** the next time a trigger field changes — the source's *replace existing value* behaviour, reproduced deliberately. **[R]**

### 6.5 Status change side effects **[R]**

```
on status change:
    if new_status is not 'New Instruction':
        date_closed = today          -- re-stamped on EVERY such change (§2.5)
    recompute fee, amount
```

Any status may be selected from any other. No state machine, no restricted transitions, no validation. **[R]**

### 6.6 Derived display values **[R]**

| Value | Rule | Where shown |
|---|---|---|
| Subject full name | `firstname + " " + middlename + " " + lastname`, double spaces collapsed | Case screen, all case reports, lists |
| Report status label | `report_sent ? "Reported " + <timestamp> : "Report"` | Case screen (source: `zcalc_Report`) |
| Found count | `"Showing n of N"` | List screens (source: `calc_Found`) |
| Address blocks | Concatenation of address lines, city, state, postcode, country | Reports, lists |

### 6.7 Report body buttons **[R]**

```
if case.report is not empty:
    confirm "Replace existing contents?"   -- Yes / No; No aborts
case.report = report_templates[code].body
```

The body is **copied, not linked**. Editing a template must not alter any existing case. No merge-field substitution inside the bodies — plain text with literal `XXXXXX` placeholders the user overtypes. **[R]**

### 6.8 Client defaults **[R]**

| Field | Rule |
|---|---|
| `country` | Defaults to `Australia` |
| `postal_*` | On create, each postal field defaults to a copy of the matching physical field; independently editable afterwards |
| `non_locate_fee` | On create, defaults to a copy of `locate_fee` |
| `reference` | Auto-assigned; continues from the loaded maximum — first new value **2716** (§8.6) |

### 6.9 Agent defaults **[R]**

`reference` auto-assigned; continues from the loaded maximum — first new value **1159** (§8.6). No other defaults exist in the source.

---

## 7. Reference data

**Value lists reproduced from the source** **[R]**

| List | Values |
|---|---|
| Case status | New Instruction · Leads Obtained · Non Locate · Located · Completed · Withdrawn · Credited/Disputed **[D4]** |
| Case type | Skip Tracing · Process Serving · Field Call · Surveillance **[D2]** |
| Package | Basic · Flat · Standard · Premium · Custom |
| Subject title | Mr. · Mrs. · Ms. · Miss. · Dr. |
| Subject gender | Male · Female |
| State | Victoria · Australian Capital Territory · New South Wales · Northern Territory · Queensland · South Australia · Tasmania · Western Australia |
| Country | Australia *(default)* |
| Client kind | Lawyers · Collections · Private · Investigators · Finance · Professional · Process Servers |
| Agent skills | Skip Tracing · Process Serving · Debt Collection |

**Country is not restricted to Australia for clients and agents.** The existing client data contains two United Kingdom records and one in Denmark **[R]**, so the field defaults to Australia but accepts any value. Where `country` is not Australia, `state` is free text rather than a picker.

Packages, case types and case statuses are stored as data (a relational database requires it) but are **read-only in V1** — the existing system does not allow rates or statuses to change without a developer, and making them editable is not a requested feature. A read-only Settings view displays them.

---

## 8. Initial data load — clients and agents **[D7]** / **[D8]**

A **one-off load** run once before go-live. Not the historical case ETL, which is excluded by **D3**. No staging tables, no reconciliation framework, no rehearsal cycle — 724 records across two flat tables.

**No de-duplication, merging, deletion or correction of client or agent records takes place. [D11]**

### 8.1 Source

Read-only CSV exports already taken from the live FileMaker file:

| Source | Records | Target |
|---|---:|---|
| `export_clients.csv` (38 columns) | 689 | `clients` |
| `export_agents.csv` (21 columns) | 35 | `agents` |

### 8.2 Client field mapping **[R]**

`ID`→`reference` · `Company`→`company` · `Name`→`contact_name` · `Kind`→`kind` · `Phone`→`phone` · `Fax`→`fax` · `Email`→`email` · `Email Invoice`→`email_invoice` · `Email Reports`→`email_reports` · `Address 1/2`, `City`, `State`, `Postcode`, `Country`→`addr1/addr2/city/state/postcode/country` · `Postal Address 1/2`, `Postal City/State/Postcode/Country`→`postal_*` · `Attention`→`attention` · `Terms`→`terms` · `ABN`→`abn` · `Notes`→`notes` · `Package`→`package_id` · `File Fee`/`Locate Fee`/`Non Locate Fee`/`Hourly Fee`→ matching columns · `Date Entered`→`created_at` · `Modified Time`→`updated_at` · `Modified Account`→`updated_by`.

**Not loaded:** `Account Name`, `Account Password` (client-portal credentials, portal out of scope) · `zcalc_Address`, `calc_Found` (computed) · `Referrer` (empty on all 689 records).

### 8.3 Agent field mapping **[R]**

`ID`→`reference` · `Name`→`name` · `Company`→`company` · address block → `addr1/addr2/city/state/postcode/country` · `Phone`, `Mobile`, `Fax`, `Email`, `Notes`, `Rate` → matching columns *(`Mobile` and `Rate` are loaded but not displayed — **D13**)* · `Skills`→`agent_skills` rows · `Date Entered`→`created_at` · `Modified Time`/`Modified Account`→`updated_at`/`updated_by`.

**Not loaded:** `zcalc_Address`, `calc_Found` (computed).

### 8.4 Transformations

Defined from the actual exported data. These are format fixes required to land the data in typed columns — they are not data cleanup, which is excluded by **D11**.

| Rule | Detail |
|---|---|
| **Whitespace** | Trim leading/trailing whitespace. The export contains embedded vertical-tab characters (FileMaker's representation of in-field carriage returns) on ~30 email values — strip from single-line fields, preserve as newlines in `notes`. |
| **State normalisation** | Map abbreviations to the value-list form: `Vic`→Victoria (76) · `NSW`/`nsw`→New South Wales (53) · `Qld`→Queensland (26) · `SA`→South Australia (5) · `WA`→Western Australia (9) · `ACT`→Australian Capital Territory (2). Full names pass through. Where `country` ≠ Australia, leave as-is. |
| **Country** | Loaded as-is: 682 Australia, 2 United Kingdom, 1 Denmark. |
| **Package** | `Standard` (2 clients) maps to the `standard` package. `"$150+gst bonus "` (1 client) is not a valid package — `package_id = NULL`, flag `needs_review`. A null package means skip-tracing cases default to `Standard`, which is what happens for that client today: the value never matched the source `Case()` statement, so it always fell through to `Standard`. |
| **Kind** | All 282 populated values already match the value list. Blank stays blank. |
| **Email fields** | Loaded verbatim after trimming, **including values that are not valid addresses** — 35 in `email`, 30 in `email_invoice`, 1 in `email_reports`. These include display-name format, two addresses in one field, the literal text `BY POST OR FAX`, and one record with a pasted message body in `email_invoice`. Flagged `needs_review`. Not corrected **[D11]**. |
| **Agent skills** | The exported `Skills` value is newline-separated, so `"Skip Tracing⏎Process Serving"` is **two checked skills, not corrupt data**. Split into `agent_skills` rows: 3 skip tracing only, 8 process serving only, 1 with both. |
| **Dates** | `Date Entered` is valid `dd/mm/yyyy` on **all 689 clients and all 35 agents** — no conversion issues in these two tables. |
| **Postal block** | Loaded independently; 204 clients have a postal address differing from the physical one, so it must not be derived. |
| **Terms** | Free text in the source (`30 DAYS` ×155, `14` ×14, `30 days` ×4, `COD`, and one containing `process serving $120 Victoria`). Loaded verbatim — display-only, drives nothing. |

### 8.5 Records flagged `needs_review`

Loaded as-is. The flag is **informational only** — it drives a list filter so Nicole can look at these records if and when she wants. **No cleanup is required for V1 and none is scheduled. [D11]**

| Finding | Count |
|---|---:|
| Clients with a blank company and blank contact name | 4 |
| Clients that are essentially empty (references 2557, 2715) | 2 |
| Clients sharing a company name — NAB ×3, Premier Detectives ×3, plus 9 pairs | 24 records |
| Client with the invalid package `"$150+gst bonus "` | 1 |
| Clients whose email fields are not a single valid address | 35 / 30 / 1 |
| Agents with a blank name (references 1145, 1152) | 2 |

### 8.6 Sequences after load

| Sequence | Loaded range | Next value |
|---|---|---:|
| Client reference | 1660 – 2715 | **2716** |
| Agent reference | 1123 – 1158 | **1159** |
| Case reference | — (no cases loaded) | **55982** **[D9]** |

### 8.7 Load checklist

Short and practical, not a reconciliation framework:

- 689 clients and 35 agents in, same number out.
- Every `reference` unique and non-null; ranges as in §8.6.
- Spot-check 20 clients and 5 agents field-by-field against FileMaker.

### 8.8 Re-runnability

The load must be idempotent, keyed on `reference`, so it can be re-run against a fresh development database. The production run happens once, immediately before go-live.


---

## 9. Screens

Layout, field grouping, labels and button placement follow the existing screens. **[R]**

### 9.1 Login

Email and password. Optional TOTP. **Password resets are performed by an Admin**, matching the source's model — there is no self-service reset. **[R]**

### 9.2 Main menu

Reproduces the existing main menu — module buttons and nothing else. **[R]**

**Buttons:** Files · Clients · Agents · Settings *(Admin only)*

The existing menu also shows Leads and Marketing; both are out of scope. There are **no dashboard tiles, counts, charts or activity panels** — the existing main menu has none.

### 9.3 Files (case) list

Reproduces `Files List`. **[R]**

**Columns, in source order:** File *(reference)* · Client *(company)* · Client Ref. · Title · Subject First · Subject Middle · Subject Last · Agent · Instruction Sent · Due · Status

**Sortable headers:** Client, File, Due, Status. Status sorts by the list order in §6.4, not alphabetically. **[R]**

**Filter bar:** All · New Instruction · To Report · To Invoice (§12.2). **[R]**

**Action bar:** Main Menu · Files · Agents · Clients · `<` · `>` · View · Find · New · Delete · Print · **Batch PDF** **[R]**

`Print` runs the File List by Agent report. `View` or a row click opens the case. Server-side pagination and sorting; the found count shows "Showing n of N". **[A]**

### 9.4 Files (case) detail

Reproduces the `Files` layout, section by section, in the same order. **[R]**

**Header block** — File *(reference)* · Type · Agent *(picker; the "Agent" label links to that agent)* · Client *(picker; the "Client" label links to that client)* · Client Ref. · Date Entered · Date Due · Package · Rates *(Rate 1, Rate 2)* · Fee · Units · Inv. Amount

**Status panel** — status selector (seven values) · `Report Sent` checkbox · `Invoiced` checkbox · Date Closed · a large badge showing the current status

**Subject Details** — Title · First Name · Middle · Last Name · DOB · Gender · Home Phone · Mobile Phone · Work Phone · Other Phone · Drivers License · Additional Info

**Last Known Address** — Address 1 · Address 2 · City · State · Postcode · Country *(stored as `last_known_*`)*

**Employer** — Company · Address 1 · Address 2 · City · State · Postcode · Country · Phone · Fax

**Agent Notes** — free text, with an **Email Instruction** button

**Report panel** — "Confirmed Address" (Address 1 · Address 2 · City · State · Postcode · Country, stored as `confirmed_*`) · five template buttons **Located · Not Located · Leads Obtained · Process Service · Field Call** · the `Report` text area (plain text, line breaks preserved) · **Edit Templates** button

**Action bar:** Main Menu · Files · Agents · Clients · `<` · `>` · View · Find · New · Delete · Print

`Print` opens the report chooser (§13.4). `<` and `>` step through the current filtered set. **[R]**

### 9.5 Clients list

Reproduces `Clients List`. Columns: Company · Name · Kind · Address · Phone · Email. Sortable by Company. Same action bar. Adds a **Needs review** filter surfacing the records flagged at load — informational only. **[D11]**

### 9.6 Client detail

Reproduces the `Clients` layout, including the two-column address arrangement. **[R]**

ID Client *(reference)* · Company · Kind · Name · Email
**Physical address:** Address 1 · Address 2 · City · State · Postcode · Country
**Postal address:** Address 1 · Address 2 · City · State · Postcode · Country
Phone · Fax · Notes · Attention · Email Invoice · Email Reports · Terms · ABN
Package · Hourly Fee · File Fee · Locate Fee · Non Locate Fee

Fee fields are captured and displayed exactly as today and drive nothing (**D1**). Inline help on `Email Reports` should note that it is the default recipient for emailed reports (§14.1).

`Account Name` / `Account Password` are **not** reproduced — they serve only the out-of-scope client portal.

A panel listing that client's cases is not part of the existing screen and is not included.

### 9.7 Agents list

Reproduces `Agents List`. Columns: Name · Company · Address · Phone · Fax · Email. Same action bar, plus the **Needs review** filter.

### 9.8 Agent detail

Reproduces the `Agents` layout exactly: ID Agent *(reference)* · Company · Name · Email · Address 1 · Address 2 · City · State · Postcode · Country · Phone · Fax · Notes · Skills *(three checkboxes)*.

**`Mobile` and `Rate` are stored in the database and loaded, but are not displayed** — reproducing the existing layout, which omits both. **[D13]**

### 9.9 Report template editor

Reproduces `TemplatesEdit`: five text areas labelled Located · Non Locate · Leads Obtained · Process Service · Field Call, with save. Reached from **Edit Templates** on the case screen. **[R]**

### 9.10 Settings *(Admin only)*

- **Company / letterhead** — pre-populated with the confirmed details in §2.2. Fields: legal name, trading name, ABN, secondary ABN *(empty)*, ACN *(empty)*, email, website, additional website, postal address, contact number, the confidentiality line, the "office address by appointment" line, the sign-off block, and the logo image.
- **Email** — provider, sending domain, from address, reply-to; plus two editable text blocks providing the default subject and body for the report email and the agent instruction email. A **deployment configuration item**, not a scope blocker (**D6**).
- **Defaults** — default agent for new cases, default case type, default status, days-until-due (14).
- **Reference sequences** — current value for case, client and agent references (§8.6).
- **Reference data** *(read-only)* — packages and rates, case types, statuses.
- **Users** — create, edit, deactivate, assign role, reset password.

---

## 10. Navigation

```
Main Menu
├── Files List  ──►  Files (detail)
├── Clients List ──► Clients (detail)
├── Agents List ──►  Agents (detail)
└── Settings (Admin)
```

From the case screen, the **Client** and **Agent** labels navigate to those records, reproducing the existing Go-to-Related-Record buttons. **[R]**

---

## 11. Keyboard behaviour

Reproduces the `Keystroke` script trigger, which is heavily used. **[R]**

| Context | Key | Action |
|---|---|---|
| Any | `Cmd/Ctrl+F` | Enter search |
| Search | `Return` | Run the search |
| Search | `Esc` | Cancel, return to browsing |
| List view | `Return` | Open the selected record |
| List view | `Esc` | Return to the main menu |
| List view | `f` / `a` / `c` | Go to Files / Agents / Clients list |
| Detail view | `Esc` | Return to that module's list |
| Detail view | `Return` | Commit the current field |
| Detail view | `↑` / `↓` | Previous / next record |

The `l` and `m` shortcuts (Leads, Marketing) are not reproduced — those modules are out of scope.

---

## 12. Search and filtering

### 12.1 Find **[R]**

Reproduces FileMaker's Find mode: the user enters a search state in which the fields on the current screen become query inputs, fills one or more, and submits.

- Case list: reference, client, client ref, subject names, agent, status, type, date entered, date due.
- Client list: company, name, kind, email, phone, city, state.
- Agent list: name, company, email, phone, city, state.
- Client and agent inputs offer type-ahead from existing records, reproducing the source's field-based value lists. **[R]**
- Text matching is "begins with" per word, matching FileMaker's default. **[R]**
- Results show as a filtered list with the found count; `Show All` clears. **[R]**

Search is **per module**. There is no cross-module search today and none is added. **[R]**

### 12.2 Saved filters (case list) **[R]**

| Button | Filter | Sort |
|---|---|---|
| **All** | No filter | Default |
| **New Instruction** | `status = 'New Instruction'` | Date Entered |
| **To Report** | `report_sent = false` | Status, then Date Entered |
| **To Invoice** | `invoiced = false` | Status, then Date Entered |

On login the system opens on the case list with **New Instruction** applied, reproducing the source's startup script. **[R]**

---

## 13. Report system

### 13.1 The five boilerplate bodies **[R]**

Editable text bodies, seeded from the current contents of the source system's template record.

| Code | Button label | Content |
|---|---|---|
| `located` | Located | REPORT SUMMARY / LOCATED RESULTS — residential address, mobile, DOB, email address, source/method of confirmation |
| `non_locate` | Not Located | NOT LOCATED RESULTS — last known address, neighbours, phone attempts, last known email; then SEARCH RESULT NOTES: Electoral Roll Search, Database Name search results, Social Media / Internet Links, Property Ownership Search, Rental applications Search, Employment Details / Business Information |
| `leads_obtained` | Leads Obtained | LEADS OBTAINED — possible address found, unable to verify, recommend a field call |
| `process_service` | Process Service | Service-of-documents result wording |
| `field_call` | Field Call | Instruction to serve legal documents, RESULT: Served / Unserved / Information Obtained, agent attendance date and time, affidavit note |

The exact current text of all five bodies, and the full Update Report outro paragraph, must be captured verbatim from the live `TemplatesEdit` screen — see §22 Content and assets.

### 13.2 Report outputs

All twelve live outputs are reproduced. **[R]** *(The thirteenth, `Print Leads`, belongs to the out-of-scope Leads module.)*

| # | Output | Source layout | Scope |
|---|---|---|---|
| 1 | **Case Report** | `Print File Report` | Single case, and batch |
| 2 | **Update Report** | `Print File Update` | Single case |
| 3 | **Agent Instruction** | `Print File Agent Instruction` | Single case |
| 4 | **Client Status Report** | `Print Client Status Report` | Result set |
| 5 | **File List by Agent** | `Print File List by Agent` | Result set |
| 6 | **Client Details** | `Print Clients Details` | Single client |
| 7 | **Client List** | `Print Clients List` | Result set |
| 8 | **Client Envelope** | `Print Clients Envelope` | Single client |
| 9 | **Agent Details** | `Print Agents Details` | Single agent |
| 10 | **Agent List** | `Print Agents List` | Result set |
| 11 | **Agent Envelope** | `Print Agents Envelope` | Single agent |
| 12 | *(Batch case report)* | `Print File Report Batch` | **Merged into #1** per **D5** |

### 13.3 Report content

**Letterhead (all reports)** — from Settings, pre-populated with the confirmed details **[D5]**:

```
[logo]
SKIP TRACING AND LOCATIONS AUSTRALIA PTY LTD     https://skiptracingserviceaustralia.com/
t/as People Trackers Australia                   email: admin@peopletrackers.com.au
ABN: 52 675822349                                www.peopletrackers.com.au

                        PRIVATE AND CONFIDENTIAL
```

**Footer (all reports)** — from Settings: postal address, contact number, website, email, and *"For security purposes our office address is made known by appointment only."* No ACN or secondary ABN is printed unless entered in Settings (§2.2, §21).

**Case Report** (`Print File Report`) **[R]**

| Element | Source | Static / dynamic |
|---|---|---|
| Letterhead and "PRIVATE AND CONFIDENTIAL" | Settings | Static per install |
| Client address block | Client company, contact name, address 1, address 2, city, state, postcode, country | Automatic |
| Headline | **The case status**, printed verbatim | Automatic |
| Date Closed | Case | Automatic |
| "OUR REF" | Case reference | Automatic |
| "YOUR REF" | Client Ref. | Automatic |
| Intro — *"Thank you for your instructions to locate the subject as indicated below. Please see below for our report on our investigations. If you have any queries regarding this report, please do not hesitate to contact our office."* | Layout text | Static |
| "AGENTS REPORT" heading | Layout text | Static |
| "RE:" line | Subject title, first, middle, last | Automatic |
| Body | The case `Report` field in full, line breaks preserved | **User-entered** |
| Sign-off — *"We trust this information is of assistance and thank you for your instructions. Yours truly,"* + sign-off block | Layout text + Settings | Static |
| Footer | Settings | Static |

**Update Report** (`Print File Update`) — same structure, different fixed text **[R]**:
- Intro: *"Thank you for your instructions to locate the subject(s) below. Our preliminary searches have not yet resulted in any confirmation of a new address or contact phone number for this subject. Please see below for details of our investigations to date. PLEASE DO NOT MAKE CONTACT WITH ANY OF THE PEOPLE, ADDRESSES OR PHONE NUMBERS IN THIS REPORT AS IT MAY HAVE A NEGATIVE IMPACT ON OUR INVESTIGATIONS."*
- Heading "UPDATE REPORT"; shows the **current date**, "People Trackers Ref" (case reference) and "Your Ref" (client ref)
- Outro beginning *"FURTHER SEARCHES AND ENQUIRIES WILL BE MADE ON THIS FILE AND WE WILL NOTIFY YOU OF OUR F…"* — full text to be captured with the templates (§22)

**Agent Instruction** (`Print File Agent Instruction`) **[R]** — in source order: OUR REF *(case reference)* · "Date file due for completion" *(Date Due)* · "Subject Details" *(subject full name)* · Last Name · First Name · Middle Name · Date of Birth · Drivers License · Home Phone · Mobile Phone · Work Phone · **Previous Address** *(the last-known address block)* · Employer *(employer address block and employer name)* · Additional Info. Footer as above.

**This report must contain no client identifying information** — the source deliberately omits it so the field agent cannot see who instructed the job. Hard requirement.

**Client Status Report** **[R]** — table: Date Entered · Client · Client Ref. · Subject · Type · Date Closed · Our Ref. Title "Client Status Report" plus the current date. Sorted by Status, then Date Entered.

**File List by Agent** **[R]** — table: ID · Client · Client Ref. · Subject · Package · Agent · Status · Due. Title "File List" plus the current date. Sorted by Agent, then Status, then Date Entered.

**Client / Agent Details, List and Envelope** **[R]** — Details: full address block. List: Name · Company · Phone · Email · Fax, titled "Clients" / "Agents" plus the current date. **Envelopes:** reproduce the existing output as closely as reasonable and confirm the page size during report testing **[D14]**.

**Conditional content:** there is none. No section of any report hides or shows based on data. The only variability is which report is chosen. **[R]**

### 13.4 Choosing a report **[R]**

Reproduces the `File : Print` chooser:

- Selector: **File Report · File Update · Agent Instruction · Client Status Report · File List by Agent**
- Scope: **Current Record** / **Records Being Browsed**
- Default selection computed exactly as in the source:

```
if on the list screen:              default = 'Client Status Report'
else if status = 'New Instruction': default = 'Agent Instruction'
else if status = 'Leads Obtained':  default = 'File Update'
else:                               default = 'File Report'
```

- Default scope: Current Record on the detail screen, Records Being Browsed on the list screen.

The equivalent chooser is reproduced for clients (Client Details · Client Envelope · Client List) and agents (Agent Details · Agent Envelope · Agent List). **[R]**

### 13.5 PDF generation **[A]**

- Server-side HTML/CSS rendered by headless Chromium. A4 portrait except envelopes.
- Letterhead and footer repeat on every page, as in the source layouts. **[R]**
- The user sees a browser preview, then Download or Print — the web equivalent of the source's Preview mode.
- **PDFs are generated transiently.** Only a PDF that is actually **emailed** is stored and recorded in `generated_documents`, because **D6** requires the email action to be recorded. Preview, download and print do not create stored files. The source archives nothing.

### 13.6 Batch PDF **[R]** / **[A]**

```
for each case in the current result set, sorted by client:
    render the Case Report
    filename = UPPER(client company, spaces → underscores)
             + "_" + lower(subject full name, spaces → underscores) + ".pdf"
mark every case in the set report_sent = true
```

The source writes to the Mac Desktop; V1 delivers a single ZIP download. **[A]** The sort, filename pattern and bulk `Report Sent` flagging are unchanged. A confirmation states how many cases will be affected before it runs.

---

## 14. Email **[D6]**

Direct email is an explicit V1 requirement. Provider, sending domain and credentials are a **deployment configuration item** and must not block development or acceptance.

### 14.1 Report to client

The existing system cannot email a report. **[R]** From a case, the user generates or selects a report, then sends:

1. **Recipient** — defaults to the client's `Email Reports`, falling back to `Email`. Fully editable. Basic format validation with a warning where the value is not a well-formed address; the loaded data contains such values (§8.4).
2. **Subject and body** — prefilled from the editable Settings text block, with merge fields: client contact name, subject full name, case reference, client ref.
3. **Attachment** — the generated report PDF.
4. **Confirmation** — a step showing recipient, subject and attachment. Never send silently.
5. **Record** — write `email_log` (recipient, subject, body, document, user, timestamp, provider status).

`Report Sent` remains a manual checkbox, as today. Sending an email does not set it. **[R]**

### 14.2 Agent instruction **[R]** / **[D12]**

Reproduces `File : Email Instruction`:

- **To:** the assigned agent's email, editable.
- **Subject:** `Agent Instruction : {case reference}` — the source hard-codes `40093`; use the case's own reference, with People Trackers wording (§2.3).
- **Body:** prefilled, opening `Hi {agent first name}`, then *"Please attempt to locate the following subject"* followed by the subject's details. Editable before sending.
- **No attachment.** The existing system attaches nothing, and that behaviour is reproduced. **[D12]**
- Confirmation before sending.
- On success: set `date_instruction_sent = today` and write `email_log`. **[R]**

### 14.3 Delivery configuration

- Sending sits behind a provider interface with the transport injected from configuration.
- Non-production uses a capture/preview transport, so the whole flow — compose, confirm, attach, record — is fully testable without a live provider.
- Production requires a transactional provider with a verified sending domain and SPF, DKIM and DMARC. Record provider message IDs; handle bounces into `email_log.status`.
- **No values from the old system are carried across.** `nicole@itrace.com.au`, `smtp.optusnet.com.au` and `pop.briefcase.net.au` must not appear anywhere.

### 14.4 Not reproduced

The list-screen "Email" buttons on the client, agent and print-list layouts are broken in the source (missing field references, a `"Briefcase Order"` subject left over from the framework). Not reproduced. A plain `mailto:` link on an email address is sufficient. **[R]**

---

## 15. Users, roles and permissions

Two roles, mapped to the two privilege sets actually in use in the source. **[R]**

| Capability | Admin *(≈ `[Full Access]`)* | Staff *(≈ `[Data Entry Only]`)* |
|---|---|---|
| Cases — create, view, edit, delete | ✔ | ✔ |
| Clients / Agents — create, view, edit, delete | ✔ | ✔ |
| Generate reports, print, download PDF | ✔ | ✔ |
| Send email | ✔ | ✔ |
| Edit report body templates | ✔ | ✔ |
| Batch PDF | ✔ | ✔ |
| Settings — company, email, defaults | ✔ | ✖ |
| User management and password resets | ✔ | ✖ |

**Staff can delete records.** The source's `[Data Entry Only]` set grants `Create/Edit/Delete` on all records; reproduced rather than tightened. Deletion shows a confirmation, as FileMaker does. **[R]**

The unused `[Client]`, `[Agent]` and `[Read-Only Access]` privilege sets are not reproduced. **[R]**

Permissions are enforced **server-side on every endpoint**, not merely hidden in the UI.

---

## 16. Record metadata **[D10]**

**There is no audit log, no change history and no audit viewer in V1.**

The source records `Modified Account` and `Modified Time` on clients and agents, and nothing at all on cases. **[R]** V1 reproduces that pattern:

- **Clients and agents:** `created_at`, `created_by`, `updated_at`, `updated_by`. For loaded records these come from the source `Date Entered`, `Modified Time` and `Modified Account` (§8.2, §8.3). Displayed on the record where the source displays them.
- **Cases:** the same four columns are stored as standard row metadata. The source has no equivalent, so **they are not surfaced anywhere in the UI**. **[A]**
- **Email sends** are recorded in `email_log` because **D6** explicitly requires the email action to be recorded. This is a send log, not an audit system.

---

## 17. Security

The source ran as a desktop file on one Mac with no internet exposure. Moving to the cloud creates that exposure, so the controls below are the minimum required to host the same data safely. They are not product features.

- Host in an **Australian region**; document data residency.
- TLS 1.2+ throughout; HSTS.
- Passwords hashed with Argon2id. TOTP available and optional.
- Role-based access control enforced server-side on every endpoint.
- Encryption at rest for database and object storage. *(The source database is unencrypted. **[R]**)*
- Emailed PDFs served only via short-lived signed URLs.
- Login rate limiting and lockout; session timeout.
- Parameterised queries; input validation on every endpoint.
- Automated daily encrypted backups with a documented and **tested** restore.
- No secrets in source control — provider keys in environment configuration or a secret manager. *(The source hard-codes credentials in a script. **[R]**)*

The system holds names, dates of birth, driver's licence numbers, home addresses, phone numbers and employer details for people being traced, generally without their knowledge — sensitive personal information under the Australian Privacy Act 1988. **The source applies no data-retention rule and none is imposed here**; whether one should exist is a business matter for the client, not a V1 build item.

**Legacy environment note (unrelated to V1).** A plaintext mailbox password is embedded in the existing FileMaker startup script alongside its username and host; anyone who has held a copy of the `.fmp12` can read it. It should be rotated. Nothing from that configuration carries into V1.

**Data handling during the load.** `export_clients.csv` and `export_agents.csv` are the input to §8; retain until the load is complete, then delete. `export_files.csv` — 26,993 case records covering roughly 27,000 individuals — is **no longer required for any purpose** under **D3** and should be deleted now.

---

## 18. Architecture

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Vite, TanStack Query, Tailwind + component library |
| Backend | Node.js + TypeScript (NestJS or Fastify), REST |
| Database | PostgreSQL — constraints plus `tsvector` full-text search, replacing FileMaker's field indexes |
| Migrations | Prisma or Drizzle; seed script for reference data (§7); one-off load script for clients and agents (§8) |
| Auth | Session cookies or JWT + refresh; Argon2id; optional TOTP |
| PDF | Headless Chromium (Playwright) rendering HTML/CSS with `@page` headers and footers |
| Email | Provider interface with the transport injected from configuration (**D6**); capture transport in non-production |
| Object storage | S3-compatible, for emailed PDFs |
| Hosting | Managed platform or small cloud footprint, **Australian region** |
| Observability | Error tracking and structured logs |

Explicitly not used: microservices, event sourcing, GraphQL, Kubernetes, native mobile apps.

---

## 19. Acceptance criteria

**Data load**
- [ ] 689 clients and 35 agents loaded as-is, references preserved, ranges 1660–2715 and 1123–1158.
- [ ] No client or agent record merged, deleted or corrected by the load. **[D11]**
- [ ] State abbreviations normalised; the three non-Australian clients retained.
- [ ] Agent skills split correctly, including the one agent with two skills.
- [ ] `needs_review` records visible via the list filter.
- [ ] 20 clients and 5 agents spot-checked field-by-field.

**Workflow**
- [ ] A new case receives reference **55982**, then increments.
- [ ] A new case applies every default in §6.1.
- [ ] Selecting a client resolves the package per §6.2 and rates per §6.3.
- [ ] Changing status recalculates fee and amount per §6.4 and stamps `Date Closed` per §6.5.
- [ ] Each template button copies its body into Report, with the replace confirmation when non-empty.
- [ ] The full workflow — instruction to reported — completes in a browser without FileMaker.

**Reports**
- [ ] All twelve outputs generate as PDFs.
- [ ] The letterhead shows only the confirmed details in §2.2; no iTrace branding appears anywhere.
- [ ] The three case reports are visually verified against FileMaker output for equivalent data, and signed off.
- [ ] Envelope output verified against the existing envelope during report testing. **[D14]**
- [ ] The Agent Instruction contains no client identifying information.
- [ ] Report chooser defaults are correct for each status.
- [ ] Batch PDF produces correctly named files for a result set and flags them all reported.

**Email**
- [ ] A report can be composed, recipient edited, subject and body edited, PDF attached, confirmed and sent from a case.
- [ ] The send is recorded and visible on the case.
- [ ] An agent instruction can be sent, **with no attachment**, and stamps `Date Instruction Sent`. **[D12]**
- [ ] The whole flow is demonstrable using the capture transport, with no production provider configured.

**Search and navigation**
- [ ] Find works on each list screen over the fields in §12.1.
- [ ] All four saved filters return correct sets with correct sorts.
- [ ] The application opens on the case list with New Instruction applied.
- [ ] Every keyboard shortcut in §11 works; `<` / `>` step through the current filtered set.

**Platform**
- [ ] Admin and Staff permissions enforced server-side per §15.
- [ ] Settings editable; nothing in §2.2 hard-coded.
- [ ] Two users work concurrently without conflict.
- [ ] Daily encrypted backups with a tested restore.
- [ ] Australian region, TLS enforced.

**Scope**
- [ ] No audit log, change history or audit viewer. **[D10]**
- [ ] `Mobile` and `Rate` not displayed on the agent screen. **[D13]**
- [ ] No invoicing, accounting integration, attachments, portal, Leads, Marketing, dashboard, analytics or global search built.
- [ ] No historical case records present.

---

## 20. Future features

1. Editable packages, rates, case types and statuses in Settings.
2. Document and photo attachments on cases.
3. Invoicing — the data is already present (`fee`, `units`, `amount`, `invoiced`, client `terms` and `abn`).
4. Accounting integration (Xero / MYOB).
5. Client portal · agent portal.
6. A Subjects entity with cross-case history.
7. Global cross-module search · dashboard and analytics · case timeline · notifications.
8. Audit log and change history, if ever required.
9. Client data cleanup tooling.
10. Import of the historical case records, should they later be wanted.

---

## 21. Remaining open question

One item genuinely remains unresolved.

| Question | Blocks | Needed by |
|---|---|---|
| **The Agent Instruction and Update Report footers currently print `ACN: 623713593` and `ABN: 97 623 713593`.** Neither number is in the confirmed business details (§2.2), so per **D5** they will not be printed and will not be substituted. **Are these numbers current, and should they appear on reports?** If yes, supply them for Settings. If no, confirm the reports should omit them. | Report footers | Phase 4 |

---

## 22. Content, assets and deployment configuration

Not open questions — items to be supplied.

**Content and assets required before Phase 4**

| Item | Note |
|---|---|
| Exact verbatim text of the five report boilerplate bodies | Read from the live `TemplatesEdit` screen. Extractable from the FileMaker file on request |
| Full text of the Update Report outro paragraph | Truncated in the supplied PDF |
| Logo image at print resolution | For the letterhead |

**Deployment configuration — required before go-live, not scope blockers (D6)**

| Item |
|---|
| Sending domain and from/reply-to address, with SPF, DKIM and DMARC configured |
| Transactional email provider account and API credentials |
| Hosting account and Australian region selection |

---

## 23. Development phases

| Phase | Content | Duration |
|---|---|---|
| **0 — Close-out** | Resolve §21. Capture the five template bodies, the Update Report outro and the logo (§22). | 2 days |
| **1 — Foundations** | Repo, CI, environments, schema, reference-data seed, auth, roles, app shell, main menu, keyboard layer. | 1.5 weeks |
| **2 — Clients & Agents** | Both list and detail screens, defaults, Find, needs-review filter, print outputs 6–11. Load script written and run against a development database. | 2 weeks |
| **3 — Cases** | Case list with columns, sorts and the four saved filters; case detail with every section; pickers; package/rate/fee engine; status side effects; five template buttons; Find. | 3 weeks |
| **4 — Reports & PDF** | HTML/CSS templates for outputs 1–5, Chromium rendering, preview, report chooser with status-based defaults, Batch PDF with ZIP delivery. Visual sign-off. | 2 weeks |
| **5 — Email** | Provider interface, capture transport, report-to-client, agent instruction, Settings text blocks, send log. | 1 week |
| **6 — Settings & hardening** | Company/letterhead, email configuration, defaults, reference sequences, read-only reference data, user management. Security review, backups, restore test. | 1 week |
| **7 — UAT** | Nicole works real cases in the new system for a week. Fix list. | 1.5 weeks |
| **8 — Go live** | Final client and agent load, provider credentials configured, deploy, hypercare. | 3 days |

**Indicative total: 12–13 weeks.** Phase 3 is the critical path.

---

## Appendix — evidence base

Derived from a read-only inspection of `iTrace Recovered 3.53.23 pm.fmp12` on 9 August 2026.

| Artefact | Role |
|---|---|
| `iTrace Recovered 3_53_23 pm_fmp12.xml` | Complete FileMaker Database Design Report — every field, calculation, script step, layout object, value list, account and privilege set |
| `PeopleTrackers_ReverseEngineering_Spec.md` | Full reverse-engineering report; the evidence behind every **[R]** statement here |
| `newinstructionstemplate.pdf`, `updatereport.pdf`, `skipreport .pdf`, `fieldcallreport.pdf`, `clientstatusreport.pdf` | Sample outputs of five of the twelve reports |
| `export_clients.csv`, `export_agents.csv` | **Input to the §8 load.** Retain until the load is complete, then delete |
| `export_files.csv` | 26,993 historical case records. **No longer required under D3 — delete** |

No table, field, relationship, layout, script, value list, account or record in the source database was created, modified or deleted at any point.

---

*End of specification. No implementation work is to begin until this document is approved.*
