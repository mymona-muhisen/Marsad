# Tasweya — System Analysis & Design Diagrams
## Document 02 — ERD, Use Cases, Activity Diagrams

**Version:** 1.0 · July 2026
**Sources:** All PlantUML files ship alongside this document (`02a`–`02e .puml`). Render at [plantuml.com/plantuml](https://www.plantuml.com/plantuml) or locally with `plantuml *.puml`.

---

## 1. Entity-Relationship Diagram

**File:** `02a-erd.puml`

### Explanation & design decisions

The model has five clusters, mirroring the modules from Document 01:

1. **Identity & organizations** — one `users` table for all human actors; roles via a `user_roles` pivot (maps to spatie/laravel-permission at implementation time). Insurers, workshops, assessor offices, regulator, and traffic authority are all `organizations` with a `type` — one multi-tenant mechanism instead of five tables. Staff users carry a nullable `organization_id`.
2. **Registry** — `vehicles` → `insurance_policies`. A policy belongs to a vehicle and an insurer; `verification_status` implements the manual-fallback verification workflow (unverified → pending → verified/rejected).
3. **Case core** — `accident_cases` is the aggregate root. `case_parties` decouples the case from the people in it: a counterparty may have no account yet (nullable `user_id`), an uninsured vehicle has a null `policy_id`. `evidence_items` stores the SHA-256 hash indexed — that index is what makes cross-case duplicate-photo fraud detection a single query. `dispatches` records surveyor assignment history (declines included, for accountability).
4. **Fault** — `liability_rules` is versioned with effective dates (decisions stay reconstructable after rule changes — NFR auditability). `fault_decisions` is 1:1 with a case; `fault_allocations` holds a percentage **per party** rather than two columns, so multi-vehicle accidents need no schema change. `objections` and the 1:1 `reports` table (QR token, signed hash) complete the cluster.
5. **Claims** — one claim per not-at-fault party per case (a case can produce several claims). `claim_events` is an append-only timeline powering the claimant-visible status tracker and SLA measurement. `damage_estimates` → `estimate_items` reference `parts_prices` (versioned — the inflation-aware price list). `settlements` is 1:1 with a claim. `audit_logs` spans everything.

Key rationale worth defending in a viva: **party-centric fault allocation** (extensible beyond 2 vehicles), **hash-indexed evidence** (fraud net), **versioned rules and prices** (auditability under change), **append-only events** (immutability by construction, not by discipline).

```plantuml
' See 02a-erd.puml — full source included there
```

---

## 2. Use Case Diagram

**File:** `02b-use-cases.puml`

### Explanation

Ten actors against six functional packages. Design choices:

- **Triage is an `<<include>>` of both intake paths** (self-report and hotline) — it always runs; it is not optional behavior.
- **Counterparty join `<<extends>>` reporting** — it only happens when a second party exists and responds.
- **Adjudication `<<includes>>` the matrix proposal and report issuance** — an adjudicator never issues a decision outside the rule engine, and every final decision produces a report. This encodes the human-in-the-loop policy in the model itself.
- **Objection `<<extends>>` to appeal resolution** — the appeal path exists only when a party objects.
- **`Verify report authenticity` is reachable by Citizen and Authority** — the public QR check; deliberately outside any login-gated package interaction (authentication note belongs in the narrative, not the diagram).
- Claim processing `<<includes>>` estimation and settlement — an insurer cannot settle without a recorded estimate.

```plantuml
' See 02b-use-cases.puml — full source included there
```

---

## 3. Narrative Use Cases

Fully dressed narratives for the five architecturally significant use cases. Remaining use cases (vehicle CRUD, dashboards, admin) are standard and documented at implementation time.

### UC-01 — Report Accident (Self-Service)

| Field | Value |
|---|---|
| **ID / Name** | UC-01 — Report Accident (guided wizard) |
| **Primary actor** | Citizen (reporting driver) |
| **Stakeholders** | Counterparty (fair single case), insurers (reliable evidence), adjudicator (decidable case) |
| **Preconditions** | Citizen authenticated; at least one registered vehicle |
| **Trigger** | Citizen involved in a material-damage accident |
| **Success guarantee** | Case exists with hashed, geotagged evidence; counterparty invited; case triaged |

**Main success scenario**
1. Citizen opens "Report Accident"; system checks for injuries first (safety gate).
2. Citizen confirms no injuries; system captures location (GPS or manual map pin).
3. System launches guided photo capture: overlay frames for (a) wide scene shot, (b) both vehicles + road, (c) damage close-ups per vehicle, (d) plates. Each photo is compressed client-side, hashed (SHA-256), geotagged, timestamped.
4. Citizen selects their vehicle; active policy auto-attaches.
5. Citizen adds counterparty: scans their platform QR (registered user) or enters plate + phone manually.
6. Citizen records a statement (voice note in Arabic, or text).
7. Citizen reviews summary and submits; system creates the case (`submitted`), sends the counterparty an SMS deep link, and runs triage (UC includes Triage).
8. System shows case number + expected next step ("awaiting other party" / "surveyor on the way" / "under review").

**Extensions (alternate flows)**
- 1a. *Injuries reported* → system displays emergency numbers, marks `police_required`, pauses case until a police report reference is attached.
- 2a. *No GPS signal* → manual map pin required; case flagged `location_unverified`.
- 3a. *Connectivity lost mid-upload* → evidence queued locally (offline-first); case saves as `draft`; auto-sync on reconnect.
- 5a. *Counterparty fled / unknown* → citizen marks "hit and run"; case proceeds one-sided and is flagged for authority attention.
- 5b. *Counterparty uninsured* → case forced to `dispatch_required`; uninsured party recorded (data feeds enforcement analytics).
- 7a. *Counterparty never joins (24h)* → case proceeds one-sided; decision weight noted in adjudication.

---

### UC-02 — Join Case as Counterparty

| Field | Value |
|---|---|
| **ID / Name** | UC-02 — Join Case as Counterparty |
| **Primary actor** | Citizen (second driver) |
| **Preconditions** | Case exists; SMS deep link received |
| **Success guarantee** | Both perspectives merged into one case; contradictions auto-highlighted |

**Main success scenario**
1. Counterparty opens the SMS deep link.
2. If unregistered: minimal onboarding (phone + OTP) inline — no friction wall.
3. System shows the accident's basic facts (time, place — **not** the reporter's statement, to avoid anchoring/copying).
4. Counterparty submits own photos and statement (same guided capture as UC-01).
5. System merges submissions into the single case, diffs the two accounts (location deltas, damage-position consistency, timeline), and highlights contradictions for the adjudicator.
6. Case moves to `evidence_complete` (or dispatch, per triage).

