#!/bin/sh
set -e

# Only the api service prepares the database. The queue worker and scheduler
# share this image and must not race it into migrating the same schema.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Waiting for MySQL at ${DB_HOST}:${DB_PORT:-3306}…"
    until mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT:-3306}" --silent 2>/dev/null; do
        sleep 2
    done

    php artisan migrate --force

    # Seed once. DemoSeeder is not idempotent — it creates a fresh case in
    # every lifecycle state each run — so re-seeding on every container
    # restart would pile demo data up until the screens are unusable.
    if [ ! -f storage/app/.seeded ]; then
        php artisan db:seed --force
        touch storage/app/.seeded
        echo "Seeded. Delete storage/app/.seeded and restart to seed again."
    fi
fi

# The other services wait on the api's healthcheck, not on the database, so
# they only need the schema to already exist by the time they connect.
exec "$@"
