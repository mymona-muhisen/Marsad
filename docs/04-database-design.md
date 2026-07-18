# Masar — Database Design (MySQL 8)
## Document 04 — Physical Model, Normalization, Constraints, Indexes, Migration Plan

**Version:** 1.0 · July 2026 · Companion ERD: `04a-erd-physical.puml`

---

## 1. Global Design Decisions (apply to every table)

| # | Decision | Rationale |
|---|---|---|
| G1 | **PK = `BIGINT UNSIGNED AUTO_INCREMENT` (`id`)** everywhere | Laravel convention, compact FK joins, index locality. UUIDs as PKs fragment InnoDB clustered indexes. |
| G2 | **Public identifiers are separate columns** (`case_no`, `report_no`, `qr_token`) | Sequential ids must never appear in URLs/SMS (enumeration attack: guessing case ids). Public codes are random/checksummed; internal joins stay on bigint. |
| G3 | **Status enums = `VARCHAR(30)` + `CHECK` constraint + PHP backed enum** — not MySQL `ENUM` | MySQL `ENUM` requires table ALTER to add values (locks big tables) and behaves badly on invalid input. `VARCHAR + CHECK` (supported since MySQL 8.0.16) keeps DB-level integrity; the PHP enum is the single source of truth in code. |
| G4 | **No soft deletes in the case/claim chain; status columns instead** | Evidence, decisions, reports, claims are legally significant — rows are never deleted, they change state (`cancelled`, `superseded`). `deleted_at` only on `vehicles` (user-managed registry; must survive in old cases via FK even when "deleted" from the user's garage — soft delete does exactly that). |
| G5 | **`ON DELETE RESTRICT` as default FK action** | The integrity chain (case → decision → report → claim → settlement) must never lose links. `CASCADE` only where the child has no independent legal meaning (`estimate_items`, `user_roles`). |
| G6 | **Money = `DECIMAL(14,2)`, currency = SYP implicit** | Floats are forbidden for money. 14 digits ≈ 999 billion SYP headroom (inflation-proof for a pilot). Multi-currency deferred: a `currency` column can be added without restructuring. |
| G7 | **Timestamps:** `created_at`/`updated_at` on all mutable tables; append-only tables (`claim_events`, `audit_logs`) get `created_at` only | Append-only rows are never updated — `updated_at` would be a lie. |
| G8 | **Location = `lat`/`lng` `DECIMAL(10,7)` + composite index, not `POINT`** | Pilot query patterns (heatmap bounding boxes) work fine with B-tree on (lat,lng). `POINT` + SPATIAL index is documented as an upgrade when radius queries arrive; avoids SRID complexity now. |
| G9 | **Character set `utf8mb4` / collation `utf8mb4_unicode_ci`** | Full Arabic + emoji support in statements. |
| G10 | **Derived values stored only twice** (`damage_estimates.total`, `estimate_items.line_total`) — everything else computed | Deliberate, guarded denormalization: totals are recalculated and asserted at the service layer on every item change; storing them avoids re-summing on every list view and freezes the legally agreed figure. Documented as the only 3NF deviation (§4). |

---

## 2. Table Catalog (normalized, 3NF)

Notation: **bold** = NOT NULL. `UQ` = unique, `IX` = index, `CK` = check constraint. All tables have `id BIGINT UNSIGNED PK` and (per G7) timestamps unless stated.

### 2.1 Identity & Organizations

**`organizations`**
| Column | Type | Constraints |
|---|---|---|
| **name_ar** | VARCHAR(150) | |
| name_en | VARCHAR(150) | nullable |
| **type** | VARCHAR(30) | CK: insurer, workshop, assessor_office, regulator, authority |
| license_no | VARCHAR(50) | nullable, UQ with type: `UQ(type, license_no)` |
| **status** | VARCHAR(20) | CK: active, suspended · default active |

*Decision:* one table for all five org kinds (insurer, workshop…) instead of five tables — they share identity, licensing, membership, and status behavior; `type` + role scoping covers the differences. Adding a sixth kind is a seed row, not a migration.

**`users`**
| Column | Type | Constraints |
|---|---|---|
| **full_name** | VARCHAR(120) | |
| **phone** | VARCHAR(20) | **UQ** (login identifier) |
| email | VARCHAR(120) | nullable, UQ |
| national_id | VARCHAR(20) | nullable, UQ (required before payout — enforced in service layer, not DB, because onboarding must stay frictionless) |
| **password** | VARCHAR(255) | hashed |
| organization_id | FK → organizations | nullable (citizens have none), RESTRICT |
| zone | VARCHAR(80) | nullable — implementation addition, Sprint 4 (see DECISIONS.md): a surveyor's home zone for dispatch assignment (FR-C5); meaningless for non-surveyor roles |
| **locale** | CHAR(2) | CK: ar, en · default ar |
| **status** | VARCHAR(20) | CK: active, suspended · default active |
| phone_verified_at | TIMESTAMP | nullable (OTP proof) |

**`roles`** — **name** VARCHAR(50) UQ, guard_name (spatie-compatible).
**`user_roles`** — **user_id** FK CASCADE, **role_id** FK CASCADE, `PK(user_id, role_id)`.

*Decision:* pivot PK is composite — no surrogate id; duplicates impossible by construction. CASCADE is safe: losing a role assignment when a user/role is removed has no legal meaning.

**`otp_codes`** *(implementation addition, Sprint 1 — not in the original 22-table catalog)*
| Column | Type | Constraints |
|---|---|---|
| **phone** | VARCHAR(20) | IX(phone, consumed_at) |
| **code_hash** | VARCHAR(255) | hashed OTP, never stored in plaintext |
| full_name | VARCHAR(120) | nullable — staged for user creation on first verify |
| **attempts** | TINYINT UNSIGNED | default 0 |
| **expires_at** | TIMESTAMP | |
| consumed_at | TIMESTAMP | nullable |

*Decision:* FR-A1 requires phone+OTP registration/login but doc 04 §2.1 had no table to hold in-flight OTP challenges. Added as a plain mutable table (not part of the case/claim integrity chain, so none of the append-only/versioning rules apply). See DECISIONS.md 2026-07-12.

### 2.2 Registry

**`vehicles`** *(soft deletes — G4)*
| Column | Type | Constraints |
|---|---|---|
| **owner_id** | FK → users | RESTRICT |
| **plate_no** | VARCHAR(20) | **UQ** (active rows; see note) |
| vin | VARCHAR(30) | nullable, UQ |
| **make / model** | VARCHAR(50) | |
| year | SMALLINT UNSIGNED | nullable, CK: 1950–2030 |
| color | VARCHAR(30) | nullable |
| deleted_at | TIMESTAMP | nullable |

*Note:* MySQL can't do partial unique indexes; `UQ(plate_no)` stays absolute and re-registration of a soft-deleted plate is handled by restoring the row — simpler than plate history tables and honest about the domain (a plate is one vehicle).

**`insurance_policies`**
| Column | Type | Constraints |
|---|---|---|
| **vehicle_id** | FK → vehicles | RESTRICT |
| **insurer_org_id** | FK → organizations | RESTRICT |
| **policy_no** | VARCHAR(50) | `UQ(insurer_org_id, policy_no)` |
| **type** | VARCHAR(30) | CK: compulsory_tpl, comprehensive |
| **start_date / end_date** | DATE | CK: end_date > start_date |
| **verification_status** | VARCHAR(20) | CK: unverified, pending, verified, rejected · default unverified |
| verified_by | FK → users | nullable, RESTRICT |
| verified_at | TIMESTAMP | nullable |
| document_path | VARCHAR(255) | nullable |
| IX | | `IX(vehicle_id, end_date)` — "active policy for vehicle X" lookup |

*Decision:* policy uniqueness is **per insurer** (`UQ(insurer_org_id, policy_no)`) — two companies can coincidentally issue the same number. Overlapping-policy prevention is a service-layer rule (needs date-range logic MySQL constraints can't express).

### 2.3 Case Core

**`accident_cases`**
| Column | Type | Constraints |
|---|---|---|
| **case_no** | CHAR(12) | **UQ** — format `MC-YY-XXXXXX`, random suffix (G2) |
| **reported_by** | FK → users | RESTRICT |
| **channel** | VARCHAR(20) | CK: self, hotline, surveyor |
| **status** | VARCHAR(30) | CK: 12 states (draft, submitted, under_review, awaiting_counterparty, evidence_complete, adjudication, decision_issued, objection_window, final, closed, cancelled, escalated) · default draft |
| **track** | VARCHAR(30) | CK: fast_track, dispatch_required, police_required · nullable until triage |
| **occurred_at** | DATETIME | |
| **lat / lng** | DECIMAL(10,7) | |
| **location_verified** | BOOLEAN | default true; false when manual pin without GPS |
| region | VARCHAR(80) | nullable, IX (heatmap grouping) |
| **injury_flag** | BOOLEAN | default false |
| police_report_ref | VARCHAR(50) | nullable (required by service layer when track = police_required) |
| one_sided_flag | BOOLEAN | default false |
| IX | | `IX(status, created_at)` — adjudication queue · `IX(lat, lng)` — heatmap · `IX(occurred_at)` — analytics |

*Decision:* the 12-state machine lives in a PHP enum with an allowed-transitions map; the DB CHECK only guards the value set. Transition legality is application logic (DBs can't validate state *transitions*, only states).

**`case_parties`**
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | RESTRICT |
| user_id | FK → users | **nullable** — counterparty may never register |
| vehicle_id | FK → vehicles | nullable — unregistered/fled vehicle |
| policy_id | FK → insurance_policies | nullable — uninsured party |
| **role** | VARCHAR(20) | CK: reporter, counterparty |
| unregistered_plate | VARCHAR(20) | nullable — manually entered plate when vehicle_id is null |
| unregistered_phone | VARCHAR(20) | nullable |
| statement_text | TEXT | nullable |
| joined_at | TIMESTAMP | nullable |
| join_token | VARCHAR(64) | nullable, **UQ** — implementation addition, Sprint 3 (see DECISIONS.md): the counterparty's signed, expiring deep-link credential |
| join_token_expires_at | TIMESTAMP | nullable — 24h from case creation; nulled on join or on `masar:flag-one-sided-cases` expiry |
| UQ | | `UQ(case_id, role)` for the pilot's 2-party scope — dropped when multi-vehicle lands |

*Decision — the nullable triple is the "verification-flexible" pillar in schema form:* hit-and-run = all three null + `unregistered_plate`; uninsured = policy null. Every real-world degraded case is representable without dummy rows.

**`evidence_items`** *(append-only)*
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | RESTRICT |
| party_id | FK → case_parties | nullable (surveyor evidence belongs to the case, not a party) |
| **uploaded_by** | FK → users | RESTRICT |
| **type** | VARCHAR(20) | CK: photo, voice, sketch, document |
| **file_path** | VARCHAR(255) | |
| **sha256** | CHAR(64) | **IX** — the fraud net: duplicate detection = index lookup |
| idempotency_key | UUID | nullable, `UQ(case_id, idempotency_key)` — implementation addition, Sprint 4 (see DECISIONS.md): client-generated UUID per file so a retried offline upload doesn't duplicate |
| lat / lng | DECIMAL(10,7) | nullable |
| **captured_at** | DATETIME | |
| superseded_by | FK → evidence_items | nullable, self-reference (G4: no deletes — supersede) |

**`dispatches`**
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | RESTRICT |
| **surveyor_id** | FK → users | RESTRICT |
| **zone** | VARCHAR(80) | |
| **status** | VARCHAR(20) | CK: assigned, accepted, declined, on_scene, completed |
| decline_reason | VARCHAR(255) | nullable |
| assigned_at / accepted_at / completed_at | TIMESTAMP | assigned_at NOT NULL |
| IX | | `IX(surveyor_id, status)` — surveyor's active queue |

*Decision:* multiple dispatch rows per case are allowed (decline → reassign creates a new row) — the full assignment history is the accountability record; no overwriting.

**`fraud_flags`** *(append-only, implementation addition — Sprint 3, not in the original 22-table catalog)*
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | RESTRICT — the case where the new upload happened |
| **evidence_item_id** | FK → evidence_items | RESTRICT — the newly-uploaded item that triggered the flag |
| **matched_evidence_item_id** | FK → evidence_items | RESTRICT — the pre-existing item elsewhere with the same hash |
| **reason** | VARCHAR(50) | e.g. `duplicate_photo_hash` |
| **created_at** | TIMESTAMP | append-only — no `updated_at` |

*Decision:* CLAUDE.md rule #3 requires a fraud flag when a duplicate SHA-256 hash is found in another case. A dedicated table (rather than metadata on `evidence_items`) keeps `evidence_items` genuinely append-only while still allowing a flag's own lifecycle (e.g., an ops reviewer dismissing a false positive, Sprint 7) and gives Sprint 7's fraud-flags ops list a clean, independently queryable source. See DECISIONS.md 2026-07-17.

### 2.4 Fault & Reports

**`liability_rules`** *(versioned reference data)*
| Column | Type | Constraints |
|---|---|---|
| **scenario_code** | VARCHAR(30) | `UQ(scenario_code, version)` |
| **description_ar** | TEXT | |
| **fault_split_a / fault_split_b** | TINYINT UNSIGNED | CK: a + b = 100 |
| **version** | INT UNSIGNED | |
| **effective_from** | DATE | |
| effective_to | DATE | nullable = current version |

**`fault_decisions`**
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | **UQ** — exactly one decision per case (1:1) |
| rule_id | FK → liability_rules | nullable (MANUAL scenario), RESTRICT |
| **adjudicator_id** | FK → users | RESTRICT |
| **status** | VARCHAR(20) | CK: proposed, confirmed, objected, final |
| **was_overridden** | BOOLEAN | default false |
| justification | TEXT | nullable (service layer: NOT NULL when was_overridden or rule_id is null) |
| **decided_at** | DATETIME | |

*Decision:* `rule_id` pins the exact **rule version** used — with `liability_rules` never being updated in place (new version rows instead), every historical decision reconstructs exactly (NFR auditability). This is why rules are versioned rows, not editable rows.

**`fault_allocations`**
| **decision_id** FK CASCADE · **party_id** FK → case_parties RESTRICT · **percentage** TINYINT CK 0–100 · `UQ(decision_id, party_id)` |

*Decision:* CASCADE from decision is acceptable — allocations are meaningless without their decision, and decisions are never deleted anyway (belt + suspenders). Service layer asserts Σ percentage = 100 per decision (cross-row sums are not expressible as MySQL constraints).

**`objections`**
| **decision_id** FK RESTRICT · **party_id** FK RESTRICT · **reason** TEXT · **status** VARCHAR(20) CK: open, upheld, dismissed · reviewed_by FK users nullable · resolution_note TEXT nullable · resolved_at | `UQ(decision_id, party_id)` — one objection per party per decision (the single-appeal-level rule, in schema) |

**`reports`**
| **case_id** FK RESTRICT (plain index, not UQ — see implementation note below) · **report_no** CHAR(14) **UQ** · **pdf_path** VARCHAR(255) · **qr_token** CHAR(36) **UQ** (UUIDv4 — public, unguessable, G2) · **signed_hash** CHAR(64) · **status** VARCHAR(20) CK: active, superseded · superseded_by FK reports nullable · **issued_at** DATETIME |

*Decision:* appeal outcomes issue a **new** report row and mark the old one `superseded` — the QR of a stale printed report answers "superseded by report N" (UC-07 ext. 2b) precisely because old rows survive.

*Implementation note (Sprint 5, see DECISIONS.md):* `case_id` is **not** a strict UQ as originally written above — a literal per-case UQ and the "new report row on appeal" decision in the same paragraph are mutually exclusive (MySQL can't express "at most one *active* row per case" as a partial unique index, the same limitation already noted for `vehicles.plate_no`). Implemented as a plain index; "at most one active report per case" is a service-layer invariant (`ReportService::generate()`), not a DB constraint.

### 2.5 Claims & Settlement

**`claims`**
| Column | Type | Constraints |
|---|---|---|
| **case_id** | FK → accident_cases | RESTRICT |
| **claimant_party_id** | FK → case_parties | RESTRICT, `UQ(case_id, claimant_party_id)` — one claim per party per case |
| **insurer_org_id** | FK → organizations | RESTRICT |
| **status** | VARCHAR(30) | CK: opened, info_requested, assessing, approved, partially_approved, rejected, settled, closed |
| **sla_due_at** | DATETIME | IX — regulator breach query |
| IX | | `IX(insurer_org_id, status)` — the insurer console's main query |

**`claim_events`** *(append-only timeline)*
| **claim_id** FK RESTRICT · actor_id FK users RESTRICT, nullable (see implementation note) · **action** VARCHAR(40) · reason_code VARCHAR(20) nullable · note TEXT nullable · **created_at** · IX(claim_id, created_at) |

*Decision:* the claimant-visible timeline and SLA measurement both read this table — status alone loses history ("when did it enter assessing?"). Append-only, no updates ever.

*Implementation note (Sprint 6, see DECISIONS.md):* `actor_id` is nullable, not NOT NULL as originally written above — some events are genuinely system-generated (claim auto-open on case finalization, scheduled SLA-breach flagging) with no human actor to attribute them to. Forcing a fabricated human FK there would misrepresent the audit trail rather than strengthen it. Human-triggered events (decided, estimate_submitted, settled, closed) still always carry a real `actor_id`.

**`damage_estimates`**
| **claim_id** FK RESTRICT · **submitted_by** FK users RESTRICT · org_id FK organizations nullable · **type** VARCHAR(20) CK: workshop, assessor, desk · **status** VARCHAR(20) CK: draft, submitted, accepted, rejected · **total** DECIMAL(14,2) (G10) |

**`estimate_items`**
| **estimate_id** FK **CASCADE** · part_price_id FK → parts_prices nullable RESTRICT · **description** VARCHAR(150) · **qty** SMALLINT UNSIGNED · **unit_price** DECIMAL(12,2) · labor_hours DECIMAL(5,2) nullable · **line_total** DECIMAL(14,2) · **deviation_flag** BOOLEAN default false |

*Decision:* CASCADE here is correct — items are pure composition of a draft estimate; deleting a draft estimate legitimately removes its lines. Submitted estimates are never deleted (status transitions only), so the cascade can only ever fire on drafts.

**`parts_prices`** *(versioned reference data — same pattern as liability_rules)*
| **part_code** VARCHAR(30) · **name_ar** VARCHAR(120) · **reference_price** DECIMAL(12,2) · **version** INT UNSIGNED · **effective_from** DATE · `UQ(part_code, version)` |

**`settlements`**
| **claim_id** FK **UQ** RESTRICT (1:1) · **mode** VARCHAR(20) CK: repair_order, cash · **amount** DECIMAL(14,2) · workshop_org_id FK organizations nullable (service layer: NOT NULL when mode = repair_order) · **settled_at** DATETIME |

### 2.6 Cross-Cutting

**`notifications`** *(pulled early into Sprint 2 for FR-R4 policy-expiry reminders — see DECISIONS.md)*
| **user_id** FK CASCADE · **channel** VARCHAR(10) CK: sms, inapp · **template** VARCHAR(50) · **payload** JSON · sent_at TIMESTAMP nullable · read_at TIMESTAMP nullable · IX(user_id, read_at) |

**`audit_logs`** *(append-only)*
| **user_id** FK RESTRICT · **action** VARCHAR(60) · **entity_type** VARCHAR(60) · **entity_id** BIGINT UNSIGNED · changes JSON · **created_at** · IX(entity_type, entity_id) |

*Decision — the one polymorphic reference in the schema:* `entity_type/entity_id` has no FK. Acceptable only here: audit rows are diagnostic, never joined for business logic, and must be able to reference *any* table including future ones. Everywhere else polymorphism was rejected in favor of real FKs.

---

## 3. Relationship Summary

| Relationship | Cardinality | FK action |
|---|---|---|
| organizations → users | 1:N (nullable) | RESTRICT |
| users ↔ roles | M:N via user_roles | CASCADE |
| users → vehicles | 1:N | RESTRICT |
| vehicles → insurance_policies | 1:N | RESTRICT |
| organizations → insurance_policies (issuer) | 1:N | RESTRICT |
| accident_cases → case_parties | 1:N (2 in pilot) | RESTRICT |
| case_parties → users/vehicles/policies | N:1 each, all nullable | RESTRICT |
| accident_cases → evidence_items | 1:N | RESTRICT |
| accident_cases → dispatches | 1:N | RESTRICT |
| accident_cases → fault_decisions | **1:0..1** (UQ on FK) | RESTRICT |
| fault_decisions → fault_allocations | 1:N | CASCADE |
| fault_decisions → objections | 1:N (max 1/party via UQ) | RESTRICT |
| liability_rules → fault_decisions | 1:N (version-pinned) | RESTRICT |
| accident_cases → reports | 1:0..1 active (+ superseded chain) | RESTRICT |
| accident_cases → claims | 1:N | RESTRICT |
| claims → claim_events / damage_estimates | 1:N | RESTRICT |
| damage_estimates → estimate_items | 1:N | CASCADE |
| parts_prices → estimate_items | 1:N (version-pinned) | RESTRICT |
| claims → settlements | 1:0..1 (UQ on FK) | RESTRICT |

1:1 relationships are implemented as **UNIQUE FK on the child**, never merged into the parent: `fault_decisions`, `reports`, `settlements` have different lifecycles, writers, and permission scopes than their parents — merging them would bloat `accident_cases` with 20 mostly-null columns and blur the audit story.

---

## 4. Normalization Proof (to 3NF)

**1NF** — every column atomic: statements are single TEXT values; multi-photo evidence is *rows* in `evidence_items`, not a JSON array on the case; multi-party is rows in `case_parties`. The only JSON columns (`audit_logs.changes`, `notifications.payload`) hold genuinely schema-less diagnostic blobs never queried by key — a standard, documented exception.

**2NF** — no partial dependencies: every table has a single-column surrogate PK except `user_roles`, whose non-key attributes are none (pure association), so 2NF holds trivially.

**3NF** — no transitive dependencies; the interesting cases:

1. *Part prices:* `estimate_items.unit_price` could be derived from part → price, creating `item → part → price` transitivity. Resolved by `parts_prices` as versioned rows and `part_price_id` pinning the exact version; `unit_price` on the item is then **not** derivable (workshop may quote off-list — that's what `deviation_flag` detects), so no violation.
2. *Insurer on claims:* `claims.insurer_org_id` looks derivable via claimant → counterparty's policy → insurer. It is deliberately materialized because the at-fault party's policy linkage can be null (uninsured) and the responsible insurer may be assigned via the compulsory pool — an independent business fact, not a derivation. No transitive dependency exists.
3. *Fault splits:* percentages live only in `fault_allocations` (per party), never on the decision or case — no duplication between rule defaults (`liability_rules`) and applied outcomes.
4. *Totals* (`estimates.total`, `items.line_total`) — the **only knowing 3NF deviations** (G10): derivable from children, stored to freeze legally agreed figures and avoid aggregate queries on hot lists; integrity guarded by service-layer recalculation + assertion inside the same DB transaction as any item mutation.

---

## 5. Index Strategy (beyond PK/UQ/FK-auto)

| Index | Query it serves |
|---|---|
| `evidence_items(sha256)` | fraud: duplicate photo across cases — O(log n) lookup on upload |
| `accident_cases(status, created_at)` | adjudication/ops queues: "oldest submitted first" |
| `accident_cases(lat, lng)` | heatmap bounding boxes |
| `accident_cases(occurred_at)` | time-series analytics |
| `claims(insurer_org_id, status)` | insurer console default view |
| `claims(sla_due_at)` | regulator breach sweep (queued job) |
| `claim_events(claim_id, created_at)` | timeline render in order |
| `dispatches(surveyor_id, status)` | surveyor's active assignments |
| `insurance_policies(vehicle_id, end_date)` | "active policy now" at report time |
| `notifications(user_id, read_at)` | unread badge |
| `audit_logs(entity_type, entity_id)` | entity history view |

Principle: every index answers a **named query** from Docs 01–02; nothing speculative (each index taxes writes, and intake is write-heavy).

---

## 6. Laravel Migration Plan (no code yet)

**Conventions:** one table per migration; Laravel timestamped names in dependency order; `foreignId()->constrained()` with explicit `restrictOnDelete()` / `cascadeOnDelete()`; CHECK constraints via `DB::statement` in the same migration (schema builder can't express them); charset/collation set in `config/database.php` (G9); never edit a shipped migration — additive migrations only after the schema is shared with teammates.

**Phase 1 — Foundation** (no cross-deps beyond Laravel defaults)
1. `create_organizations_table`
2. `create_users_table` (Laravel's default, modified: phone UQ, organization_id FK, locale, status) + `password_reset_tokens`, `personal_access_tokens` (Sanctum)
3. `create_roles_and_user_roles_tables` (or install spatie/laravel-permission's published migration — decide at implementation; plan assumes spatie)

**Phase 2 — Registry**
4. `create_vehicles_table` (softDeletes)
5. `create_insurance_policies_table`

**Phase 3 — Case core** (depends on 1+2)
6. `create_accident_cases_table`
7. `create_case_parties_table`
8. `create_evidence_items_table` (self-FK `superseded_by` added in same migration, nullable)
9. `create_dispatches_table`

**Phase 4 — Fault** (depends on 3)
10. `create_liability_rules_table`
11. `create_fault_decisions_table`
12. `create_fault_allocations_table`
13. `create_objections_table`
14. `create_reports_table` (self-FK `superseded_by` nullable)

**Phase 5 — Claims** (depends on 4)
15. `create_claims_table`
16. `create_claim_events_table`
17. `create_parts_prices_table`
18. `create_damage_estimates_table`
19. `create_estimate_items_table`
20. `create_settlements_table`

**Phase 6 — Cross-cutting**
21. `create_notifications_table`
22. `create_audit_logs_table`

**Phase 7 — Seeders** (order matters)
`RoleSeeder` (13 roles) → `OrganizationSeeder` (pilot insurers, SISC, traffic authority, sample workshops) → `LiabilityRuleSeeder` (v1 scenario matrix — the seed data *is* a project deliverable, drafted with the domain expert) → `PartsPriceSeeder` (v1 reference list) → `DemoSeeder` (dev-only: users, vehicles, policies, a walkthrough case in every lifecycle state for UI development).

**Why this ordering:** phases mirror FK dependency direction, so `migrate:fresh` always succeeds and each phase is independently testable; it also matches the build order of the API itself (auth → registry → cases → fault → claims), so each sprint's migrations land with its features rather than as one big up-front schema drop.

---

*Next suggested steps: generate the actual migrations + models + seeders (Phase 1–2 first), or API endpoint design. The updated physical ERD is in `04a-erd-physical.puml`.*
