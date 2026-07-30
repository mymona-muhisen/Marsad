# Smart Traffic Accident & Insurance Management Platform for Syria
## Business Analysis & Concept Design — Document 01

**Project codename:** *Marsad* (مرصد — "settlement") — working name, changeable.
**Version:** 1.0 · July 2026

---

## Part A — Najm as a Business System (Analysis)

### A.1 What Najm Is

Najm for Insurance Services (est. 2007) is a private company created jointly by the Saudi Central Bank (SAMA) and the insurance sector, working with the General Department of Traffic (Muroor). It is a **neutral intermediary** — it is not an insurer. Its role: document accidents, determine fault, and route standardized claims between drivers, insurers, and the traffic authority.

### A.2 Najm's Core Value Proposition

| Problem before Najm | Najm's solution |
|---|---|
| Police required at every accident scene | Najm surveyors handle insured, injury-free accidents; police freed for serious cases |
| Fault disputes decided ad hoc | Standardized fault percentages (100/0, 75/25, 50/50…) based on evidence rules |
| Each insurer had its own claim intake | One unified report auto-distributed to all involved insurers within 2 business days |
| Fraud (staged accidents, inflated damages) | Central accident history per driver/vehicle, scene photos, GPS-stamped evidence |
| Congestion from blocked roads | "Inform, photograph, leave" remote review for minor accidents (since 2024) |

### A.3 Najm's Business Workflow (as-is)

1. **Report** — driver calls 920000560 or uses the Najm app; GPS locates the scene.
2. **Triage** — injuries/criminal element → police; insured & material damage only → Najm.
3. **Dispatch** — nearest surveyor sent via GPS; or remote self-service for minor accidents (photos uploaded, parties leave the road).
4. **Documentation** — surveyor captures photos, IDs, plates, insurance policies; parties' statements recorded.
5. **Fault determination** — evidence analyzed against traffic-law liability rules; fault percentages assigned; parties can object/appeal.
6. **Report issuance** — official report delivered within ~24h (SMS/app); sent to all involved insurers within 2 business days.
7. **Damage assessment** — vehicle inspected at a Taqdeer center; repair-cost estimate (parts + labor) issued within 24h.
8. **Claim settlement** — insurer receives Najm report + Taqdeer estimate → approves repair at accredited workshop or cash settlement. Najm's *Mokhalasat* service tracks claim status end-to-end.
9. **Data feedback** — accident data feeds insurer pricing, the traffic authority's enforcement, and driver risk scores.

### A.4 Why It Works — Structural Enablers

Najm depends on preconditions Syria largely **lacks**, which drives our redesign:

1. **Clean national registries** — Absher/Elm give real-time access to IDs, licenses, plates, and policy status. *Syria: fragmented, partially paper-based records.*
2. **Near-universal insurance enforcement** — uninsured driving is systematically fined. *Syria: compulsory third-party insurance exists (issued via a SISC-managed pool on behalf of insurers) but enforcement is uneven and many vehicles circulate uninsured or with lapsed policies.*
3. **Dense surveyor fleet + reliable GPS/telecom** — minutes-level dispatch. *Syria: fuel, staffing, and connectivity constraints; response times unpredictable outside major cities.*
4. **A single strong regulator (SAMA)** that mandates insurer participation. *Syria: SISC exists and is pushing digitization (e-policies with QR codes approved Aug 2024; compensation ceilings raised), but integration maturity is low.*
5. **Stable payments infrastructure** for settlements. *Syria: cash-dominant, banking under reconstruction.*

**Conclusion:** copying Najm 1:1 would fail. The redesign must be *offline-tolerant, verification-flexible, and enforcement-light*, while still producing trustworthy, standardized accident reports that insurers accept.

---

## Part B — The Redesigned Concept for Syria

### B.1 Vision

A national web platform that becomes the **single source of truth for traffic accidents and motor insurance claims in Syria** — usable today with self-reporting and manual verification, and progressively integrable with government registries as they digitize.

Design philosophy (three pillars):

1. **Self-service first, agent-assisted second.** Citizens document accidents themselves (guided photo capture, QR policy scan); surveyors are dispatched only when needed (disputes, injuries, high value). This inverts Najm's agent-first model to fit Syria's resource constraints.
2. **Trust built in software, not assumed from registries.** Every artifact is timestamped, geotagged, hashed, and cross-checked; a verification workflow replaces missing government APIs.
3. **Progressive integration.** Every external dependency (traffic authority, civil registry, payment) is behind an adapter interface with a manual-mode fallback, so the platform works now and upgrades later.

### B.2 Stakeholders

