#!/bin/sh
set -eu

echo "[startup] Running Prisma migrations (deploy)..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    echo "[startup] RUN_SEED=true, seeding admin user..."
    npm run prisma:seed
  else
    echo "[startup] RUN_SEED=true but ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping seed."
  fi
fi

echo "[startup] Starting Next.js server..."
npm run start
