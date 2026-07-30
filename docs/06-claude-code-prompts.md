# Marsad — Claude Code Sprint Prompts
Paste ONE sprint per session, in order. Always start the session with Prompt 0 line included.
Attach/keep in repo root: `CLAUDE.md` + `01-التحليل والتوثيق/` folder (docs 01, 02, 04).

---

## Prompt 0 (prefix for EVERY sprint)
```
Read CLAUDE.md fully before doing anything. Doc 04 (database design) is the canonical
schema; doc 01 defines FR-xx requirements; doc 02 defines UC-xx use cases. Work on a
feature branch, conventional commits, and finish with: all tests green (phpunit),
pint + phpstan clean, and a short summary of what was built and what's next.
Do not invent requirements — if something is ambiguous, choose the option consistent
with the docs and note the decision in DECISIONS.md.
```

---

## Sprint 1 — Scaffold, Auth (OTP), Roles
```
Execute Sprint 1: foundation.

Tasks:
1. Scaffold monorepo: apps/api (Laravel 12, PHP 8.3, API-only, Sanctum, MySQL, Redis
   queue driver) and apps/web (React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui,
   dir="rtl", empty shell only this sprint). Root README with run instructions.
2. Tooling: Pint, PHPStan (level 6+), ESLint+Prettier, PHPUnit, Vitest. Add a
   composer script `check` and npm script `check` running everything. GitHub Actions
   CI running both on PR.
3. Migrations Phase 1 (doc 04 §6): organizations, users (phone UQ, organization_id FK,
   locale, status, phone_verified_at), spatie/laravel-permission tables. VARCHAR+CHECK
   for all enums via raw statements. utf8mb4.
4. Auth: POST /api/v1/auth/otp/request and /otp/verify (phone + 6-digit code).
   OTP sent through SmsGateway interface with a LogSmsGateway dev implementation
   (adapter rule #4 in CLAUDE.md). Rate-limit request endpoint. Sanctum token on verify.
5. RoleSeeder: the 13 roles from doc 01 §B.4. OrganizationSeeder: 2 insurers, 1
   regulator, 1 authority, 2 workshops (Arabic names).
6. Tests: feature tests for OTP flow (happy, wrong code, expired, rate-limit),
   role seeding, and an architecture test asserting controllers don't touch Eloquent
   directly (services only).

Definition of Done: `php artisan migrate:fresh --seed` works; all tests green; CI green.
```

## Sprint 2 — Vehicle & Policy Registry
```
Execute Sprint 2: registry module (FR-R1..R4, doc 04 tables vehicles + insurance_policies).

Tasks:
1. Migrations Phase 2 exactly per doc 04 §2.2 (softDeletes on vehicles only, policy
   UQ(insurer_org_id, policy_no), CHECK end_date > start_date, IX(vehicle_id, end_date)).
2. Models with relationships, factories, PHP enums (PolicyType, VerificationStatus).
3. Endpoints (citizen): CRUD /api/v1/vehicles (policy: owner only), POST
   /api/v1/vehicles/{id}/policies (photo upload), GET my policies.
4. Verification workflow: policies start `unverified`; insurer_agent endpoints
   GET /api/v1/insurer/policies?status=pending and POST .../{id}/verify|reject —
   scoped to their organization_id via policy classes. Manual mode of the
   PolicyVerifier adapter; leave the interface ready for a future API mode.
5. Scheduled command marsad:policy-expiry-reminders (30/7/1 days) dispatching
   notifications through SmsGateway; notifications table (Phase 6 pulled early is OK —
   note it in DECISIONS.md).
6. Tests: authz matrix (citizen can't verify, agent can't see other org's queue),
   expiry reminder edge dates, soft-delete + restore of a vehicle with existing policy.
```

