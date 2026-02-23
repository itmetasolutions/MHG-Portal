# Landlord Registry Portal

Production-ready Next.js + Prisma portal for landlord registry, agent management, OTP login, and audit logging.

## Environment Variables

Required:
- `DATABASE_URL` (PostgreSQL connection string)
- `APP_URL` (public base URL, e.g. `https://portal.example.com`)
- `AUTH_SESSION_SECRET` (minimum 32 chars) or `SESSION_SECRET`/`JWT_SECRET` (aliases)
- `ADMIN_EMAIL` (used by seed for the pre-built admin)
- `ADMIN_PASSWORD` (used by seed for the pre-built admin)
- `OTP_EMAIL_FROM` (verified sender address)

Email provider:
- `EMAIL_PROVIDER` supports `console`, `resend`, `smtp`
- For Resend:
- `RESEND_API_KEY`
- For SMTP (optional fallback):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- Note: `resend` and `console` are implemented. `smtp` is reserved for a future provider module.

Security/rate-limit related:
- `AUTH_COOKIE_NAME` (default: `session_token`)
- `AUTH_SESSION_TTL_HOURS` (default: `12`)
- `OTP_TTL_MINUTES` (default: `10`)
- `OTP_MAX_SENDS_PER_WINDOW`
- `OTP_SEND_WINDOW_MINUTES`
- `OTP_MAX_VERIFY_ATTEMPTS_PER_CODE`
- `OTP_MAX_VERIFY_ATTEMPTS_PER_WINDOW`
- `OTP_VERIFY_WINDOW_MINUTES`
- `ALLOW_ADMIN_PASSIVE_REVERT` (`false` by default)

Docker/Postgres convenience:
- `POSTGRES_DB` (default: `landlord_registry`)
- `POSTGRES_USER` (default: `postgres`)
- `POSTGRES_PASSWORD` (default: `postgres`)
- `RUN_SEED` (`true`/`false`, default `false`)

Use `.env.example` as the template.

## Local Setup

1. Install dependencies:
```bash
npm i
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run migrations:
```bash
npx prisma migrate deploy
```

5. Apply DB constraints SQL (partial unique ACTIVE index + passive lock trigger):
```bash
psql "$DATABASE_URL" -f prisma/sql/landlord_constraints.sql
```

6. Seed the pre-built admin:
```bash
npm run prisma:seed
```

7. Start app:
```bash
npm run build
npm run start
```

## Docker (App + Postgres)

Files included:
- `Dockerfile`
- `docker-compose.yml`
- `docker/start.sh`

Run:
```bash
docker compose up -d --build
```

The app container startup script runs:
- `prisma migrate deploy`
- optional `prisma:seed` when `RUN_SEED=true` and admin credentials are present
- `npm run start`

One-time DB constraint SQL (run after DB is reachable):
```bash
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /dev/stdin < prisma/sql/landlord_constraints.sql
```

## Admin and Agent Creation

1. Seed creates exactly one admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` (idempotent).
2. Log in as admin.
3. Open `/admin/agents`.
4. Create agent users (temporary password or auto-generated password mode).
5. Agents cannot self-register.

## OTP Login Flow

1. User submits email + password at `/login`.
2. On valid credentials, server generates a 6-digit OTP, stores only hash, expiry 10 minutes.
3. OTP is sent via configured provider (`resend` recommended for production).
4. User submits OTP at `/verify-otp`.
5. On success, server issues HTTP-only signed session cookie.
6. OTP send/verify limits are enforced per user based on env settings.

## Production Hardening Notes

- Enforce HTTPS at your load balancer/reverse proxy.
- Set `NODE_ENV=production` so secure cookie mode is used.
- Use a strong, random `AUTH_SESSION_SECRET` (`SESSION_SECRET` and `JWT_SECRET` aliases supported).
- Keep `EMAIL_PROVIDER=console` only for local/dev; use `resend` in production.
- Store `RESEND_API_KEY` in a secret manager, not in source control.
- Restrict database network access (private subnet/security groups/firewall).
- Keep OTP and session settings conservative; tune rate limits to your traffic profile.
- Monitor audit logs (`/admin/audit`) for suspicious behavior.

## Test Commands

- Unit tests:
```bash
npm run test:unit
```

- Postgres integration tests:
```bash
TEST_DATABASE_URL=postgresql://... npm run test:integration:pg
```

- Full test command:
```bash
npm run test
```
