# Masar - Architecture Decisions

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
- `under_review → {awaiting_counterparty, evidence_complete, escalated, cancelled}` (the `evidence_complete` branch is for a declared hit-and-run: there is no counterparty to wait on, so the case skips the wait state entirely instead of idling for the 24h timer)
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

## Template

### YYYY-MM-DD

**Decision:**

**Reason:**

**Impact:**