**Extensions**
- 2a. *Phone number mismatch with reported counterparty* → identity flag raised; manual review.
- 4a. *Counterparty disputes being involved at all* → case flagged `disputed_identity`; forced dispatch/authority path.

---

### UC-04 — Adjudicate Fault Decision

| Field | Value |
|---|---|
| **ID / Name** | UC-04 — Adjudicate Fault |
| **Primary actor** | Adjudicator |
| **Preconditions** | Case `evidence_complete`; active liability-matrix version exists |
| **Success guarantee** | Decision with per-party percentages, cited rule, justification; parties notified; objection window open |

**Main success scenario**
1. Adjudicator pulls the next case from the queue (FIFO within priority class).
2. System displays: evidence timeline, both statements side-by-side with contradiction highlights, scene sketch, surveyor report if any.
3. Adjudicator classifies the scenario (e.g., `REAR_END`, `PRIORITY_VIOLATION`); system proposes the matrix split with the rule text cited.
4. Adjudicator confirms.
5. System records the decision (rule id + matrix version pinned), notifies both parties with the **cited rule in plain Arabic**, opens the 72-hour objection window.

**Extensions**
- 3a. *No matching scenario* → adjudicator selects `MANUAL`, sets percentages, mandatory justification; case auto-flagged for matrix-gap review (feeds rule improvement).
- 4a. *Adjudicator overrides proposal* → mandatory written justification; override rate per adjudicator tracked (quality metric).
- 5a. *Party objects (UC-05)* → decision `objected`; escalates to senior adjudicator; one appeal level; outcome final.

---

