# CLAUDE.md — Masar (مسار)
Smart Traffic Accident & Insurance Management Platform for Syria. Graduation project, production-quality bar.

## Context documents (read before coding)
- `01-التحليل والتوثيق/01-business-analysis.md` — domain, workflow, FR/NFR (FR-xx codes)
- `01-التحليل والتوثيق/02-system-analysis.md` — use cases UC-01..07, activity flows
- `01-التحليل والتوثيق/04-database-design.md` — **canonical schema**: 22 tables, constraints, indexes, migration phases 1–7. Follow it exactly; deviations require updating that doc.

## Stack
Laravel 12 (PHP 8.3) API-only + Sanctum + MySQL 8 + Redis queues · React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query + react-router + react-hook-form/zod · Monorepo: `apps/api` (Laravel), `apps/web` (React).

## Architecture rules (non-negotiable)
1. **Versioned REST** under `/api/v1`. Controllers thin: FormRequest → Service → API Resource. Business logic lives in `app/Services`, never in controllers/models.
2. **Case lifecycle is a state machine** (12 states, PHP backed enum `CaseStatus` + allowed-transitions map). Every transition goes through `CaseLifecycleService::transition()` — throws `InvalidTransitionException` (422). Same pattern for `ClaimStatus`.
3. **Evidence is append-only**: no update/delete endpoints; supersede via `superseded_by`. SHA-256 computed server-side on upload; duplicate hash across cases ⇒ create fraud flag.
4. **Every external dependency behind an adapter interface** with a manual-mode default: `SmsGateway` (log driver in dev), `PolicyVerifier` (manual queue), `PaymentRecorder` (record-only). Bind in service providers; never call vendors directly.
5. **Versioned reference data** (`liability_rules`, `parts_prices`): new version rows with `effective_from`, never UPDATE in place. Decisions/estimates pin the version id.
6. **Enums**: DB = VARCHAR + CHECK (raw statement in migration), code = PHP backed enum. Never MySQL ENUM.
7. **FK actions**: RESTRICT default; CASCADE only `estimate_items`, `user_roles`, `notifications.user_id`.
8. **AuthZ**: spatie/laravel-permission, 13 roles (doc 01 §B.4); org-scoped roles check `organization_id`. Policies per model; no ability checks inline in controllers.
9. **Audit**: observer-based audit log on privileged mutations (decisions, claims, role changes, reference data).
10. **Public endpoints** never expose sequential ids — `case_no`, `report_no`, `qr_token` only. QR verify endpoint is unauthenticated + rate-limited and returns validity metadata only.

## Frontend rules
RTL root (`dir="rtl"`), Arabic-first (i18n keys ar/en, ar default) · TanStack Query for ALL server state (no fetch-in-useEffect) · wizard state persisted to localStorage (offline tolerance; image compression client-side before upload ~300KB) · role-based route guards mirror backend roles · status chips/colors from design tokens (see 05-design-brief.md).

## Build order (sprints — follow migration phases in doc 04 §6)
1. Scaffold monorepo, CI (pint, phpstan, eslint, vitest, phpunit), auth (phone+OTP mock via adapter), roles seed.
2. Registry: vehicles + policies + verification queue.
3. Cases: wizard endpoints (multipart evidence, hashing), counterparty join via signed SMS deep-link token, triage engine (config-driven rules), state machine.
4. Dispatch + surveyor evidence (offline-queue-friendly: idempotent uploads, resumable).
5. Fault: liability matrix engine + adjudication queue + objections + signed PDF report (dompdf, Arabic RTL) + QR verify page.
6. Claims: auto-open on final report, insurer console endpoints (reason codes mandatory), estimates vs parts_prices with deviation flags, settlements, claim_events timeline, SLA timers (scheduled job).
7. Dashboards: heatmap aggregates, SLA compliance, fraud flags. 8. Hardening: rate limits, signed URLs for media, test coverage ≥80% on services.

## Testing (Definition of Done per feature)
Feature tests for every endpoint (happy + authz + validation) · unit tests: state machine transitions (full matrix), triage rules, liability matrix versioning, estimate deviation calc, hash-duplicate fraud flag · factories for all models; `DemoSeeder` creates one case in every lifecycle state.

## Conventions
Conventional commits · PR per feature branch → develop · Arabic user-facing strings in lang files (never hardcoded) · money = DECIMAL(14,2) SYP, cast to value object · dates ISO in API, localized in UI.