## Sprint 3 — Accident Cases: Intake, Evidence, Triage, State Machine
```
Execute Sprint 3: case core (FR-C1..C4, UC-01/02, doc 04 §2.3). This is the heart of
the system — take the state machine seriously.

Tasks:
1. Migrations Phase 3: accident_cases, case_parties, evidence_items, dispatches
   (exact columns/constraints/indexes from doc 04).
2. CaseStatus backed enum (12 states) + transitions map + CaseLifecycleService with
   transition() throwing InvalidTransitionException → 422. Unit-test the FULL
   transition matrix (allowed and forbidden).
3. POST /api/v1/cases multipart: location, occurred_at, injury_flag, statement
   (text or voice file), >=4 photos. Server computes SHA-256 per file, stores geotag
   + captured_at, rejects duplicates hash found in OTHER cases by creating a fraud
   flag (simple fraud_flags table or metadata — decide, document).
4. Counterparty join: on case creation generate a signed, expiring deep-link token;
   send via SmsGateway. POST /api/v1/cases/join/{token} — minimal inline registration
   (phone+OTP), then party submission merges into same case; 24h scheduled job flags
   one_sided.
5. TriageService: config-driven rules (config/triage.php) → police_required /
   fast_track / dispatch_required per FR-C3. Unit tests per rule.
6. GET /api/v1/cases/{case_no} (party-scoped) returning the full case timeline
   resource. Evidence is append-only: no update/delete routes; POST supersede only.
7. Tests: full happy path citizen report → counterparty join → evidence_complete;
   duplicate-photo fraud flag; unauthorized party access blocked.
```

## Sprint 4 — Dispatch & Surveyor Field Operations
```
Execute Sprint 4: dispatch (FR-C5, UC-03).

Tasks:
1. Dispatch flow: on track=dispatch_required, DispatchService assigns nearest
   available surveyor by zone (zones = config for pilot). Endpoints for surveyor:
   GET my dispatches, POST accept / decline (reason mandatory) — decline triggers
   reassignment to next surveyor; full history kept as rows.
2. Surveyor evidence upload: same evidence pipeline, party_id null, idempotent
   uploads (client-generated UUID per file so retries don't duplicate) — this is the
   offline-tolerance contract for the frontend.
3. On-scene → completed transitions update case to evidence_complete via
   CaseLifecycleService.
4. Tests: assignment, decline→reassign chain, idempotent re-upload, authz.
```

## Sprint 5 — Fault Determination, Objections, Signed QR Reports
```
Execute Sprint 5: fault module (FR-F1..F4, UC-04/05, doc 04 §2.4).

Tasks:
1. Migrations Phase 4: liability_rules, fault_decisions, fault_allocations,
   objections, reports (all constraints incl. UQ(decision,party), CK a+b=100).
2. LiabilityRuleSeeder v1: at least 10 Arabic scenarios (rear-end, priority violation,
   lane change, reversing, red light, parked hit, opening door, roundabout, overtaking,
   MANUAL) with standard splits.
3. Adjudication: GET /api/v1/adjudication/queue (FIFO), decision endpoint pinning
   rule_id + matrix version; override requires justification (validated); allocations
   must sum to 100 (service assertion, tested).
4. Objection flow: POST within 72h window (scheduled job closes window → final),
   one objection per party (DB UQ), senior adjudicator resolve endpoint (uphold →
   amended decision, dismiss → reason).
5. Report generation (queued job on final): Arabic RTL PDF via barryvdh/laravel-dompdf,
   report_no + UUIDv4 qr_token + SHA-256 signed_hash of the PDF; store; supersede
   chain on appeal amendments.
6. Public GET /api/v1/reports/verify/{qr_token}: unauthenticated, rate-limited,
   returns validity/issued_at/status(+superseded_by report_no) ONLY — no personal data.
7. Tests: matrix versioning (old decision keeps old version), objection window
   timing, supersede chain, verify endpoint data minimization.
```

## Sprint 6 — Claims, Estimates, Settlements, SLA
```
Execute Sprint 6: claims module (FR-CL1..CL5, UC-06, doc 04 §2.5).

Tasks:
1. Migrations Phase 5: claims, claim_events, parts_prices, damage_estimates,
   estimate_items, settlements. PartsPriceSeeder v1 (~30 common parts, SYP).
2. On report final: auto-open claim per not-at-fault party against at-fault party's
   insurer; start SLA (sla_due_at from config); claim_events append-only writer in
   ClaimTimelineService — every mutation logs an event.
3. Insurer console endpoints (org-scoped): list with status/SLA filters, claim detail,
   decide (approve/partial/reject/request_info — reason_code mandatory, enum),
   request_info does NOT pause SLA.
4. Estimates: assessor/workshop submit itemized estimate; validate each line against
   active parts_prices version; deviation > config% → deviation_flag. Totals
   recalculated server-side and asserted (doc 04 G10).
5. Settlement: repair_order (workshop_org_id required) or cash; claim → settled →
   closed; SLA stops; regulator aggregate endpoint GET /api/v1/regulator/sla-report.
6. Citizen claim timeline endpoint driven by claim_events.
7. Tests: auto-open logic (incl. 50/50 → two claims), reason-code enforcement,
   deviation flagging, SLA breach job, org scoping everywhere.
```