| # | Stakeholder | Stake / interest |
|---|---|---|
| 1 | **Drivers & vehicle owners** (citizens) | Fast, fair, corruption-resistant accident resolution; claim transparency |
| 2 | **Insurance companies** (public: Syrian Insurance Co.; private: AROPE Syria, SIIC, Al-Aqeelah, etc.) | Standardized reports, fraud reduction, lower claim-handling cost, risk data |
| 3 | **Syrian Insurance Supervisory Commission (SISC)** | Market oversight, compulsory-pool administration, sector statistics |
| 4 | **Traffic Directorate / Ministry of Interior** | Accident records, road-safety data, reduced police workload at minor accidents |
| 5 | **Field surveyors** (platform employees/contractors) | Work assignment, evidence tooling, performance tracking |
| 6 | **Repair workshops & damage assessors** | Accredited work pipeline, standardized estimates |
| 7 | **Hospitals / Red Crescent (SARC)** | Injury-accident coordination (phase 2) |
| 8 | **Platform operator** (the company running the system) | Sustainability: per-report fees from insurers, SaaS fees, data products |
| 9 | **Ministry of Transport / municipalities** | Black-spot mapping, infrastructure planning data |

### B.3 Business Workflow (to-be)

**Stage 0 — Onboarding (pre-accident)**
Driver registers → adds vehicles + insurance policies (photo of policy, or QR scan of SISC e-policies) → platform verifies policy against insurer records (API if available, insurer back-office queue if not). Verified assets get a "green badge" that accelerates future claims.

**Stage 1 — Accident intake (3 channels)**
- **Self-report (primary):** guided wizard — location (map pin, works with cell towers if no GPS), scene photos with on-screen overlay guides (4 corners, damage close-ups, road view), other party captured by scanning their platform QR or manual entry, voice-note statements (Arabic).
- **Hotline/agent-assisted:** call center creates the case, dispatches a surveyor.
- **Counterparty join:** the second driver receives an SMS/link and attaches their side of the story to the same case — a single case, two perspectives (a key anti-fraud design).

**Stage 2 — Triage engine**
Rule-based classification: injuries → routed to police/emergency, case flagged "police report required"; both parties insured + minor damage + stories consistent → **fast track (fully remote)**; dispute, uninsured party, or high estimated damage → **surveyor dispatch**.

**Stage 3 — Evidence & documentation**
All evidence (photos, statements, sketches) is hashed (SHA-256) at upload, geotagged, and locked into an immutable case timeline. Surveyor app (responsive web, offline-capable queue) adds professional scene documentation. Digital scene sketch tool (drag-and-drop vehicles/roads).

**Stage 4 — Fault determination**
A **codified liability matrix** (rear-end, lane change, priority violation, reversing, etc. → standard fault splits per Syrian traffic law) proposes a determination; a licensed reviewer (back-office adjudicator) confirms or adjusts it with written justification. Parties are notified and have **72h to object** → escalates to a senior review panel; final decision documented. The matrix + human confirmation gives Najm-style consistency without pretending full automation is trustworthy on day one.

