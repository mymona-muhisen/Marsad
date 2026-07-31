# Marsad - Architecture Decisions

This document records architectural and implementation decisions made during development.

---

### 2026-07-12

**Decision:** Monorepo folders are `apps/api` (Laravel) and `apps/web` (React), exactly as specified in CLAUDE.md. Two empty placeholder folders (`Masar-Backend`, `Masar-Frontend`) that pre-existed in the repo were removed before scaffolding.

**Reason:** CLAUDE.md is the canonical source for repo layout; the placeholders had no content and conflicted with the documented convention. Confirmed with the project owner before deleting.

**Impact:** None — folders were empty.

---

### 2026-07-12

**Decision:** Target PHP 8.2 instead of PHP 8.3 for `apps/api` (composer.json `"php": "^8.2"`), matching the only PHP runtime available in this dev environment (XAMPP, PHP 8.2.12).

**Reason:** Laravel 12's minimum supported PHP version is 8.2, so this is fully compatible; no PHP 8.3 install is present locally. Revisit if/when the dev or CI environment is upgraded to 8.3.

**Impact:** No functional loss for this project's feature set. CI should still test against 8.3 in addition to 8.2 if possible, to catch drift early.

---

### 2026-07-12

**Decision:** Local/dev queue driver defaults to `database` instead of `redis` (no local Redis server is available in this environment); `.env.example` keeps `redis` documented as the production target and `config/queue.php`/`config/cache.php` remain env-driven so no code changes are needed to switch.

**Reason:** CLAUDE.md specifies Redis queues, but no Redis server is installed locally. The `database` driver gives equivalent queued-job semantics for development/tests without requiring new infrastructure.

**Impact:** Production/staging deployments must set `QUEUE_CONNECTION=redis` (and run a Redis server) via `.env`; no application code depends on the driver choice.

---

### 2026-07-12

