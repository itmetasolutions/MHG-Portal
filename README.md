# Letting Agency Portal

Production-ready Next.js + Prisma portal for letting agency operations, agent management, OTP login, and audit logging.

## GitHub Repository

This project is now in:
- `https://github.com/itmetasolutions/MHG-Portal.git`

If you need to push future local updates:
```bash
git add -A
git commit -m "your message"
git push origin main
```

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

## Deploy to Vercel (GitHub)

1. Prepare production database (PostgreSQL)
- Use Neon, Supabase, Railway Postgres, RDS, or your own Postgres.
- Copy connection string as `DATABASE_URL`.

2. Import repository into Vercel
- Go to Vercel dashboard -> `Add New...` -> `Project`.
- Import `itmetasolutions/MHG-Portal`.
- Framework preset: `Next.js` (auto-detected).

3. Configure Vercel environment variables
- Required in Production:
- `DATABASE_URL`
- `APP_URL` (your Vercel production URL, e.g. `https://mhg-portal.vercel.app`)
- `AUTH_SESSION_SECRET` (or `SESSION_SECRET` / `JWT_SECRET`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `EMAIL_PROVIDER` (`resend`)
- `OTP_EMAIL_FROM` (verified sender in Resend)
- `RESEND_API_KEY`
- Important: set `EMAIL_PROVIDER` explicitly in Vercel (recommended `resend`), otherwise it falls back to `console` mode.
- Recommended:
- `OTP_TTL_MINUTES=10`
- `OTP_MAX_SENDS_PER_WINDOW=5`
- `OTP_SEND_WINDOW_MINUTES=10`
- `OTP_MAX_VERIFY_ATTEMPTS_PER_CODE=5`
- `OTP_MAX_VERIFY_ATTEMPTS_PER_WINDOW=10`
- `OTP_VERIFY_WINDOW_MINUTES=10`
- `ALLOW_ADMIN_PASSIVE_REVERT=false`

4. Run DB migrations and SQL constraints (one-time per environment)
- From your machine or CI with production env loaded:
```bash
npx prisma migrate deploy
psql "$DATABASE_URL" -f prisma/sql/landlord_constraints.sql
```

5. Seed pre-built admin (one-time)
- With production env vars set:
```bash
npm run prisma:seed
```
- Seed is idempotent for the admin bootstrap behavior.

6. Deploy
- Trigger deploy from Vercel UI (or push to `main` if auto-deploy is enabled).
- Vercel will run `npm install` and `npm run build`.

7. Post-deploy check
- Open `/login`, test email+password+OTP flow.
- Login as seeded admin, create agents at `/admin/agents`.
- Verify audit logs at `/admin/audit`.

## GitHub Actions: Migrate Before Production Deploy

Workflow file:
- `.github/workflows/prod-migrate-and-deploy.yml`

What it does on push to `main` (or manual run):
1. Installs dependencies
2. Runs `prisma migrate deploy` against production DB
3. Applies `prisma/sql/landlord_constraints.sql`
4. Triggers Vercel production deployment via Deploy Hook

Required GitHub repository secrets:
- `PRODUCTION_DATABASE_URL` (production PostgreSQL URL)
- `VERCEL_DEPLOY_HOOK_URL` (from Vercel Project -> Settings -> Git -> Deploy Hooks)

Recommended for strict ordering:
- Disable automatic production deploys from direct Git pushes in Vercel (or avoid relying on them), and use this workflow + deploy hook path as the production release path.

## Vercel Build Troubleshooting

If you see a build failure around `Collecting page data` (sometimes with a generic `TypeError`), check:

1. `EMAIL_PROVIDER` is set in Vercel (`resend` recommended).
2. Required env vars are present in Vercel Production:
- `DATABASE_URL`
- `APP_URL`
- `AUTH_SESSION_SECRET` (or `SESSION_SECRET` / `JWT_SECRET`)
- `OTP_EMAIL_FROM`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `RESEND_API_KEY` (if `EMAIL_PROVIDER=resend`)
3. Redeploy after updating env vars (Vercel does not retroactively apply env vars to completed builds).

This project pins Node to `20.x` in `package.json` for consistent Vercel builds.

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