### UC-06 — Process Claim (Insurer)

| Field | Value |
|---|---|
| **ID / Name** | UC-06 — Process Claim |
| **Primary actor** | Insurer Agent |
| **Preconditions** | Final report issued; claim auto-created; SLA timer running |
| **Success guarantee** | Claim reaches a terminal state with reason-coded decisions; claimant informed at every step |

**Main success scenario**
1. Agent opens the claim: signed report, policy, evidence, fault allocation.
2. Agent validates policy coverage (dates, type, exclusions).
3. Agent selects assessment mode: assessor visit / workshop estimate / desk assessment (minor damage).
4. Estimate arrives as itemized lines validated against the reference price list; deviations > threshold flagged.
5. Agent approves (full or partial — reason codes mandatory for partial/reject).
6. Agent records settlement: repair order to an accredited workshop, or cash compensation.
7. System closes the claim, stops the SLA clock, logs compliance for the regulator, notifies the claimant.

**Extensions**
- 2a. *Policy invalid/lapsed* → reject with reason code; claimant notified with recourse note (civil action path).
- 4a. *Estimate deviates heavily* → agent requests second estimate; both retained (audit).
- 5a. *Information requested* → claim `info_requested`; SLA clock keeps running (insurer cannot stall the clock; regulator sees it).

---

### UC-07 — Verify Report Authenticity (Public)

| Field | Value |
|---|---|
| **ID / Name** | UC-07 — Verify Report (QR) |
| **Primary actor** | Anyone holding a report (insurer, court clerk, checkpoint officer, buyer of a used car) |
| **Preconditions** | None (public endpoint, rate-limited) |
| **Success guarantee** | Authenticity confirmed or denied; zero personal data exposed |

**Main scenario**
1. Actor scans the QR on a printed/PDF report.
2. System resolves the token and returns: report number, issue date, case date, validity status, document hash — **no names, plates, or amounts**.
3. Actor compares the displayed hash/number with the document in hand.

**Extensions**
- 2a. *Token unknown* → "No such report" — the forgery signal this use case exists for.
- 2b. *Report superseded on appeal* → response says "superseded by report N" (prevents circulating stale decisions).

---

## 4. Activity Diagrams

Three diagrams cover the platform's spine end-to-end. Swimlanes make responsibility hand-offs explicit — the property examiners look for.

### 4.1 Accident Reporting & Triage — `02c-activity-reporting.puml`

Covers UC-01/02/03 plus triage. Key logic visible in the flow: the **injury gate comes first** (safety before data), the counterparty join runs on a 24-hour timer in parallel, and triage fans out to the three tracks (police / fast-track / dispatch) with surveyor decline-and-reassign handled explicitly.

### 4.2 Fault Determination, Objection & Report Issuance — `02d-activity-fault.puml`

Covers UC-04/05 plus report generation. Shows the human-in-the-loop pattern: matrix proposes → adjudicator confirms or overrides (justification mandatory) → 72h objection window → single appeal level → signed QR report → claims auto-opened. The diagram makes clear that **no report exists without a final decision, and no claim exists without a report** — the integrity chain.

### 4.3 Claim Processing & Settlement — `02e-activity-claim.puml`

Covers UC-06. Shows the three assessment modes as a switch, price-list deviation flagging, the approve/partial/request-info branch, and the repair-order vs cash settlement fork, ending with SLA logging and the analytics feed.

---

## 5. Traceability

| Diagram element | Requirement (Doc 01) |
|---|---|
| `evidence_items.sha256` + duplicate index | FR-S3, Innovative #6 |
| `liability_rules.version/effective_from` | FR-F1, NFR Auditability |
| `fault_allocations` per party | FR-F2, multi-vehicle extensibility |
| `reports.qr_token` + UC-07 | FR-F4, Innovative #4 |
| `claim_events` append-only | FR-CL4, Innovative #10 |
| Offline queue in activity 1 | FR-C5, NFR Offline tolerance |
| Reason codes in activity 3 | FR-CL2 |
| SLA timer in activity 3 | FR-D1, NFR Accountability |

*Next suggested steps: MySQL migration schema + seeders, or API surface design (`/api/v1` endpoints per module).*
