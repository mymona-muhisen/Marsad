# مسار (Masar)

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
CREATE DATABASE masar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE masar_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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

## Notes

- OTP codes are sent through a log-only `SmsGateway` adapter in dev (see `storage/logs/laravel.log`
  after calling `/api/v1/auth/otp/request`) — no real SMS carrier is wired up yet (CLAUDE.md rule #4).
- Local queue/cache driver is `database`, not `redis` — see [DECISIONS.md](DECISIONS.md) for why.
- Architectural/implementation decisions not obvious from the docs are logged in
  [DECISIONS.md](DECISIONS.md).
