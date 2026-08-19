#!/usr/bin/env bash
# E2E now needs a real server (auth requires a real DB), not just `vite
# preview` serving static files. Spins up a throwaway Postgres for the
# run and tears it down after, success or failure.
set -euo pipefail

CONTAINER_NAME="sesame-e2e-pg"
DB_PORT="5434"

cleanup() {
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sesame \
  -p "$DB_PORT:5432" postgres:17 >/dev/null

echo "Waiting for Postgres..."
until docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

export DATABASE_URL="postgres://postgres:postgres@localhost:$DB_PORT/sesame"

npx playwright test