## Sprint 7 — Dashboards, Audit, Hardening (backend wrap)
```
Execute Sprint 7: cross-cutting (FR-D1..D3, doc 04 §2.6).

Tasks:
1. Migrations Phase 6: notifications (if not pulled early), audit_logs. Observer-based
   auditing on decisions, claims decisions, role changes, reference-data versions.
2. Analytics endpoints: authority heatmap (lat/lng buckets + filters), black-spot
   ranking, regulator SLA compliance per insurer, fraud flags list for ops.
   Aggregates only — no personal data (test this explicitly).
3. Hardening: rate limiting per route group, signed temporary URLs for evidence media,
   security headers, N+1 query audit (Laravel strict mode on in dev), pagination
   everywhere.
4. DemoSeeder: one case in EVERY lifecycle state + claims in every status (frontend
   development fixture).
5. Coverage report: >=80% on app/Services; fill gaps.
```

## Sprint 8 — Frontend Foundation + Auth + Registry
```
Execute Sprint 8 (frontend begins; backend must be running via DemoSeeder data).

Tasks:
1. apps/web foundation: RTL root, Arabic i18n (ar default, en fallback), axios client
   with Sanctum token handling, TanStack Query setup, react-router with role-based
   guards mirroring backend roles, layout shells (citizen mobile-first / staff desktop).
   Apply design tokens from the design window (attach tokens file if ready; otherwise
   use CLAUDE.md palette).
2. Screens: login (phone+OTP), my vehicles + add vehicle, attach policy (photo upload,
   verification status chips), policy expiry banners.
3. Status chip component system for all case/claim states (single source of truth
   mapping enum → color/label-ar).
4. Vitest component tests for guards and chips; MSW for API mocks.
```

## Sprint 9 — Accident Reporting Wizard (the hero flow)
```
Execute Sprint 9: the reporting wizard (UC-01/02, FR-C1..C3). Mobile-first, RTL.

Tasks:
1. Wizard steps: injuries gate (emergency screen if yes) → map pin (Leaflet, manual
   fallback) → guided photo capture with overlay ghost frames (4 required shots,
   client-side compression to ~300KB) → counterparty (QR scan via camera / manual
   plate+phone) → statement (voice record or text) → review → submit.
2. Offline tolerance: persist wizard state + queued files in localStorage/IndexedDB;
   resume banner; retry uploads with the idempotency UUID contract from Sprint 4.
3. Counterparty join page (deep link): inline OTP, then same capture flow.
4. Case view: state timeline, evidence gallery, triage result, "what happens next".
5. E2E happy path with Playwright against seeded backend.
```

## Sprint 10 — Staff Consoles
```
Execute Sprint 10: desktop consoles.

Tasks:
1. Adjudicator: queue table, case room (two statements side-by-side with contradiction
   highlights from API, evidence viewer with hash/geo badges, matrix proposal card,
   confirm/override with justification, objection resolution for senior role).
2. Insurer: claims table with SLA countdown chips, claim room (report viewer, estimate
   lines with deviation flags, decide panel with reason codes, settlement form).
3. Citizen claim timeline + objection submission with 72h countdown.
4. Public QR verify page (no auth, minimal, works from phone camera scan).
5. Playwright flows: adjudicate→report→claim→settle using seeded data.
```

## Sprint 11 — Dashboards, Polish, Release
```
Execute Sprint 11: final.

Tasks:
1. Authority heatmap (Leaflet heat layer) + black-spot table; regulator SLA dashboard;
   ops fraud-flag list.
2. Accessibility pass (WCAG AA, keyboard nav, focus states in RTL), empty states,
   error states, loading skeletons, Arabic copy review (no hardcoded strings).
3. Performance: bundle analysis (<300KB gz initial), image lazy loading, query caching.
4. Release: docker-compose (api, web, mysql, redis, mailhog), .env.example complete,
   README quickstart, seed demo script, and a DEMO.md walkthrough matching the
   graduation defense scenario (report → adjudicate → claim → settle → verify QR).
```

---

### Session tips
- One sprint per Claude Code session; start each with Prompt 0 + the sprint block.
- If a sprint is too big for one session, say: "continue Sprint N from the task list,
  tasks X-Y" — the task numbering above makes that easy.
- After each sprint, commit + push before starting the next.
- If Claude Code proposes deviating from doc 04 schema, require it to update doc 04
  and DECISIONS.md in the same PR.
