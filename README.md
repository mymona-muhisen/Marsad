# مرصد (Marsad)

Smart Traffic Accident & Insurance Management Platform for Syria.

Monorepo:
- `apps/api` — Laravel 12 (PHP 8.2+) API-only backend, Sanctum auth, MySQL 8, queued jobs.
- `apps/web` — React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui frontend (Arabic-first, RTL).

See [CLAUDE.md](CLAUDE.md) for architecture rules and [docs/](docs/) for the business analysis,
system analysis, and database design documents that drive every sprint.

## Prerequisites

- PHP 8.2+ with the `pdo_mysql` extension
- Composer 2.x
- MySQL 8 (or MariaDB 10.4+ for local dev)
- Node.js 20+ and npm

## Backend setup (`apps/api`)

```bash
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
```

Create the database (name/host/credentials must match `.env`):

```sql
CREATE DATABASE marsad CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE marsad_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
php artisan migrate:fresh --seed
php artisan serve
```

Run checks:

```bash
composer check   # pint --test + phpstan + phpunit
```

## Frontend setup (`apps/web`)

```bash
cd apps/web
npm install
npm run dev
```

Run checks:

```bash
npm run check    # eslint + typecheck + vitest
```

## Running with Docker

```bash
docker compose up --build
```

| | |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:8000 |
| Mail catch-all | http://localhost:8025 |

The stack brings up MySQL, Redis, Mailpit, the API, the **queue worker**, the
**scheduler**, and the Vite dev server. The last two matter: without the worker no
signed PDF report is ever generated, and without the scheduler the 72-hour objection
window never lapses, so no case reaches `final` and no claim opens on its own.

Migrations and the one-time seed run in a separate `api-migrate` service, so the worker
and scheduler cannot race the API into building the same schema. To re-seed, delete the
sentinel and restart: `docker compose run --rm api-migrate sh -c 'rm -f storage/app/.seeded'`.

OTP codes are still written to the log rather than sent — read them with
`docker compose logs -f api`.

Ports are offset from the defaults (MySQL on **3307**, Redis on **6380**) because this
project is developed against XAMPP, which already holds 3306.

Two deliberate differences from the manual setup above: this stack runs
`QUEUE_CONNECTION=redis`, the target CLAUDE.md specifies — the `database` default exists
only because no local Redis server was available — and it uses Mailpit rather than the
unmaintained MailHog. Nothing in the app sends mail today (`NotificationChannel` is
`sms`/`inapp`), so that inbox stays empty by design.

> **Not verified end to end.** Docker is not installed in the environment this was
> written in, so unlike the rest of the project the compose stack has never been booted.
> The YAML and the dependency graph were checked by parsing, not by running.

## Demo sign-ins (dev only)

> For a scripted end-to-end walkthrough (report → adjudicate → claim → settle → verify QR), see
> [DEMO.md](DEMO.md). It includes the two steps that are easy to miss: the queue worker must be
> running, and the 72-hour objection window has to be closed deliberately.

`migrate:fresh --seed` creates one account per role and prints the table. Sign in at `/login` with
the phone, then read the OTP out of `storage/logs/laravel.log` (or run `php artisan pail` to watch
it live). These are seeded only when the app is **not** in production.

| Phone | Role | | Phone | Role |
|---|---|---|---|---|
| `0900000001` | citizen — owns all the demo cases and claims | | `0900000008` | workshop |
| `0900000002` | surveyor (zoned to دمشق) | | `0900000009` | regulator |
| `0900000003` | adjudicator | | `0900000010` | authority |
| `0900000004` | senior_adjudicator | | `0900000011` | call_center |
| `0900000005` | insurer_agent | | `0900000012` | admin |
| `0900000006` | insurer_admin | | `0900000013` | super_admin |
| `0900000007` | assessor | | | |

The citizen account owns a case in every one of the 12 lifecycle states and a claim in every one of
the 8 claim statuses, so the citizen screens are populated rather than empty. Note that only the
citizen screens (cases, claims, vehicles, the reporting wizard) are built — the other roles reach
guarded routes that still render a placeholder.

The fixed phone is not a credential: sign-in is still phone + OTP, and the code is random. What it
buys you is an account that already holds a role and an organization, since the admin console that
would otherwise grant them is unbuilt.

## Notes

- OTP codes are sent through a log-only `SmsGateway` adapter in dev (see `storage/logs/laravel.log`
  after calling `/api/v1/auth/otp/request`) — no real SMS carrier is wired up yet (CLAUDE.md rule #4).
- Local queue/cache driver is `database`, not `redis` — see [DECISIONS.md](DECISIONS.md) for why.
- Architectural/implementation decisions not obvious from the docs are logged in
  [DECISIONS.md](DECISIONS.md).