**Decision:** Added a new `otp_codes` table (not part of doc 04's original 22-table catalog) to hold in-flight OTP challenges: `phone`, `code_hash`, `full_name` (nullable), `attempts`, `expires_at`, `consumed_at`. Doc 04 §2.1 updated in the same change.

**Reason:** FR-A1 (doc 01) requires phone + OTP registration/login, but no table in doc 04 models an OTP challenge. `full_name` is staged here at `/otp/request` time and only promoted to a real `users` row on successful `/otp/verify`, so a brand-new citizen never needs a separate "register" endpoint — the sprint 1 prompt asks for exactly two endpoints (`otp/request`, `otp/verify`).

**Impact:** New citizens must pass `full_name` on `/otp/request` (enforced by FormRequest, only when the phone isn't already a known user). `users.password` stays NOT NULL per doc 04; OTP-only citizens get a random unusable password hash generated at creation (nobody logs in with it — Sanctum tokens are the only citizen credential).

### 2026-07-12

**Decision:** `roles`/`user_roles` tables use spatie/laravel-permission's own published migration (polymorphic `model_has_roles`/`model_has_permissions`/`role_has_permissions` + `permissions` table) rather than hand-rolling the simplified non-polymorphic `roles`/`user_roles` pair described in doc 04 §2.1.

**Reason:** Doc 04 §6 Phase 1 step 3 explicitly leaves this open ("or install spatie/laravel-permission's published migration — decide at implementation; plan assumes spatie") and CLAUDE.md rule #8 non-negotiably mandates the real spatie/laravel-permission package (not a custom reimplementation) for AuthZ.

**Impact:** A few extra framework tables beyond doc 04's literal §2.1 description (`permissions`, `model_has_permissions`, `role_has_permissions`) exist in the schema; they are spatie package internals, not part of the 22-table business catalog, and are exercised only through the package's API (`HasRoles` trait, `Role`/`Permission` models).

---

### 2026-07-12

**Decision:** `phpunit.xml` runs the test suite against a real MySQL database (`masar_testing`) instead of Laravel's default in-memory SQLite.

**Reason:** Doc 04 decision G3 relies on `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` raw statements for every enum column — syntax SQLite's `ALTER TABLE` does not support (SQLite only allows CHECK constraints declared at `CREATE TABLE` time). Since every Phase 1+ migration uses this pattern, the schema is MySQL-only by design; testing against SQLite would silently skip constraint validation and diverge from what runs in dev/prod.

**Impact:** `masar_testing` must exist locally/in CI before running `php artisan test` (created alongside `masar` via the same `CREATE DATABASE` step). Tests are slightly slower than in-memory SQLite but exercise the real constraints doc 04 depends on.

---

### 2026-07-12 (Sprint 2)

**Decision:** `notifications` (doc 04 §2.6, originally Phase 6) is created in Sprint 2's migration batch instead of Sprint 7, and the `User` model's Laravel-native `Notifiable` trait was removed.

**Reason:** The Sprint 2 task list explicitly pulls `notifications` early for the policy-expiry-reminder feature (FR-R4) and pre-approves noting it here. Separately, Laravel's built-in `Notifiable` trait expects its own `notifications` table schema (`notifiable_type`/`notifiable_id`/`data` json) which conflicts with doc 04's custom schema (`user_id`/`channel`/`template`/`payload`) — keeping both would silently break `$user->notifications`. Removed `Notifiable` and added a plain `User::notifications(): HasMany` relation to `App\Models\Notification` instead.

**Impact:** Laravel's `Notification::send()`/`->notify()` facade/helpers are unavailable and unused; all outbound notifications go through the `SmsGateway` adapter + a direct `Notification::create()` row, matching CLAUDE.md rule #4 (adapter pattern, no vendor coupling).

---

### 2026-07-12 (Sprint 2)

**Decision:** Added `App\Contracts\PolicyVerifier` adapter (manual-mode default: `ManualPolicyVerifier`) wrapping the verify/reject transition on `insurance_policies`, bound in `AppServiceProvider` via `services.policy_verifier.driver` (default `manual`).

**Reason:** FR-R3 describes verification as "auto (insurer API) or manual (insurer back-office queue)" — CLAUDE.md rule #4 requires every external dependency behind an adapter with a manual default. Today only an insurer_agent's manual decision exists; a future `ApiPolicyVerifier` can call a real insurer API behind the same interface without touching callers.

**Impact:** `PolicyService::verify()/reject()` always go through the bound `PolicyVerifier`, never touch `verification_status` directly.

---

### 2026-07-12 (Sprint 2)

**Decision:** `PolicyService::attach()` sets a newly-attached policy's `verification_status` straight to `pending` (not the schema default `unverified`), since submitting a policy (photo/QR + form) is itself what puts it in the insurer's review queue that `GET /api/v1/insurer/policies?status=pending` reads from. No separate "submit for review" step exists. `unverified` remains the column's DB-level default but is not produced by any code path in this sprint. Policy rejection has no dedicated `reason` column (doc 04 doesn't define one, and — unlike claims — FR-R3 doesn't mandate reason codes for policies); the optional reason is folded into the SMS/notification message only, not persisted structurally.

**Reason:** Doc 04 §2.2 lists the state set (`unverified → pending → verified/rejected`) but Sprint 2's task list only specifies the two insurer-facing endpoints (list-pending, verify, reject), not an intermediate submission step.

**Impact:** If a future sprint needs a genuine "draft, not yet submitted" policy state, `unverified` is available and already modeled — no schema change needed, only a code path change.

---

### 2026-07-12 (Sprint 2)

**Decision:** Registered spatie/laravel-permission's `role`/`permission`/`role_or_permission` middleware aliases explicitly in `bootstrap/app.php`'s `withMiddleware()`, and added `Illuminate\Foundation\Auth\Access\AuthorizesRequests` to the base `app/Http/Controllers/Controller.php`.

**Reason:** Laravel 12's minimal skeleton ships a bare `Controller` class and an empty `withMiddleware()` closure — neither the `$this->authorize()` helper nor spatie's route middleware aliases are wired up automatically the way older Laravel skeletons did it. Both are needed for Sprint 2's `role:insurer_agent` route middleware and the `$this->authorize()` calls in `VehicleController`/`Insurer\PolicyController`.

**Impact:** Every future sprint needing role/permission-gated routes or controller-level `authorize()` calls already has this wired up; no per-sprint repetition needed.

---

### 2026-07-17 (Sprint 3)

**Decision:** Designed the full `CaseStatus` 12-state transition map (`CaseLifecycleService::TRANSITIONS`), since doc 04 §2.3 only lists the value set and names the general forward order (draft → submitted → under_review → awaiting_counterparty → evidence_complete → adjudication → decision_issued → objection_window → final → closed, plus cancelled/escalated) without an exhaustive allowed-transitions matrix. The implemented map:
- `draft → {submitted, cancelled}`
- `submitted → {under_review, cancelled}`
- `under_review → {awaiting_counterparty, evidence_complete, escalated, cancelled}` (the `evidence_complete` branch was originally for a declared hit-and-run with no counterparty to wait on; Sprint 4 revised this — see 2026-07-17 (Sprint 4) below — a hit-and-run is now also gated on any pending surveyor dispatch, since hit-and-run always triages to `dispatch_required`)
- `awaiting_counterparty → {evidence_complete, escalated, cancelled}`
- `evidence_complete → {adjudication, escalated}`
- `adjudication → {decision_issued, escalated}`
- `decision_issued → {objection_window}`
- `objection_window → {final, escalated}`
- `final → {closed}`
- `closed`, `cancelled` → terminal (no outbound transitions)
- `escalated → {under_review, awaiting_counterparty, evidence_complete, cancelled}` (a general re-entry point for disputes/anomalies — disputed identity, hit-and-run flagged for authority attention, etc. — that resolves back into the normal flow or to cancelled)

**Reason:** CLAUDE.md rule #2 requires a full allowed-transitions map and `CaseLifecycleService::transition()` to reject anything not in it; Sprint 3 explicitly requires unit-testing the *full* matrix (allowed and forbidden), which requires the map to actually be complete, not just the states Sprint 3 exercises. `escalated`'s reachability was inferred from UC-01 ext. 5a (hit-and-run → "flagged for authority attention") and UC-02 ext. 2a/4a (phone mismatch / disputed identity → "manual review" / "forced dispatch/authority path") — doc 04 does not name a dedicated status for these, so they map onto the general-purpose `escalated` state at the case level (distinct from `fault_decisions.status = objected`, which is the Fault module's own appeal state, built in Sprint 5).

**Impact:** Sprints 4–7 build the adjudication/fault/claims flows on top of `evidence_complete → adjudication → decision_issued → objection_window → final → closed` without needing to touch this map. If a future sprint finds a transition the map doesn't allow, extend `CaseLifecycleService::TRANSITIONS` and update this entry + the full-matrix test together, per doc 04's "deviations require updating that doc" rule (applies here to the map's documented design, not doc 04 itself, since the map was never in doc 04 to begin with).

---

### 2026-07-17 (Sprint 3)

**Decision:** Added a new `fraud_flags` table (not in doc 04's original 22-table catalog): `case_id`, `evidence_item_id` (the newly-uploaded item), `matched_evidence_item_id` (the pre-existing item elsewhere with the same hash), `reason`, append-only `created_at`. Doc 04 §2.3 updated in the same change.

**Reason:** CLAUDE.md rule #3 requires that a duplicate SHA-256 hash found in another case "creates a fraud flag" — Sprint 3's own task list says to "decide, document" between a dedicated table or evidence-item metadata. A dedicated table was chosen over cramming flag state onto `evidence_items` because (a) `evidence_items` is append-only and a flag can legitimately need updates later (e.g., an ops reviewer dismissing a false positive, Sprint 7), and (b) Sprint 7's "fraud flags list for ops" analytics endpoint needs a clean, independently queryable log rather than scanning evidence rows for a side-channel flag.

**Impact:** `EvidenceService::storeOne()` checks for a same-hash row in a different case on every upload and writes one `fraud_flags` row per match found; nothing currently reads this table besides the two Sprint 3 tests, until Sprint 7 builds the ops list view.

---

### 2026-07-17 (Sprint 3)

**Decision:** Added `join_token` (nullable, unique, 64 chars) and `join_token_expires_at` (nullable timestamp) to `case_parties` (not in doc 04's original §2.3 description). Doc 04 §2.3 updated in the same change. The counterparty's join credential is a `Str::random(64)` opaque token, not an HMAC-signed payload — consistent with how Sanctum's plaintext tokens and `reports.qr_token` already work elsewhere in this schema.

**Reason:** FR-C2/UC-01 step 7 require a "signed, expiring deep-link token" for the counterparty invite, but doc 04 has no column to hold an in-flight join credential (case_parties only has `joined_at`, set once the join actually happens). Reusing the counterparty's own `case_parties` row (created eagerly at case-submission time with `role=counterparty` and every other field nullable, matching doc 04's own "verification-flexible... nullable triple" design) avoids inventing a whole separate token table for a single credential pair, the way `otp_codes` was justified as its own table in Sprint 1 (there, many concurrent OTP attempts per phone needed independent rows; here, the pilot's `UQ(case_id, role)` already guarantees exactly one counterparty row per case).

**Impact:** On successful join, `join_token`/`join_token_expires_at` are nulled to prevent reuse (a second POST with the same token 404s via `CaseService::findByJoinToken()`'s `firstOrFail()`). `masar:flag-one-sided-cases` also nulls them when the 24h window lapses, permanently closing the join window once the case has moved on.

---

### 2026-07-17 (Sprint 3)

**Decision:** On counterparty join (`CaseService::join()`), if the case was created with a manually-entered `counterparty_phone` and the authenticated joining user's phone doesn't match it, the join is rejected outright with a 422 validation error rather than being accepted with a soft "flagged for manual review" state.

**Reason:** UC-02 ext. 2a says a phone mismatch should raise "an identity flag... manual review," but no admin/staff console or review queue exists yet in this sprint (or any sprint through Sprint 7's ops tooling) to actually action such a flag — accepting the join anyway and silently marking a flag nobody can see or resolve would be worse than rejecting with a clear, actionable error the counterparty can retry (e.g., they mistyped their own number, or the reporter mistyped it).

**Impact:** A legitimate counterparty whose phone genuinely doesn't match what the reporter entered (typo on either side) cannot self-serve past this — they'd need call_center/admin assistance, which doesn't exist yet either. Revisit if a later sprint builds staff tooling that can consume a real "disputed identity" flag.

---

### 2026-07-17 (Sprint 3)

**Decision:** Evidence `lat`/`lng` are set from the parent case's `lat`/`lng` at upload time (not extracted from each photo's EXIF data or accepted as a distinct per-file field from the client).

**Reason:** Doc 04 says evidence rows "store geotag + captured_at," but Sprint 3 is a backend-only sprint — true per-photo geotag precision is a mobile/wizard (frontend) concern that belongs to Sprint 9's guided capture UI, which can pass distinct per-file coordinates once it exists. Extracting EXIF server-side would add an image-processing dependency for marginal accuracy gain over the case-level location already captured at report time.

**Impact:** All evidence for a given case currently shares one lat/lng pair (the case's own). `EvidenceService::storeOne()`'s `$lat`/`$lng` parameters already accept per-file overrides, so Sprint 9 can wire distinct coordinates through without a service-layer change.

---

### 2026-07-17 (Sprint 4)

**Decision:** Added `users.zone` (VARCHAR(80), nullable) — not in doc 04's original catalog. Doc 04 §2.1 updated in the same change.

**Reason:** FR-C5 requires assigning "the nearest available surveyor by zone," but doc 04 has no column anywhere recording which zone a surveyor belongs to (`accident_cases.region` exists for the case side, but nothing mirrors it on `users`). `config/zones.php` defines the pilot's flat zone-name list (no real geo-distance routing yet); `DispatchService::pickSurveyor()` matches a case's `region` directly against a surveyor's `zone` string.

**Impact:** Surveyor accounts must have `zone` set (e.g., via `OrganizationSeeder`/an admin screen, not built yet) to be preferentially matched; a surveyor with `zone = null` is still assignable as a fallback when no zone match exists in `pickSurveyor()`.

---

### 2026-07-17 (Sprint 4)

**Decision:** Added `evidence_items.idempotency_key` (UUID, nullable, `UQ(case_id, idempotency_key)`) — not in doc 04's original catalog. Doc 04 §2.3 updated in the same change.

**Reason:** Sprint 4 task 2 explicitly requires "idempotent uploads (client-generated UUID per file so retries don't duplicate) — this is the offline-tolerance contract for the frontend," and doc 04's `evidence_items` table has no column to detect a retried upload. `EvidenceService::storeOne()` now checks for an existing row with the same `(case_id, idempotency_key)` before creating a new one, returning the existing row on a repeat instead of inserting a duplicate.

**Impact:** Only surveyor dispatch uploads use this today (`DispatchController::complete()`); citizen/counterparty evidence uploads (Sprint 3) don't send a key and remain unaffected (`idempotency_key` stays null for them, and NULLs don't collide under MySQL's unique index semantics).

---

### 2026-07-17 (Sprint 4)

**Decision:** Reworked how `dispatch_required` cases reach `evidence_complete`, changing Sprint 3's original behavior:
1. A hit-and-run case (`hit_and_run=true`) no longer transitions to `evidence_complete` immediately at creation — since hit-and-run always triages to `dispatch_required` (config/triage.php), it now waits for the assigned surveyor's dispatch to complete, same as any other dispatch_required case. `one_sided_flag` is still set immediately (it's just descriptive metadata); only the lifecycle transition was deferred.
2. `CaseLifecycleService::canTransition()` (non-throwing check) was added, and every call site that can independently reach `evidence_complete` — `CaseService::join()`, `OneSidedCaseFlaggingService::run()`, and the new `DispatchService::complete()` — now guards its transition attempt with it instead of calling `transition()` unconditionally.
3. Case creation calls `DispatchService::assign()` when `track === dispatch_required`, right after the counterparty invite (or the hit-and-run party row) is created.

**Reason:** Sprint 3 always immediately transitioned hit-and-run cases to `evidence_complete`, which made the `dispatch_required` track meaningless for exactly the scenario it exists for (an unidentified counterparty needing independent surveyor documentation). Sprint 4 task 3 ("on-scene → completed transitions update case to evidence_complete via CaseLifecycleService") only specifies that the dispatch-completion event triggers this transition — it doesn't mandate that a counterparty-side resolution must also be blocked pending dispatch, or vice versa. Rather than building strict AND-semantics across two independent conditions (which would need tracking both explicitly, since a single `status` column can't represent "waiting on two things" as a state), a simpler design was chosen: whichever of {counterparty resolves, dispatch completes} happens first wins the transition; the second is a silent no-op via `canTransition()`, never an exception.

**Impact:** For a `dispatch_required` case with both a real counterparty invite *and* a surveyor dispatch in flight, the case can reach `evidence_complete` before the surveyor finishes, if the counterparty joins (or times out) first — the case does not wait for both. If a future sprint decides both must complete (e.g., to strengthen evidentiary requirements before adjudication), that requires either a new intermediate status or a dedicated boolean gate column, since the 12-state enum's value set is fixed by doc 04.

---

### 2026-07-18 (Sprint 5)

**Decision:** `reports.case_id` is a plain indexed column, not the strict `UNIQUE` doc 04 §2.4 literally specifies.

**Reason:** Doc 04 states both "`case_id` FK **UQ** RESTRICT (1:1)" *and*, in the same section's decision note, that "appeal outcomes issue a **new** report row and mark the old one `superseded`" — these two statements are mutually exclusive under a strict per-case UQ (MySQL can't express "at most one row where status=active" as a partial unique index, the same limitation doc 04 already acknowledges for `vehicles.plate_no`). Since the supersede-chain mechanism is an explicit, tested Sprint 5 deliverable (task 7), the UQ was dropped in favor of a plain index; "at most one **active** report per case" is enforced at the service layer instead (`ReportService::generate()` always looks up and closes out any existing active report before/after inserting the new one).

**Impact:** Nothing prevents a stray second `active` row via a raw DB write outside `ReportService`; all report creation must go through `ReportService::generate()` to preserve the invariant. `reports.case_id` keeps its FK/RESTRICT behavior, just not the uniqueness.

---

### 2026-07-18 (Sprint 5)

**Decision:** The report PDF is generated (`GenerateFaultReport` queued job) immediately when a fault decision is confirmed — i.e., at the `decision_issued` transition, *before* the case moves into `objection_window` — not gated on the case reaching the literal `final` status.

**Reason:** Sprint 5 task 5 says "queued job **on final**," which read literally would mean no report exists until after the 72h objection window closes or is resolved — but then the "supersede chain on appeal amendments" (also task 5) could never actually fire, since an objection-upheld amendment needs a *pre-existing* report to supersede. Doc 01 A.3's own Najm-workflow narrative supports the earlier-issuance reading too: report issuance (~24h) is described as preceding/overlapping the objection process, not gated behind it. "On final" is interpreted here as "once the fault-finding step is finalized/confirmed" (i.e., `decision_issued`), not literally `CaseStatus::Final`.

**Impact:** Every confirmed decision gets exactly one report immediately, whether or not it's later objected to. If upheld, `ObjectionService::resolve()` dispatches a second `GenerateFaultReport` job, and `ReportService::generate()` marks the first `superseded`. If dismissed or the window lapses untouched, the original report simply stays `active` — no second job runs.

---

### 2026-07-18 (Sprint 5)

**Decision:** `LiabilityRuleSeeder` seeds exactly 10 real scenario rows (`REAR_END`, `PRIORITY_VIOLATION`, `LANE_CHANGE`, `REVERSING`, `RED_LIGHT`, `PARKED_HIT`, `OPENING_DOOR`, `ROUNDABOUT`, `OVERTAKING`, `MERGING`) — "MANUAL" from the sprint task's example list is deliberately **not** a seeded row.

**Reason:** Doc 04 §2.4 explicitly justifies `fault_decisions.rule_id` being nullable as "(MANUAL scenario)" — i.e., MANUAL is represented by the *absence* of a rule (`rule_id = null`), not a row in `liability_rules`. Seeding a literal `MANUAL` row would contradict that schema decision and give `FaultDecisionService::decide()` two different ways to express the same thing. `MERGING` was added as the 10th real scenario to still satisfy "at least 10" once MANUAL is excluded.

**Impact:** `DecideFaultRequest`/`FaultDecisionService::decide()` treat `scenario_code = null` (not `"MANUAL"`) as the manual path — always `was_overridden = true`, justification always required.

---

### 2026-07-18 (Sprint 5)

**Decision:** `FaultDecisionService::decide()` is the *only* adjudication endpoint — it both proposes (resolves the rule's default split) and confirms (persists the decision) in one call, immediately writing `fault_decisions.status = confirmed`. The `proposed` value in `FaultDecisionStatus` stays a valid schema/CHECK value but is never produced by any code path this sprint.

**Reason:** Sprint 5 task 3 describes a single "decision endpoint pinning rule_id + matrix version" — not a separate propose-then-confirm round trip. Splitting it into two calls (preview, then persist) would need an ephemeral, never-persisted "proposal" concept the task doesn't ask for and doc 04 doesn't model with any extra column (e.g., no draft-allocations table). `proposed` remains in the enum for schema completeness/future use (e.g., if a later sprint adds a real system-auto-propose step ahead of adjudicator confirmation).

**Impact:** No test exercises `FaultDecisionStatus::Proposed` — this is intentional, not an oversight. A future sprint introducing a true two-step flow would need to add a persistence point for the proposed state and its own transition rules.

---

### 2026-07-18 (Sprint 5)

**Decision:** When a senior adjudicator **upholds** an objection, the amendment updates the *same* `fault_decisions` row and replaces its `fault_allocations` rows in place (delete + reinsert) — it does not create a second `fault_decisions` row.

**Reason:** Doc 04 §2.4 keeps `fault_decisions.case_id` as a strict `UQ` (1:1 with the case), unlike `reports` where the supersede chain needed that constraint relaxed. There is no schema room for a second decision row per case, and doc 04 gives no indication this should change — the appeal-amendment concept applies to the *report* (which the doc explicitly says gets a new, superseding row), not to the decision record itself. The amendment's reasoning is appended to `justification` (`"[تعديل بعد الاعتراض]: {resolution_note}"`) so the audit trail shows both the original justification and why it changed, and `was_overridden` is forced to `true`.

**Impact:** `fault_decisions`/`fault_allocations` history for an amended decision is only reconstructable via the row's current state + the linked `objections.resolution_note`, not via multiple historical decision rows the way `liability_rules` versions or superseded `reports` are. Auditability here relies on `objections` (which is never deleted or overwritten) rather than decision versioning.

---

### 2026-07-18 (Sprint 5)

**Decision:** The Arabic RTL PDF report (`resources/views/reports/fault-report.blade.php`) is structurally correct (`dir="rtl"`, `lang="ar"`, right-aligned CSS) but uses dompdf's bundled default font, which does not include Arabic glyph coverage — Arabic text will render as missing-glyph boxes until a real Arabic-supporting font (e.g., Noto Naskh Arabic, Amiri) is bundled and registered with dompdf.

**Reason:** Bundling and registering a font family with dompdf requires shipping font asset files and `config/dompdf.php` font-directory wiring — a design/asset task orthogonal to this sprint's backend scope (PDF generation pipeline, hashing, QR token, supersede chain). The generation mechanism, hash integrity, and structural RTL layout are all fully functional and tested now; only the visual glyph rendering is incomplete.

**Impact:** Anyone opening a generated PDF today will see correctly-positioned RTL layout with unreadable Arabic body text. This must be fixed (bundle + register an Arabic font in `config/dompdf.php`) before any real demo or user-facing use of the report PDF — flagged here so it isn't mistaken for "done."

---

### 2026-07-19 (Sprint 6)

**Decision:** Claim auto-open (FR-CL1) is wired via a Laravel event, not a direct call from the fault module: `CaseLifecycleService::transition()` dispatches `App\Events\CaseFinalized` whenever the target status is `CaseStatus::Final`, and `App\Listeners\OpenClaimsForFinalizedCase` (registered in `AppServiceProvider::boot()`, no dedicated `EventServiceProvider` in Laravel 12's skeleton) calls `ClaimService::openClaimsForCase()`.

**Reason:** A case can reach `final` from three different call sites (`ObjectionWindowService` when the 72h window lapses untouched, `ObjectionService::resolve()` on both dismiss and uphold) — hard-wiring a direct `ClaimService` call into all three would risk a future fourth path forgetting to open claims. Routing through the state machine's own choke point (`transition()`) guarantees the invariant "case becomes final ⇒ claims open" regardless of path, while an event (rather than a direct dependency) keeps the Cases module from needing to know Claims exists.

**Impact:** Any future path that transitions a case to `Final` automatically triggers claim auto-open — this is a feature, not just cleanup; be aware of it if a future sprint adds a new final-reaching path (e.g., a manual admin override) that should *not* auto-open claims.

---

### 2026-07-19 (Sprint 6)

**Decision:** For each `fault_allocations` row with `percentage < 100` (i.e., not fully at fault), one claim opens with `claimant_party_id` = that party and `insurer_org_id` = the *other* party's policy's insurer. In the pilot's 2-party scope this is unambiguous. A 50/50 split therefore opens two claims (one per party, each against the other's insurer) — this is the explicit Sprint 6 test case, not an edge case being tolerated. If the at-fault party has no resolvable policy/insurer (hit-and-run, uninsured), no claim opens for that pairing — there's no compulsory-pool mechanism implemented to fall back to.

**Reason:** FR-CL1 says "claim auto-created for each not-at-fault party against at-fault party's insurer" — doc 04's normalization notes (§4.2) also anticipate "the responsible insurer may be assigned via the compulsory pool" for the uninsured case, but no pool organization or assignment mechanism exists in any sprint through this one, so it's intentionally left unhandled rather than inventing a fallback insurer.

**Impact:** A citizen involved with an uninsured or hit-and-run at-fault party currently gets no auto-opened claim at all — they'd need a future compulsory-pool feature (or a manual/admin path, not yet built) to recover anything through this system.

---

### 2026-07-19 (Sprint 6)

**Decision:** `claim_events.actor_id` is nullable — a deviation from doc 04's bolded (NOT NULL) `actor_id FK users RESTRICT`. It's null only for genuinely system-generated events: claim auto-open (`'opened'`) and scheduled SLA-breach flagging (`'sla_breached'`). Every human-triggered event (`'decided'`, `'estimate_submitted'`, `'settled'`, `'closed'`) still carries a real `actor_id`.

**Reason:** Both automated events are triggered by scheduled commands or case-lifecycle side effects with no human in the loop at that moment. Attributing them to an arbitrarily-chosen "actor" (e.g., the fault decision's adjudicator, or a fabricated system user) would misrepresent the audit trail — it would look like that person took an action they didn't. A nullable `actor_id` states the true fact plainly instead.

**Impact:** Any UI rendering the claim timeline must handle a null actor (e.g., show "النظام" / "System" instead of a name) for these two action types.

---

### 2026-07-19 (Sprint 6)

**Decision:** `FR-CL2`'s reason-code requirement was implemented as **mandatory on every decide() outcome** (approve/partial/reject/request_info alike), not just partial/reject as UC-04's narrative emphasizes.

**Reason:** FR-CL2 (doc 01) states plainly "every decision carries a reason code," which is the more authoritative, general functional requirement; UC-06's extension note only calls out partial/reject because those are the higher-stakes "bad news" decisions, not because approve/request_info are exempt. Sprint 6's own task 3 restates "reason_code mandatory" without qualification, matching FR-CL2's stricter reading.

**Impact:** `App\Enums\ClaimReasonCode` is a fixed 8-value enum drafted for this sprint (doc 01/04 don't enumerate one) — values are kept to <=20 chars to fit `claim_events.reason_code VARCHAR(20)` (doc 04's column width, discovered the hard way when the first draft's longer values overflowed it in testing). A future sprint adding new reason codes must respect that same 20-char ceiling or widen the column (and document it here).

---

### 2026-07-19 (Sprint 6)

**Decision:** `SettlementService::record()` transitions a claim through `settled` and then immediately `closed` in the same call (two separate `claim_events` rows logged), rather than exposing a distinct "close claim" endpoint.

**Reason:** Doc 04/FR-CL5 describe the flow as "claim → settled → closed" but neither doc 01 nor the Sprint 6 task list describes any intervening business step between settlement and closing (no further claimant action, no additional insurer sign-off) — closing is a direct, automatic consequence of settlement in this system's scope.

**Impact:** There is no way to have a claim sit in `settled` without also being `closed` — if a future requirement needs a gap between the two (e.g., a claimant confirmation step before final closure), `SettlementService` needs to stop auto-closing and a new endpoint added.

---

### 2026-07-19 (Sprint 6)

**Decision:** "`request_info` does NOT pause SLA" (FR-CL2) is implemented by omission — no code path anywhere reads or writes `claims.sla_due_at` after claim creation. There is no pause/resume/extend mechanism at all.

**Reason:** The simplest, most literal way to guarantee an insurer can never stall the SLA clock via `request_info` is to never give any code the ability to touch `sla_due_at` after it's set — not even for a legitimate-seeming reason. This is a deliberate non-feature, not an oversight.

**Impact:** If a future sprint needs a genuine SLA-pause capability for some other reason (e.g., a claimant-caused delay), it must be added as new, explicit, narrowly-scoped logic — not by generalizing anything that exists today.

---

### 2026-07-20 (Sprint 7)

**Decision:** `AuditObserver` is attached only to `FaultDecision` and `Claim` (`created`/`updated`), and silently no-ops when there is no authenticated actor (`Auth::user()` is null) — matching the same principle already used for `claim_events.actor_id` (Sprint 6). "Role changes" and "reference data" (the other two categories CLAUDE.md rule #9 names) have no observer wired up.

**Reason:** No sprint through Sprint 7 has ever built an admin endpoint that changes a user's role or edits `liability_rules`/`parts_prices` post-seed — both are seeder-only in this codebase today, and seeding runs via `WithoutModelEvents` (no observers fire) with no meaningful human actor to attribute a log entry to (`audit_logs.user_id` is `NOT NULL` per doc 04, unlike the nullable `claim_events.actor_id` deviation). Wiring an observer to a code path that doesn't exist yet would be untestable dead infrastructure. `FaultDecision`/`Claim` were chosen because they're the two mutation types in CLAUDE.md's list that already have real, authenticated-actor endpoints (adjudicator `decide()`, senior adjudicator objection resolution, insurer `decide()`).

**Impact:** If a future sprint adds a role-management or reference-data-editing admin endpoint, wiring `FaultDecision::observe(AuditObserver::class)`-style registration to the new model is a one-line addition in `AppServiceProvider::boot()` — the `AuditLogService`/`AuditObserver` infrastructure is already generic and ready for it.

---

### 2026-07-20 (Sprint 7)

**Decision:** The Sprint 7 task list's "fraud flags list for ops" is implemented as `GET /api/v1/regulator/fraud-flags`, gated by `role:regulator` — not a separate "ops" role or endpoint.

**Reason:** Doc 01 FR-D1 is the authoritative functional requirement and explicitly lists "fraud flags" as part of the *regulator* dashboard, alongside claims volume/SLA breaches (which Sprint 6 already built under `role:regulator`). There is no "ops" role among doc 01 §B.4's 13 roles — the sprint prompt's casual phrasing doesn't override the FR. The endpoint returns aggregate counts only (`total`, `by_reason`, `daily_counts`) — never `case_id`/`evidence_item_id` — satisfying "aggregates only, no personal data" explicitly.

**Impact:** None functionally; this is a routing/role placement decision. If a future sprint introduces a distinct "ops" concept (e.g., a fraud-investigation console with case-level drill-down), that would be a new, separate, more detailed endpoint — this one stays a regulator-facing aggregate.

---

### 2026-07-20 (Sprint 7)

**Decision:** The authority heatmap buckets `accident_cases.lat`/`lng` by rounding to a configurable grid size (default `0.01`, ≈1.1km) rather than returning raw per-case coordinates; black-spot ranking groups by the existing `region` string column. Both endpoints return only bucketed/grouped counts — no `case_no`, no party data.

**Reason:** FR-D2 asks for a heatmap and black-spot ranking as aggregate analytics; doc 04 already stores `region` specifically for "heatmap grouping" (§2.3 index rationale), so black-spots reuse it directly rather than introducing a second bucketing scheme. Lat/lng bucketing (vs. per-point plotting) is what keeps the heatmap an aggregate rather than a de-facto case list an authority user could correlate back to individuals via timing/location.

**Impact:** Heatmap resolution is a query-time constant today (`$bucketSize` parameter, not yet exposed to the API); if a future sprint wants a caller-adjustable zoom level, `AccidentAnalyticsService::heatmap()` already accepts it as a parameter, just not yet wired to a request input.

---

### 2026-07-20 (Sprint 7)

**Decision:** Evidence media is served only via a two-step signed-URL flow: an authenticated, policy-gated `GET /api/v1/evidence/{evidence}/download-url` issues a 30-minute `URL::temporarySignedRoute`, and the actual `GET /api/v1/evidence/{evidence}/download` (named `evidence.download`) requires only Laravel's `signed` middleware — no Sanctum token — since the signature itself is the delegated, time-limited credential. This mirrors the existing `cases/join/{token}` and `reports/verify/{qrToken}` pattern (an unguessable/signed token stands in for a session) rather than introducing a new access-control shape.

**Reason:** CLAUDE.md's hardening rule explicitly asks for "signed temporary URLs for evidence media." Laravel's local filesystem disk (what `evidence`/`policies`/`reports` are stored on in this environment) has no native `Storage::temporaryUrl()` support — that's an S3-only feature — so the standard Laravel-documented workaround (a signed route wrapping the download) is used instead.

**Impact:** Any client wanting to display/download evidence must first call the authenticated `download-url` endpoint to obtain a fresh signed link (they expire after 30 minutes) rather than storing/reusing `evidence_items.file_path` directly as a public URL.

---

### 2026-07-20 (Sprint 7)

**Decision:** `Model::preventLazyLoading()` is enabled in `AppServiceProvider::boot()` for every non-production environment (local, testing). No lazy-loading violations existed anywhere in the Sprints 1–6 codebase — the full suite passed unchanged the moment it was turned on.

**Reason:** CLAUDE.md hardening asks for "N+1 query audit (Laravel strict mode on in dev)." Worth noting for anyone extending this: Laravel's lazy-loading guard only fires when hydrating a **collection of 2+ models** (`Illuminate\Database\Eloquent\Builder::hydrate()` only sets the per-instance flag `if (count($items) > 1)`) — a single `Model::find()` or route-model-bound instance lazily accessing a relation is *not* flagged, since that's one extra query, not an N+1 explosion. Confirmed this understanding empirically (a 2-item collection iteration threw `LazyLoadingViolationException`; a single-record fetch did not) before relying on "the suite is green" as proof of no violations.

**Impact:** Any future collection-returning code that iterates and lazily accesses a relation per row will throw immediately in dev/test (loud failure, not a silent extra query) — the fix is always to add `->with(...)` at the query site, never to catch/suppress the exception.

---

### 2026-07-20 (Sprint 7)

**Decision:** No code-coverage percentage report was generated for task 5 ("Coverage report: >=80% on app/Services"). Instead, every `app/Services` class was manually cross-checked against the test suite (grep for direct unit-test references, then trace controller → service wiring for HTTP-level coverage), and the one real gap found (`LogSmsGateway` — always substituted by `FakeSmsGateway` in the one test file that rebinds `SmsGateway`, so its actual `Log::channel()->info()` call had no dedicated assertion) was closed with `tests/Unit/Services/Sms/LogSmsGatewayTest.php`.

**Reason:** Neither Xdebug nor PCOV is installed in this PHP 8.2.12/XAMPP environment, and fetching a prebuilt Xdebug DLL from xdebug.org failed on the same TLS/network flakiness already documented in this file for GitHub package installs (`curl: (35) schannel: ... SEC_E_ILLEGAL_MESSAGE`). Installing a PHP extension requires either a working download or a local build toolchain, neither reliably available here.

**Impact:** The 80% *number* is unverified — a real coverage tool could still surface untested branches/lines this manual pass missed (e.g., rarely-hit error paths inside otherwise-covered methods). Anyone with Xdebug/PCOV available should run `vendor/bin/phpunit --coverage-text` and treat any gap it finds as real; this decision only asserts that no *entire service* was found untested, not that every line is.

---

### 2026-07-28 (Sprint 8)

**Decision:** Sprint 8 is the **web foundation**, not CLAUDE.md's build-order item 8 ("Hardening"). The hardening item was already delivered inside the Sprint 7 commit (`dd4e528`), which folded build-order items 7 and 8 together.

**Reason:** The backend had reached the end of the documented build order while `apps/web` was still the Sprint 1 scaffold — 7 of the 8 screens in `05-design-brief.md` unbuilt, and none of the frontend rules in CLAUDE.md (router, TanStack Query, forms, i18n) yet in place. Confirmed the reading with the project owner before starting.

**Impact:** Sprint numbering in git no longer maps 1:1 onto the CLAUDE.md build-order list from Sprint 7 onward. Build-order items 1–8 are all delivered as of this branch; subsequent sprints are frontend screens.

---

### 2026-07-28 (Sprint 8)

**Decision:** Added two endpoints outside the original build order: `GET /api/v1/auth/me` and `POST /api/v1/auth/logout` (`SessionController` → `SessionService`, both inside the `auth:sanctum` group). Logout revokes only the calling token via `currentAccessToken()->delete()`, not all of the user's tokens.

**Reason:** The OTP flow issued tokens but nothing could restore or drop a session. Without `me`, a page reload would have forced the frontend to persist the whole user object in localStorage — making role membership client-controlled cache that outlives an admin's role change, and violating CLAUDE.md's "TanStack Query for ALL server state". Without `logout`, Sanctum tokens were never revoked at all, so signing out left a live credential in storage. Per-token revocation (rather than `tokens()->delete()`) matches the user expectation that signing out of a phone does not sign you out of a shared office desktop.

**Impact:** `/auth/me` returns the standard `{ data: ... }` resource envelope while `/auth/otp/verify` returns `{ user, token }` unwrapped — the frontend client has both `apiFetch` and `apiFetchResource` for this reason. Note that DEVSENSE's PHP language server flags `currentAccessToken()->delete()` as an undefined method: it reads Sanctum's loose `@return HasAbilities|null` PHPDoc, whereas larastan types it as `PersonalAccessToken`. PHPStan and Pint are both green; the call is Laravel's documented idiom.

---

### 2026-07-28 (Sprint 8)

**Decision:** Enabled `"strict": true` in `apps/web/tsconfig.app.json`, which the Vite template scaffold had omitted.

**Reason:** `strictNullChecks` in particular is what makes the API client's `User | null` session model and the nullable resource fields (`full_name`, `organization_id`, `superseded_by`) mean anything. Turning it on while `apps/web` was still one placeholder component cost nothing; turning it on after the eight screens exist would be a migration.

**Impact:** All new frontend code is written strict-clean and `npm run typecheck` passes. Any future code that ignores nullability now fails CI instead of failing at runtime.

---

### 2026-07-28 (Sprint 8)

**Decision:** `RequireAuth` distinguishes four states — `loading`, `authenticated`, `anonymous`, `error` — and only redirects to `/login` on `anonymous`. A failed `/auth/me` caused by a dropped connection renders a retry instead.

**Reason:** The naive two-state guard ("no user ⇒ redirect to login") signs a user out every time the network blips, which on the patchy mobile connections this platform targets means losing your place mid-task. A 401 is the only signal that the session is actually gone, and the API client already handles that case by clearing the token — which moves the guard to `anonymous` on its own.

**Impact:** Any future protected route inherits this behaviour for free. The distinction is covered by two tests in `src/routes/guards.test.tsx` (network error keeps the user in place; 401 drops the session).

---

### 2026-07-28 (Sprint 8)

**Decision:** The authenticated section list lives in one registry (`src/features/home/sections.ts`) that both the router and the home screen consume. The router generates a `RequireRole`-wrapped route per entry; the home screen lists the entries matching the signed-in user's roles.

**Reason:** The failure mode with two hand-maintained lists is a section that is linked but unguarded (or guarded but unreachable). Deriving both from one array makes that class of bug unrepresentable rather than merely tested-for.

**Impact:** Adding a console in a later sprint means adding one registry entry and swapping `PlaceholderSection` for the real component. The `roles` on each entry must keep mirroring the matching `role:` middleware in `routes/api.php` — the frontend guard is navigational only, the API stays the enforcement point.

---

### 2026-07-28 (Sprint 8)

**Decision:** All landing-page copy moved from `content.ts` into the `ar`/`en` lang files under `landing.*`; `content.ts` now holds only non-text structure (asset paths, target routes, and the icon that accompanies each item, matched to the lang-file arrays by index).

**Reason:** CLAUDE.md requires Arabic user-facing strings to live in lang files. Matching icons to translated items by array index (rather than embedding icon names in the JSON) keeps the lang files pure content, so they stay translatable without a developer.

**Impact:** Adding a landing item means editing both the lang files and the matching icon array in `content.ts`; a missing icon renders the card without one rather than crashing. Dev in this environment used the Vite proxy (`/api` → `127.0.0.1:8000`) rather than publishing a CORS config, so no `config/cors.php` exists — a deployed frontend on a different origin will need one.

---

### 2026-07-28 (Sprint 8)

**Decision:** The new `tests/Feature/Auth/SessionTest.php` was **not executed**; the frontend suite (32 tests) plus Pint and PHPStan on the API were.

**Reason:** `phpunit.xml` points the test suite at MySQL (`masar_testing`), and the local MySQL server was not running during this sprint (`SQLSTATE[HY000] [2002] ... target machine actively refused it`). Running the suite against SQLite instead would have been misleading, since the migrations use raw MySQL `CHECK` statements (CLAUDE.md rule 6).

**Impact:** `SessionTest` is unverified until someone starts MySQL and runs `composer test`. The three cases it covers (me returns roles, me rejects anonymous callers, logout revokes only the calling token) are the ones to watch if the endpoints misbehave.

---

### 2026-07-28 (Sprint 9)

**Decision:** Wizard photos are persisted to **IndexedDB**, not localStorage; only the text fields go to localStorage as CLAUDE.md specifies. Slots are stored positionally, and the extras are appended only once all four guided slots are filled.

**Reason:** CLAUDE.md asks for "wizard state persisted to localStorage (offline tolerance)". Four to eight photos compressed to ~300KB each are 1.5–3MB once base64-encoded — most of the typical 5MB localStorage quota, and a quota error mid-capture would silently lose the draft. IndexedDB stores blobs natively at their real size. Positional storage matters because a collapsed array would reshuffle photos between slots on reload (a damage close-up reappearing as the wide shot).

**Impact:** This is a deliberate deviation from the letter of the CLAUDE.md line, in service of its stated intent. Both stores degrade to no-ops when blocked (private mode, locked-down WebViews) — a lost draft is acceptable, a wizard that will not open is not. `photo-store.ts` resolves rather than rejects on every path for that reason.

---

### 2026-07-28 (Sprint 9)

**Decision:** The statement step ships **text only**. Voice statements are shown as "coming soon" rather than implemented.

**Reason:** `StoreCaseRequest` accepts `voice_statement` as `mimes:mp3,wav,m4a,ogg`. Browser `MediaRecorder` produces `audio/webm` in Chrome and Edge (the majority of Android users this platform targets); only Firefox produces ogg. Shipping a recorder that fails validation for most users is worse than not shipping one.

**Impact:** UC-01's voice-note requirement is unmet. Closing it needs a backend decision first — either add `webm` to the accepted mimes (and verify Laravel's mime detection does not classify it as `video/webm`), or transcode client-side. The statement text field satisfies the FormRequest's `required_without` pair on its own, so nothing is blocked today.

---

### 2026-07-28 (Sprint 9)

**Decision:** The location step uses the browser Geolocation API plus manually editable latitude/longitude fields. No map library was added. `location_verified` is set true **only** for a device fix, never for typed coordinates.

**Reason:** A real map needs both a library and an external tile server; the platform targets roadside use on unreliable connections, where a tile fetch is exactly what fails. Geolocation is requested with `enableHighAccuracy: false` and a 60s `maximumAge` so a coarse cell-tower fix is accepted rather than waiting out a GPS lock — doc 01 explicitly anticipates "works with cell towers if no GPS". Keeping `location_verified` honest matters because the triage and fraud rules read it.

**Impact:** Users cannot yet drop a pin visually, which the design brief calls for. Adding a map later only needs to write `lat`/`lng` into the same draft fields.

---

### 2026-07-28 (Sprint 9)

**Decision:** The guided capture has exactly four slots — wide, both vehicles, damage close-up, plate — matching the design brief's ghost-frame list, and one photo per slot is precisely the backend's `photos min:4`.

**Reason:** Tying the guide to the API minimum means a user who completes the visual guide has satisfied the validation rule by construction, rather than being told "at least 4 photos" and guessing which four are useful. Extra photos are allowed but never required.

**Impact:** Changing `min:4` in `StoreCaseRequest` now requires changing `PHOTO_SLOTS` too, or the wizard will let users submit reports the API rejects. `validateStep` in `steps.ts` is the single place that mirrors the FormRequest.

---

### 2026-07-28 (Sprint 9)

**Decision:** A vehicles screen (list + add) was built this sprint although it belongs to the Sprint 2 registry, and no backend file was touched.

**Reason:** `StoreCaseRequest` requires a `vehicle_id` the caller owns, so the wizard is unreachable for a new user with no registered vehicle. Shipping the wizard without it would have produced a hero flow nobody could complete on a fresh account.

**Impact:** The vehicles screen covers create and list only. Edit, delete, restore, and the whole insurance-policy side of the registry all have working endpoints but no UI yet.

---

### 2026-07-28 (Sprint 9)

**Decision:** No route-level code splitting; the app ships as a single ~540KB (167KB gzipped) bundle, and Vite's chunk-size warning is accepted for now.

**Reason:** Sprint scope was the wizard. Introducing `React.lazy` boundaries at the end of the sprint would have put 66 passing tests at risk for a gain that is real but not yet urgent.

**Impact:** This works against the "low-end Android browsers" constraint in the design brief and should be the first performance task taken up. The obvious split is the landing page (which anonymous visitors load and which carries the video and all landing copy) away from the authenticated app.

---

### 2026-07-28 (Sprint 9 — review fixes)

**Decision:** Added `accident_cases.location_description` VARCHAR(255) nullable (additive migration; doc 04 §2.3 updated). The service layer requires it whenever `location_verified` is false. `region` was also opened up on `StoreCaseRequest` so the intake can populate it.

**Reason:** Review feedback: asking a driver at a crash site to type decimal degrees is not a real option. The wizard now offers a governorate picker whose centre coordinates satisfy the NOT NULL `lat`/`lng` that the heatmap and black-spot analytics depend on — but a governorate centre is useless to a dispatched surveyor, so the written street location becomes mandatory in exactly that case. Free text could not be stuffed into `region`: doc 04 §2.3 designates it for heatmap grouping and Sprint 7's `AccidentAnalyticsService::blackSpots()` groups on it, so a free-text address there would corrupt the ranking. Self-reported cases previously left `region` null and were silently excluded from black-spot analytics entirely; the governorate picker now fills it.

**Impact:** `location_verified` becomes a load-bearing flag, not just metadata — it decides whether a description is required, and only a device GPS fix sets it true. The rule is mirrored in `steps.ts::validateStep` on the frontend; the two must stay in agreement. Governorate coordinates live in `apps/web/src/lib/regions.ts`.

---

### 2026-07-28 (Sprint 9 — review fixes)

**Decision:** `tests/Feature/Auth/SessionTest::test_logout_revokes_only_the_calling_token` (written in Sprint 8, never executed until now) was **failing**. Fixed by calling `$this->app['auth']->forgetGuards()` between requests and asserting the surviving token's name at the database level.

**Reason:** Sanctum's `RequestGuard::user()` caches the resolved user on the guard instance, and a Laravel feature test shares one application instance across every request it makes. The second request therefore reused the first request's already-authenticated user and returned 200 instead of 401 — the test was asserting nothing about revocation. Production resolves auth from a fresh instance per request, so the endpoint itself was always correct.

**Impact:** Any future test that needs a *second* request to re-authenticate (token revocation, role changes taking effect, impersonation) must forget the guards first, or it will silently pass against stale state. This is exactly the failure the Sprint 8 entry above warned was possible while MySQL was unavailable — the full suite is now green at 124 tests / 575 assertions.

---

### 2026-07-29 (Sprint 10)

**Decision:** Added `GET /api/v1/cases`, scoped to cases the caller is a party to, and enriched `CaseResource` with the fault decision (including the cited rule's `description_ar`), the issued reports, and the opened claims — all as `whenLoaded` fields.

**Reason:** The citizen case view needs a list, and no list endpoint existed: Sprints 3–7 built `POST /cases` and `GET /cases/{case}` but never an index, so "my cases" was unreachable. The index filters by party membership, which is the same rule `AccidentCasePolicy::view` enforces on a single case — a user cannot see a case they are not part of, so no extra policy call is needed. The resource additions are `whenLoaded`, so the create and join responses are byte-for-byte unchanged.

**Impact:** `GET /cases/{case}` now eager-loads six relations in one round trip. `preventLazyLoading` (Sprint 7) makes any missed relation fail loudly in dev rather than silently N+1, so adding a field to the citizen view means adding the matching `with()` in `CaseController::show`.

---

### 2026-07-29 (Sprint 10)

**Decision:** The objection countdown is driven by a server-computed `objection_seconds_remaining`, not by the client diffing `objection_deadline` against its own clock. `useCountdown` derives its deadline from the device clock *plus* that server figure, so only elapsed time is measured locally.

**Reason:** A device with the wrong date would otherwise show a citizen the wrong time left to object to a liability decision — a legally meaningful 72-hour deadline (FR-F3) on exactly the low-end Android devices this platform targets. Measuring only elapsed time makes absolute clock skew irrelevant. The server re-checks the window on submit regardless, so a stale client can never actually beat the deadline; the countdown is about not misleading the reader.

**Impact:** `objection_deadline` is still sent for display, but nothing should compute remaining time from it. The 72 itself now lives in `config/fault.php` — it was previously duplicated as a private const in both `ObjectionService` and `ObjectionWindowService`, and the resource became a third consumer that could have drifted from them.

---

### 2026-07-29 (Sprint 10)

**Decision:** The case timeline is derived from timestamps the API already carries (case `created_at`, counterparty `joined_at`, decision `decided_at`, objection `resolved_at`, report `issued_at`, claim `opened_at`) rather than from a per-transition history table. No `case_events` table was added.

**Reason:** Claims have `claim_events`; cases do not — doc 04 never specified one. Every entry rendered is therefore a recorded fact with a source, not an inference from the current status. Fabricating intermediate transition times from the state machine would have put invented timestamps in front of a citizen on a page whose whole purpose is transparency.

**Impact:** The timeline cannot show transitions that leave no timestamp of their own (`under_review` → `adjudication`, for instance), and it cannot show *who* made a transition. A `case_events` table mirroring `claim_events` is the fuller answer if the appeals process later needs a defensible per-transition record; the audit log (Sprint 7) covers decisions and claims but is not citizen-facing.

---

### 2026-07-29 (Sprint 11)

**Decision:** Wired `GET /api/v1/claims` for the claimant and added `case_no` to `ClaimResource` (as a `whenLoaded` field on the `case` relation).

**Reason:** `ClaimService::forClaimant()` had existed since Sprint 6 but was never routed — the insurer got `GET /insurer/claims` while the claimant, who the whole tracking screen is for, could only fetch a claim whose id they already knew. Scoping by claimant party is the same condition `ClaimPolicy::view` applies to a single claim, so the list cannot leak a claim that `show` would refuse. `case_no` is needed because `case_id` is a sequential id that means nothing to a UI, and the tracking screen has to link back to the accident.

**Impact:** This is the third sprint in a row where the citizen-facing index was the missing piece (cases in Sprint 10, claims here). Any remaining role console should be checked for the same gap before its screen is started — the insurer, adjudicator, and regulator indexes all exist, but the assessor/workshop estimate list does not.

---

### 2026-07-29 (Sprint 11)

**Decision:** `ClaimResource` exposes `sla_seconds_remaining` (server-computed, and **allowed to go negative**) plus a `sla_breached` boolean that is false for `settled`/`closed` claims regardless of the deadline. The UI ticks down only while the deadline is in the future; an overdue claim shows a static "X days past".

**Reason:** Same clock-skew reasoning as the objection countdown (Sprint 10), but with a deliberate difference: the objection window floors at zero because an expired window is simply closed, whereas *how far past* the deadline an insurer is, is exactly what a claimant and the regulator's SLA dashboard care about. `sla_breached` mirrors the condition `ClaimService::forOrganization(slaBreached: true)` already uses, so the claimant's screen and the insurer's filtered queue agree on what "breached" means. A live-ticking overdue counter would be theatre — the number that matters is a whole-day count.

**Impact:** Unlike the case timeline, the claim timeline is real recorded history — doc 04 §2.5 logs every mutation to `claim_events` precisely because "status alone loses history" — so nothing on this screen is derived. Reason codes are rendered through i18n with the raw code as `defaultValue`, so an enum added server-side degrades to showing the code rather than a missing-key placeholder in front of a claimant.

---

### 2026-07-29 (Sprint 11 — regression fix)

**Decision:** `config/zones.php` now lists the pilot zones in Arabic (`دمشق`, `حلب`, `حمص`) instead of English. Added `config/regions.php` as the canonical server-side governorate vocabulary, plus `ZoneVocabularyTest` asserting the pilot zones are a subset of it and `regions.test.ts` pinning the frontend list to the same strings.

**Reason:** Sprint 9's location step began writing the Arabic governorate name into `accident_cases.region`, while the zone list still said `Damascus`. `DispatchService::pickSurveyor()` compares `users.zone` to `accident_cases.region` with plain equality and **falls back to any free surveyor when nothing matches** — so zone-based routing (FR-C5) stopped working for every self-reported case without a single test failing or a line appearing in a log. The existing dispatch tests could not catch it: they set both sides to the same literal, so they pass under any vocabulary at all. Those literals have been changed to the real zone names so the suite exercises the actual vocabulary.

**Impact:** The two lists are now duplicated across languages and pinned by a test on each side, which catches an edit to one but not a coordinated-yet-wrong edit to both. Serving the governorate list from an endpoint and having the wizard cache it is the real fix; it was not done here because the wizard must work offline, so the list has to ship in the bundle regardless. Any future column matched across the PHP/TS boundary by string equality deserves the same treatment — a silent fallback is what makes this class of bug invisible.

---

### 2026-07-29 (Sprint 11)

**Decision:** Added `DemoUserSeeder` — one fixed sign-in per role (`0900000001`–`0900000013`), organization-scoped where the role requires it, seeded only outside production. `DemoSeeder` now hangs its fixtures off the demo citizen and adjudicator instead of throwaway factory users. Also added the missing `assessor_office` organization.

**Reason:** Trying the platform as anyone but a citizen meant assigning roles by hand in tinker after every `migrate:fresh` — the OTP flow grants `citizen` to new users and nothing else, and the admin console that would hand out roles is itself unbuilt. Previously the fixtures were owned by random factory users, so even a correctly-roled account landed on empty screens; the demo citizen now owns a case in all 12 lifecycle states and a claim in all 8 statuses. `OrganizationType::AssessorOffice` existed in the enum but no organization of that type was ever seeded, so an `assessor` user had nothing to belong to.

**Impact:** These are not credentials — sign-in is still phone + OTP with a random code, and the seeder never runs in production. The seeder uses `syncRoles` rather than `assignRole` so re-seeding neither stacks role rows nor leaves a hand-removed role missing. `phpstan.neon` gained one scoped ignore: `Seeder::$command` is documented non-nullable but is genuinely unset when a seeder is constructed directly, and Laravel's own `Seeder` guards it with `isset` for that reason.

---

### 2026-07-29 (Sprint 12)

**Decision:** `AccidentCasePolicy::view` now also admits `adjudicator` and `senior_adjudicator`. The grant is limited to those two roles — surveyors still reach cases through their dispatch, insurers through the claim.

**Reason:** The policy only admitted case parties, so `GET /adjudication/queue` listed cases and every one of them answered **403** when opened. The adjudicator console was unreachable by construction, and no test caught it because nothing had ever opened a case as a non-party. Verified against the seeded database before changing anything: `$adjudicator->can('view', $case)` returned false for a queue row.

**Impact:** Two roles now hold a blanket read over every accident case. That is the nature of the job — an adjudicator is assigned cases they have no prior relationship with — but it is the first non-party read in the system, and the audit log (Sprint 7) records decisions rather than reads. If read auditing is ever required, this is the access path that needs it.

---

### 2026-07-29 (Sprint 12)

**Decision:** Added `GET /api/v1/liability-rules`, returning only the current version of each scenario (`effective_to IS NULL`, highest `version`), unpaginated.

**Reason:** The console's proposal card had no data source — `liability_rules` had no endpoint at all. Version filtering happens server-side because CLAUDE.md rule 5 makes reference data versioned and never updated in place; a superseded split must not be offered as a proposal, and leaving that filter to the client would put the rule in two places. The response is unpaginated because it is a dozen rows the decision form needs in full to render a scenario picker.

**Impact:** Rules are cached for ten minutes in the query client. A newly published rule version takes that long to appear in an open console.

---

### 2026-07-29 (Sprint 12)

**Decision:** The console lays the two statements out side by side and states plainly that it does not analyse them. No contradiction detection was implemented, despite the design brief asking for "auto-highlighted contradictions".

**Reason:** Detecting that two Arabic free-text accounts contradict each other is a natural-language problem, and nothing short of a real model does it. The available alternatives were all worse than nothing: keyword matching would highlight noise, and any highlight at all carries an implicit claim of reliability on a screen where a reviewer assigns legal liability. A reviewer who trusts a bad highlight is worse off than one who reads both accounts. The screen says the judgement is theirs.

**Impact:** The brief's requirement is unmet and deliberately so. If it is taken up later, the honest form is a model-backed service behind an adapter (CLAUDE.md rule 4) whose output is labelled as a suggestion and never pre-fills the allocation.

---

### 2026-07-29 (Sprint 12)

**Decision:** The frontend's override rule (`decision.ts`) re-implements `FaultDecisionService::matchesRuleSplit()`, including its sort, and is unit-tested against that behaviour.

**Reason:** The backend requires a justification whenever the split departs from the rule, and rejects the submission otherwise. Without the same rule client-side, the reviewer would write a decision, submit, and be told no by a round trip. The sort matters: a rule states 100/0 without naming which party is which, so assigning 100 to either party still counts as following it.

**Impact:** Duplicated logic across the language boundary, pinned by tests on the frontend side only. If `matchesRuleSplit` changes — weighted splits across three parties, say — `decision.ts` must change with it or the console will gate on the wrong condition.

---

### 2026-07-30 (Sprint 13)

**Decision:** The `insurer` route group was split: reads (`GET claims`, `GET claims/{claim}`, `GET policies`, `GET workshops`) are open to `insurer_agent|insurer_admin`, while every mutation stays `insurer_agent`. `ClaimPolicy::view` was widened to match; `ClaimPolicy::manage` was not. `InsurerClaimController::show` now authorises `view` rather than `manage`.

**Reason:** Every insurer route required `insurer_agent`, but the frontend section registry offered the insurer screens to `insurer_admin` too — so an admin was handed a screen that 403'd on load. Doc 01 §B.4 settles the split: the agent "process[es] claims, approve[s] settlements", while the admin gets an "SLA dashboard" and the "accredited workshop list", which are views over exactly this data. The middleware change alone was not enough and the tests caught it — `show()` authorised `manage`, so the admin still got 403 at the policy layer. That second layer is the part a middleware-only fix would have missed.

**Impact:** `manage` is now the only insurer ability that implies authority; anything acting on a claim must check it, not `view`. The claim detail screen hides the decision panel and settlement form from the admin rather than letting them fail — showing controls that answer 403 is worse than not showing them, and the two rules now have to be kept in step.

---

### 2026-07-30 (Sprint 13)

**Decision:** Added `GET /api/v1/insurer/workshops`, listing `active` workshop organisations only, unpaginated.

**Reason:** `RecordSettlementRequest` requires `workshop_org_id` when the mode is `repair_order`, and no endpoint existed for a client to discover a valid id — the settlement form was unbuildable. Filtering to `active` is deliberate: a settlement issues a repair order to whichever workshop is chosen, so a suspended one must not be selectable.

**Impact:** A workshop suspended after a repair order was issued still holds that order; this endpoint governs new selections only. Nothing revalidates `workshop_org_id` against accreditation at settlement time — the FormRequest only checks the row exists.

---

### 2026-07-30 (Sprint 13)

**Decision:** Extracted `ClaimTimeline` and `EstimateCard` out of the citizen `ClaimDetailPage` into shared components, and the insurer console reuses them together with `SlaIndicator`. A separate insurer-side SLA chip was written and then deleted.

**Reason:** The chip computed remaining time from `sla_due_at` against the device clock, while `SlaIndicator` (Sprint 11) ticks from the server's `sla_seconds_remaining`. Two renderings of the same deadline that disagree is exactly the failure mode the server-side countdown was introduced to avoid, and the insurer and the claimant seeing different numbers on the same claim is worse than either being slightly stale. The claims table now also sorts on `sla_seconds_remaining` rather than a locally derived figure.

**Impact:** Three components are now shared across two role-facing features, so a change to the timeline or the deviation flag lands on both consoles at once — which is the point, but it means neither can be restyled independently without a prop.

---

### 2026-07-30 (Sprint 14)

**Decision:** Every chart on the four dashboards uses a single sequential hue stepped from the brand blue — no categorical palette anywhere. The five light steps and five dark steps are separate selections, each run through the palette validator against its own surface rather than derived by inverting the other.

**Reason:** All four datasets encode magnitude of one quantity — breach rate per insurer, accidents per bucket, accidents per governorate, signals per day. None of them is a set of distinct series, so categorical hues would imply a difference in kind that the data does not contain. The validator caught a real defect: the first light ramp failed the ordinal 2:1 floor at its light end (`#c9dcee` measured 1.33:1 on `#f7f9fb`), meaning the smallest bars would have dissolved into the surface. Re-stepping to `#8fb4d4` (2.06:1) passed. The dark ramp failed the same check at `#1e4a72` (1.94:1) and was re-stepped to `#24547e` (2.25:1).

**Impact:** Steps live as `--seq-1..5` in `index.css` with the measured contrast recorded in a comment; moving either end obliges a re-run of `validate_palette.js --ordinal` against the matching surface. Bars are also directly labelled and every chart has a table view, so no reading depends on colour.

---

### 2026-07-30 (Sprint 14)

**Decision:** The authority heatmap renders as a density plot with no base map, and the page says so in as many words.

**Reason:** `AccidentAnalyticsService::heatmap()` returns coordinate buckets, and plotting them on a real map needs an external tile provider — which this platform avoids by design, and which the offline-tolerance constraint makes worse. Drawing the buckets in a map-shaped frame without a map would imply geographic context that isn't there; a reader would take the empty space for terrain. Positioning by lat/lng within the data's own bounds is what the data actually supports, so that is what it claims to be. The black-spots ranking beside it is the actionable geographic view, and it needs no tiles.

**Impact:** A regulator cannot see accidents against roads or districts, which is the point of a heatmap for road-safety work. Wiring a tile provider is the follow-up; the plot component takes the same bucket array, so it is a swap rather than a rewrite.

---

### 2026-07-30 (Sprint 14)

**Decision:** Fraud reasons render as a table, not a bar chart. The SLA screen flags only the worst insurer, and only when its breach count is above zero.

**Reason:** One reason code exists in the system today (`duplicate_photo_hash`), and a one-bar bar chart invites a comparison against nothing; the table degrades correctly when more codes appear. On the SLA screen, painting a bar red is an accusation — doing it to a company with zero breaches because it happens to sort first would be a claim the data does not make. The flag also carries a written label rather than relying on the colour.

**Impact:** Both choices are guarded by tests, including one asserting that nobody is flagged when nobody has breached. An unmapped reason code falls back to its raw string rather than a missing-key placeholder, so a server-side enum addition degrades visibly instead of silently.

---

### 2026-07-30 (Sprint 14)

**Decision:** The hand-rolled SVG charts are covered by geometry tests asserting plotted coordinates stay inside the viewBox, including the single-point and all-zero cases.

**Reason:** The palette validator checks colour, not layout, and the skill's final step is to render the chart and look at it. No browser or screenshot tool is available in this environment, so that step could not be performed as written. Asserting the geometry programmatically covers the specific failure this code is prone to — a division by zero when a series has one point or a flat-zero span, which silently produces `NaN` coordinates and an invisible chart. A flat-zero fraud series is the ordinary case, not an edge case.

**Impact:** Visual review is still outstanding: label collision, RTL mirroring of the time axis, and dark-mode rendering have been reasoned about but not seen. Anyone with a browser to hand should open the four screens before this is shown to an examiner.

---

### 2026-07-30 (Sprint 15)

**Decision:** The counterparty join deep link is now built from a new `config('app.frontend_url')` (`FRONTEND_URL`, default `http://localhost:5173`) instead of `config('app.url')`.

**Reason:** The SMS sent to the second driver pointed at `APP_URL` — the API's own host, where `/join/{token}` is not a route. This API is API-only and is not co-hosted with the SPA, so the recipient of the platform's central anti-fraud invitation would have opened a 404. Nothing caught it because no test asserted the *host* of the link, only that a token existed; `CounterpartyDeepLinkTest` now pulls the token out of the message body and feeds it to the teaser endpoint, covering the recipient's journey end to end.

**Impact:** `FRONTEND_URL` must be set per environment or human-facing links break silently in exactly the same way. Any future outbound link to a person belongs on this config, never on `app.url`.

---

### 2026-07-30 (Sprint 15)

**Decision:** The join page hands anonymous arrivals to the existing `/login` screen with a return path in router state, rather than embedding a second phone+OTP form as doc 06 Sprint 9 task 3 ("inline OTP") reads.

**Reason:** A second OTP implementation is a second place for rate-limit handling, resend timing, and error copy to drift out of step with the first. The recipient's experience is one extra navigation and back; the alternative is duplicated auth logic on the platform's most security-sensitive entry point. `RequireAuth` already established the `state.from` convention, so the return path is the mechanism already in use.

**Impact:** The join flow inherits any future change to sign-in for free. It also means the deep link cannot complete without leaving the page once — if a bounce ever shows up in real use, the fix is to make the login screen embeddable, not to fork it.

---

### 2026-07-30 (Sprint 15)

**Decision:** The join page reuses `PhotosStep` from the reporting wizard whole, and writes its own statement field instead of reusing `StatementStep`. Draft state is held in memory only — no localStorage or IndexedDB persistence, unlike the wizard.

**Reason:** `PhotosStep` is genuinely decoupled (photos in, handlers out) and carries the four guided slots, the ghost frames, and the client-side compression — reimplementing any of that would guarantee the two capture flows diverge. `StatementStep` is bound to `ReportDraft`, and the counterparty's prompt is a different question anyway ("your side of what happened"), so a shared component would have needed a props escape hatch for no gain. Persistence was left out because the join flow is two steps against a 24-hour token, not the wizard's six against an open-ended draft; adding a second set of storage keys is real complexity for a much smaller window of loss.

**Impact:** A counterparty who closes the tab mid-flow loses their photos and retypes their statement. If that turns out to matter, `photo-store.ts` takes a key parameter away from being reusable here — the wizard's persistence was written keyless on the assumption of a single draft.

---

### 2026-07-30 (Rename: Masar → Marsad)

**Decision:** The platform is now **مرصد / Marsad**. Renamed across the code: the four scheduled commands (`masar:*` → `marsad:*`, lowercase per Laravel convention), the test database (`masar_testing` → `marsad_testing`, in `phpunit.xml` and CI), `APP_NAME`, `DB_DATABASE` in `.env.example`, the signed PDF report's footer, `common.appName`/`appLatin` in the English lang file, all four browser storage keys, and `docs/03-proposal-masar.md` → `03-proposal-marsad.md`. Earlier entries in *this* log keep their original wording — a dated decision record that gets edited to match the present is no longer a record. Where an old entry names `masar_testing`, this entry supersedes it.

**Reason:** A blind find-and-replace would have corrupted the Arabic copy. «مسار» is also the ordinary word for *lane / track / path*, and it appears throughout the product as exactly that: `مسار سريع` (fast track), `مسار القضية` (case progress), `تغيير مسار خاطئ` (improper lane change — a liability rule), `كنت أسير في مساري` (I was in my lane — a witness statement in a test fixture). Each occurrence was read before being touched; only the brand ones changed. The Arabic lang file already read `مرصد`, so the damage would have been entirely one-directional and silent.

**Impact:** The old auth token key is read once and carried forward, so nobody is signed out by the rename — including a demo account mid-presentation. The old draft key is purged instead of migrated: a draft is only coherent with its photos, which live in a separately-renamed IndexedDB database, so carrying the text across would resume the wizard with four empty slots under a "picked up where you left off" banner. Both legacy constants are marked and can be deleted once no browser can plausibly hold the old keys.

A local `.env` is not touched by this (it is gitignored), so an existing development database keeps its old name and keeps working; only a fresh clone follows `.env.example`. `marsad_testing` had to be created for the suite to run. The repository folder itself (`Masar-code`) and the GitHub remote were left alone — renaming either is the owner's call and breaks clones.

---

### 2026-07-30 (PaymentRecorder — closing a rule #4 gap)

**Decision:** Added the third adapter CLAUDE.md rule #4 names: `App\Contracts\PaymentRecorder`, with `RecordOnlyPaymentRecorder` as the manual-mode default, bound through `config('services.payment_recorder.driver')` exactly like `SmsGateway` and `PolicyVerifier`. `SettlementService` now calls it instead of writing the settlement and stopping there. It returns a `PaymentReceipt` value object (reference, driver, `recordedAt`, `movedFunds`).

**Reason:** Rule #4 names three adapters and only two existed — settlements went straight to the database with no seam for a payment rail. Record-only is the honest default rather than a placeholder: doc 01 §A.4 lists stable payments infrastructure among the preconditions Syria lacks, so a cash settlement is handed over in person and a repair order is worked off at a workshop. The platform's job is to state authoritatively that the insurer owes it, not to transfer it — and `movedFunds: false` says so in the type rather than in a comment.

**Impact:** The receipt reference goes onto the append-only claim timeline (`claim_events.note`) rather than a new `settlements` column. Doc 04 §2.5 already makes that table the record of every claim mutation, so no schema change was needed and the claimant sees the reference on the timeline they already read. When a real rail lands and its transaction id needs querying rather than reading, that is the point to add a column — not before.

The reference is random (`REC-YYMMDD-XXXXXX`), not derived from the settlement id: it is shown to a user, and rule #10 keeps sequential ids out of anything a user reads. A test asserts two receipts for the same settlement differ, which is what actually proves non-derivation — an earlier version asserted the id was not a substring, which is meaningless for a one-digit id inside a date.

PHPStan caught that `Settlement::$mode` had no `@property` annotation, so `->mode->value` was unverifiable even though the cast was correct; the annotation was added to the model rather than worked around at the call site.

---

### 2026-07-31 (Idempotent intake — two levels, not one)

**Decision:** Added `accident_cases.idempotency_key` (UUID, nullable, `UQ(reported_by, idempotency_key)`; additive migration, doc 04 §2.3 updated) alongside the existing `evidence_items.idempotency_key`. The wizard mints a case key with the draft and one key per photo, persists all of them in localStorage, and sends them on every attempt. The join page sends photo keys only.

**Reason:** The audit item read "the frontend never sends `idempotency_key`", and sending it would have been hollow. `evidence_items.idempotency_key` dedups *within* a case — `EvidenceService::storeOne` looks up `(case_id, idempotency_key)`. On `POST /cases` there is no case yet, so a retry creates a new one and the evidence keys land on it harmlessly, deduplicating nothing. The duplicate a citizen on a bad connection actually causes is a duplicate *accident*: two cases, two counterparty SMS invitations, two claims downstream. That needs a key on the case, checked before anything is written so a replay is a pure read.

The key is scoped to the reporter rather than globally unique because it is client-generated: one client's collision must never be able to swallow another user's report.

**Impact:** The case key lives in the draft, so it survives a reload — which is the entire point; a key minted per submit would look like idempotency while providing none. `startOver()` calls `loadDraft()` rather than resetting to `EMPTY_DRAFT`, so a genuinely new report gets a genuinely new key. Photo keys are minted per slot and reused on a retake, and `collectPhotoKeys` is built from the same filtered slot list as `collectPhotos` so the two arrays stay index-aligned; `buildCaseFormData` sends no photo keys at all rather than a partial set, since a key paired with the wrong file is worse than no key.

Not covered: the surveyor dispatch-complete path already had evidence keys from Sprint 4 but still has no UI to send them, and `POST /claims/{claim}/estimates` and the settlement endpoints have no idempotency at all. A settlement replay is currently prevented by the one-settlement-per-claim rule rather than by a key, which is enough today but is a different mechanism.

---

### 2026-07-31 (Surveyor console)

**Decision:** `DispatchResource` now nests the case's `case_no`, `occurred_at`, `region`, `location_description`, `location_verified`, coordinates and `injury_flag`. `AccidentCasePolicy::view` admits a surveyor **only for a case they hold a dispatch on**. `DemoSeeder` seeds one `dispatch_required` case assigned to the demo surveyor.

**Reason:** The dispatch payload carried `case_id` and nothing else — a sequential id the client cannot even resolve, since cases are addressed by `case_no`. A surveyor had no way to learn where to drive. And opening the case answered 403, the same shape of blocker found in Sprints 12 and 13: an endpoint group existed for a role that could not read the record it operated on. `injury_flag` is surfaced deliberately — a surveyor should know before arriving whether anyone was hurt.

The surveyor grant is scoped rather than blanket, unlike the adjudicators'. Being sent to one accident is no reason to be able to read every other one, and `Dispatch` already carries the exact link that expresses it.

**Impact:** Three roles can now read a case they are not a party to, by three different rules: adjudicators broadly, surveyors per dispatch, insurers only via the claim. `AccidentCasePolicy::view` is the single place that stays true, and the frontend route guard for `/app/cases/:caseNo` has to agree with it — it now allows `citizen` and `surveyor`, and a surveyor opening a case outside their dispatches gets the "not found or not permitted" state rather than a blank screen.

Every case in `DemoSeeder` is `fast_track`, so no dispatch was ever auto-assigned and the screen was empty on a fresh database. The seeded dispatch's zone matches the surveyor's, so the row also demonstrates zone routing (FR-C5) rather than a blind assignment.

---

### 2026-07-31 (Surveyor console — the idempotency field name)

**Decision:** The completion upload posts `photo_keys[]`, not `idempotency_keys[]` as the citizen intake and counterparty join do. The client mirrors the server's naming per endpoint rather than unifying it.

**Reason:** `CompleteDispatchRequest` has read `photo_keys` since Sprint 4, and it is **required** with `size:count(photos)` — stricter than the citizen paths, where the keys are optional. Renaming the field to match would have been a breaking API change made for tidiness, on the one endpoint whose contract was already correct and already tested.

**Impact:** Two names for one concept across the API, which a future consumer will trip over. The frontend client documents the discrepancy at the call site. If it is ever unified, `photo_keys` is the one to keep — it is the older contract and the only one that mandates the key.

---

### 2026-07-31 (Assessor estimates — closing an open authorization)

**Decision:** Added `claims.assessor_org_id` (nullable FK, additive migration, doc 04 §2.5 updated), a `POST /insurer/claims/{claim}/assessor` assignment endpoint for the insurer agent, `ClaimPolicy::estimate` scoping submission to the assigned office, and `GET /assessor/claims` + `GET /assessor/parts-prices`.

**Reason:** `SubmitEstimateRequest::authorize()` returned a bare `true`. The role middleware let any `assessor` or `workshop` through, and nothing tied them to the claim — so **any assessor office in the country could price any claim**, and there was no way to list which claims were theirs because no such relationship existed. Doc 01 §B.3 stage 6 has the insurer choosing who assesses, but no column ever recorded that choice; the missing schema was what forced the permissive `true`.

Assignment is a column rather than a join table: a claim has at most one assessor at a time, reassignment overwrites, and the history worth keeping is already appended to `claim_events`.

**Impact:** Existing estimate tests failed on the new rule and were corrected — they had been passing precisely because nothing was checked. `assessor_org_id` is nullable, so a desk assessment by the insurer's own staff assigns nobody; a claim with no assignment now accepts no external estimate at all, which is the intended behaviour but is stricter than before for any workflow that relied on the gap.

---

### 2026-07-31 (Assessor estimates — a reference you can read)

**Decision:** `GET /assessor/parts-prices` returns the in-force version of every part, and the estimate builder shows the reference price beside each line plus a warning when a line will be flagged.

**Reason:** `DamageEstimateService` flags any line deviating more than `claims.deviation_threshold_percent` from the reference list, and that list had no endpoint — an assessor was being judged against prices they could not see, discovering the flag only after submitting. `PartsPriceService::current()` mirrors `DamageEstimateService::currentPartPrice()` exactly (highest `effective_from`, then highest `version`, ignoring future-dated rows); if the two ever disagree the form would price against one revision while the flag judged another.

**Impact:** The 15% threshold is duplicated in `apps/web/src/features/assessor/estimate.ts`, like the adjudicator's override rule — the server still decides, but a form that only reveals the flag afterwards teaches nothing. Both use `>` rather than `>=`, and both compare absolute distance, so an implausibly cheap part is flagged as readily as an inflated one.

**Found while testing:** `DamageEstimateService` read `$item['part_code']` directly although `SubmitEstimateRequest` marks it `nullable` — omitting the key, which the validation permits, raised "Undefined array key" and 500'd. A labour line with no part is exactly that case. `labor_hours` already guarded with `?? null`; `part_code` was missed. Fixed and covered.

## Template

### YYYY-MM-DD

**Decision:**

**Reason:**

**Impact:**