**Stage 5 — Official report issuance**
Digitally signed PDF report (Arabic, with QR verification code — anyone can scan and confirm authenticity on the platform, mirroring SISC's QR direction). Auto-distributed to both insurers' portals. SLA target: 48h for fast track, 5 days for disputed cases.

**Stage 6 — Damage assessment**
Insurer chooses: accredited assessor visit, workshop-submitted estimate (photos + itemized parts/labor through the platform), or desk assessment from scene photos for minor damage. Standardized estimate format with a parts price reference list (regularly updated — inflation-critical in Syria).

**Stage 7 — Claim settlement**
Claim record links report + estimate + policy. Insurer actions in-platform: approve / partial approve / reject (reason codes mandatory). Settlement modes: direct-to-workshop repair order or cash compensation. Status timeline visible to the claimant at every step ("your claim is with the assessor", etc.). Regulator (SISC) sees aggregate SLA compliance per insurer.

**Stage 8 — Data & feedback loop**
Accident heatmaps and black-spot reports for authorities; per-driver/vehicle accident history; fraud signals (repeat claimants, photo reuse detection via hash matching, impossible-geometry flags); market statistics for SISC.

### B.4 User Roles (RBAC)

| Role | Description | Key permissions |
|---|---|---|
| `citizen` | Driver / vehicle owner | Report accidents, manage vehicles/policies, track claims, object to fault decisions |
| `surveyor` | Field agent | View assigned cases, capture evidence, submit scene reports, offline queue |
| `adjudicator` | Back-office fault reviewer | Review evidence, confirm/adjust fault, issue reports |
| `senior_adjudicator` | Appeals panel | Handle objections, final decisions, override with justification |
| `insurer_agent` | Insurance company staff | Receive reports, verify policies, process claims, approve settlements |
| `insurer_admin` | Insurance company admin | Manage company users, SLA dashboard, accredited workshop list |
| `assessor` | Damage assessor (independent or insurer-appointed) | Submit standardized damage estimates |
| `workshop` | Accredited repair shop | Receive repair orders, submit estimates, update repair status |
| `regulator` | SISC user | Read-only market dashboards, SLA compliance, fraud statistics |
| `authority` | Traffic Directorate user | Accident records access, black-spot analytics, police-report linkage |
| `call_center` | Hotline operator | Create cases on behalf of callers, dispatch surveyors |
| `admin` | Platform operator | Full system management, user/role management, liability-matrix configuration |
| `super_admin` | Technical owner | Everything + system configuration, audit log access |

Implementation note: single `users` table + roles/permissions (spatie/laravel-permission), with `insurer_agent`/`insurer_admin`/`assessor`/`workshop` scoped to an `organization_id` (multi-tenant within one database).

### B.5 Modules

1. **Identity & Access** — registration (phone-first, OTP via SMS), Sanctum auth, RBAC, organization scoping, Arabic/English profiles.
2. **Vehicle & Policy Registry** — vehicles, ownership, insurance policies, verification workflow, QR policy scan, expiry reminders.
3. **Accident Intake & Case Management** — reporting wizard, counterparty join, case lifecycle state machine, triage engine, hotline console.
4. **Dispatch & Field Operations** — surveyor assignment (zone-based), availability, offline-tolerant evidence submission, dispatch board.
5. **Evidence Vault** — media upload, hashing, geotag/timestamp, immutability, scene sketch tool, duplicate-photo fraud detection.
6. **Fault Determination** — liability matrix engine, adjudication queue, objection/appeal workflow, decision documentation.
7. **Report Generation** — signed PDF generation (Arabic RTL), QR authenticity verification, distribution to insurers.
8. **Claims & Settlement** — claim records, insurer action console, settlement tracking, reason-coded decisions, claimant timeline.
9. **Damage Assessment** — assessor/workshop estimates, standardized line items, parts price reference list, desk assessment.
10. **Notifications** — SMS (primary — universal in Syria), in-app, email; event-driven, queued.
11. **Analytics & Reporting** — heatmaps, black-spot detection, insurer SLA dashboards, SISC market statistics, driver risk profiles.
12. **Fraud & Integrity** — signal rules, case flags, cross-case photo matching, audit trail on every mutation.
13. **Administration** — liability-matrix editor, reference data (regions, vehicle makes, parts prices), organization onboarding, feature flags for integration adapters.

### B.6 Functional Requirements (selected, numbered for traceability)

**FR-AUTH**
- FR-A1: Register with Syrian mobile number + OTP; national ID optional at signup, required before first claim payout.
- FR-A2: Role-based access with organization scoping; a user may hold multiple roles.
- FR-A3: Full audit log of privileged actions.

**FR-REG (registry)**
- FR-R1: CRUD vehicles (plate, VIN, make/model/year, color, photos).
- FR-R2: Attach insurance policy (insurer, policy no., type: compulsory TPL / comprehensive, validity dates, document photo or QR).
- FR-R3: Policy verification workflow: auto (insurer API) or manual (insurer back-office queue) with status: unverified → pending → verified/rejected.
- FR-R4: Expiry notifications 30/7/1 days before policy lapse.

**FR-ACC (accidents)**
- FR-C1: Guided accident report: location, datetime, ≥4 photos with capture guides, party details, voice/text statement, injury flag.
- FR-C2: Counterparty invitation via SMS deep link; both submissions merge into one case.
- FR-C3: Triage rules classify case: `fast_track` / `dispatch_required` / `police_required` — rules configurable by admin.
- FR-C4: Case state machine: `draft → submitted → under_review → awaiting_counterparty → evidence_complete → adjudication → decision_issued → objection_window → final → closed` (+ `cancelled`, `escalated`). Invalid transitions rejected at the domain layer.
- FR-C5: Surveyor dispatch with zone assignment; surveyor can accept/decline with reason; evidence submission works with intermittent connectivity (client-side queue).

**FR-FAULT**
- FR-F1: Liability matrix: accident scenario taxonomy → default fault split; versioned; editable by admin with effective dates.
- FR-F2: Adjudicator confirms/overrides proposal; override requires justification text.
- FR-F3: Parties notified of decision; objection window 72h; objection escalates to senior adjudicator; one appeal level.
- FR-F4: Final report: signed PDF (Arabic RTL) with unique report number + QR verification URL; publicly verifiable (report authenticity only, no personal data exposed).

**FR-CLAIM**
- FR-CL1: Claim auto-created for each not-at-fault party against at-fault party's insurer upon final report.
- FR-CL2: Insurer console: accept, request-info, approve (full/partial), reject — every decision carries a reason code; SLA timers per stage.
- FR-CL3: Damage estimates: itemized (part, operation, labor hours, price), against reference price list; deviations >X% flagged.
- FR-CL4: Claimant sees a live status timeline; every stage change triggers SMS.
- FR-CL5: Settlement recorded as repair order (to accredited workshop) or cash compensation (amount, method, date).

**FR-DATA**
- FR-D1: Regulator dashboard: claims volume, average settlement time, SLA breaches per insurer, fraud flags — aggregate only.
- FR-D2: Authority dashboard: accident heatmap, black-spot ranking, time-of-day/severity breakdowns.
- FR-D3: Data export (CSV) for authorized roles.

**FR-SYS**
- FR-S1: Full Arabic (RTL) primary UI + English secondary; all reference data bilingual.
- FR-S2: All external integrations behind adapter interfaces with manual-mode fallback (traffic registry, insurer APIs, SMS gateway, payments).
- FR-S3: Media storage with hash-based integrity verification and duplicate detection across cases.

### B.7 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | 99.5% target; graceful degradation — reporting works even if analytics/notification subsystems are down |
| **Performance** | API p95 < 500 ms; report PDF generation < 10 s; photo upload resumable, tolerant of 2G/3G |
| **Bandwidth** | Client-side image compression before upload (~200–400 KB/photo); SPA initial bundle < 300 KB gzipped; aggressive caching |
| **Offline tolerance** | Accident wizard and surveyor evidence capture queue locally and sync when connectivity returns |
| **Security** | Sanctum token auth, TLS everywhere, encrypted media at rest, OWASP Top 10 hardening, rate limiting, signed URLs for media, immutable audit log |
| **Privacy** | Personal data visible only to case parties + assigned staff; regulator/authority see aggregates; QR verification exposes authenticity only |
| **Integrity** | Evidence immutability (no edit/delete after case submission — only supersede), SHA-256 hashes stored, every mutation audited |
| **Scalability** | Stateless API behind load balancer; MySQL read replicas path; queue workers (Redis) for media, PDF, SMS, analytics |
| **Localization** | Arabic-first RTL, Hijri/Gregorian dual dates where customary, Syrian plate formats, SYP currency with inflation-aware price lists |
| **Usability** | Accident wizard completable in < 5 min by a stressed non-technical user; WCAG AA contrast; works on low-end Android browsers |
| **Auditability** | Every fault decision reconstructable: evidence set, matrix version, adjudicator, justification, timestamps |
| **Maintainability** | Versioned REST API (`/api/v1`), feature flags, seeded reference data, ≥80% test coverage on domain logic (state machine, liability matrix, claims) |

### B.8 Innovative Features (differentiators beyond Najm)

1. **Guided evidence capture with overlay frames** — the wizard shows ghost outlines ("stand here, frame the two cars and the road") so untrained citizens produce surveyor-grade evidence. Najm relies on trained staff; we encode the training into the UI.
2. **Two-sided case merging** — both drivers contribute to one case via SMS deep link; the system diffs their accounts and auto-highlights contradictions for the adjudicator. Reduces "he said/she said" and staged-accident fraud.
3. **Codified, versioned liability matrix with human-in-the-loop** — transparent fault rules published openly (drivers can see *why* a determination was made, with the rule cited). Builds trust in a low-trust institutional environment; Najm's logic is a black box to users.
4. **QR-verifiable reports** — any insurer, court, or checkpoint can scan a report's QR to confirm authenticity, killing forged paper reports; aligned with SISC's 2024 QR e-policy direction.
5. **Offline-first field operations** — surveyor evidence queue survives connectivity loss; designed for Syrian infrastructure reality rather than assuming Najm-grade telecom.
6. **Photo-hash fraud net** — every image hashed; the same damage photo appearing in two cases (a common regional fraud) is auto-flagged.
7. **Inflation-aware parts price reference** — versioned price lists with effective dates so estimates stay meaningful in SYP volatility; deviation flags protect both insurer and claimant.
8. **Progressive integration adapters** — every government/insurer dependency ships in manual mode with a clean interface; the platform is deployable *today* and upgrades to full automation without re-architecture. This is the core thesis: *Najm assumes infrastructure; we bootstrap it.*
9. **Road-safety data product** — black-spot heatmaps offered to municipalities/Ministry of Transport, turning claims exhaust into public value (Civil Defense responded to ~3,000 road accidents in 2025 — the data gap is real).
10. **Claim transparency timeline** — Uber-style status tracking for claims, with SLA clocks visible to the claimant and the regulator. Accountability by design.

### B.9 Explicit Scope Boundaries (for the graduation project)

**In scope:** modules 1–9, 12, 13 core flows; SMS mocked behind adapter; single-city pilot assumption (Damascus).
**Out of scope / future:** real government API integration, payments execution (recorded, not moved), injury/medical claims, mobile native apps (responsive web only), AI damage estimation from photos (documented as future work).

---

*Next suggested steps: (1) ERD + database schema, (2) case-lifecycle state machine diagram, (3) API surface design, (4) repo scaffolding.*
