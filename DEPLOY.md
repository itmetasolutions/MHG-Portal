# Complete Deployment Guide — MHG Landlord Portal

> **Who is this for?** Complete beginners. Every step is explained in plain English.
> **Stack:** Vercel (hosting) · Neon (database) · Resend (email) · GitHub (code)

---

## What you will need (all free to start)

| Service | What it does | Sign-up link |
|---------|-------------|--------------|
| **GitHub** | Stores your code | https://github.com |
| **Vercel** | Hosts your website | https://vercel.com |
| **Neon** | PostgreSQL database in the cloud | https://neon.tech |
| **Resend** | Sends OTP emails | https://resend.com |

---

## Overview (5 stages)

```
Stage 1 → Push code to GitHub
Stage 2 → Create Neon database
Stage 3 → Set up Resend email
Stage 4 → Deploy to Vercel
Stage 5 → Run first migration + create admin account
```

---

## Stage 1 — Push your code to GitHub

### 1.1 Create a GitHub repository

1. Go to https://github.com and sign in (or create a free account)
2. Click the **+** button (top right) → **New repository**
3. Give it a name, e.g. `mhg-portal`
4. Set it to **Private** (recommended)
5. Click **Create repository**

### 1.2 Push the code

Open a terminal in the project folder and run:

```bash
git remote add origin https://github.com/YOUR-USERNAME/mhg-portal.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## Stage 2 — Create a Neon database

Neon gives you a free PostgreSQL database in the cloud.

### 2.1 Sign up and create a project

1. Go to https://neon.tech and sign in (use GitHub for convenience)
2. Click **New Project**
3. Name: `mhg-portal`
   Region: choose the one closest to your users (e.g. EU Frankfurt for UK)
4. Click **Create project**

### 2.2 Get your connection string

After creation you will see a connection string that looks like:

```
postgresql://neondb_owner:XXXX@ep-cool-name-XXXX.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

1. Click **Copy** next to the connection string
2. **Save it somewhere safe** — you will need it in Stage 4

> **Important:** Keep the `?sslmode=require` at the end. Neon requires SSL.

---

## Stage 3 — Set up Resend email

Resend sends your OTP codes to users.

### 3.1 Sign up

1. Go to https://resend.com and create a free account
2. Verify your email address

### 3.2 Add and verify your domain (or use their test domain)

**Option A – Use your own domain (recommended for production):**
1. Go to **Domains** → **Add Domain**
2. Enter your company domain (e.g. `morehomesgroup.com`)
3. Follow the DNS instructions to verify ownership (add the TXT and MX records in your domain registrar's control panel)
4. Wait for verification (usually 5–30 minutes)
5. Once verified, your `OTP_EMAIL_FROM` will be something like `noreply@morehomesgroup.com`

**Option B – Use Resend's sandbox (for testing only):**
- Free accounts can send to your own verified email without domain setup
- `OTP_EMAIL_FROM` = `onboarding@resend.dev`
- Note: This only works for emails registered on your Resend account

### 3.3 Create an API key

1. In Resend dashboard → **API Keys** → **Create API Key**
2. Name: `mhg-portal-production`
3. Permission: **Sending access**
4. Click **Add**
5. **Copy the key** — it starts with `re_` — you will not see it again

---

## Stage 4 — Deploy to Vercel

### 4.1 Sign up and import your project

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New** → **Project**
3. Find your `mhg-portal` repository and click **Import**
4. Vercel will auto-detect it as a Next.js project — leave framework settings as-is

### 4.2 Add environment variables

Before clicking **Deploy**, scroll down to **Environment Variables** and add all of these:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your Neon connection string | Copied in Stage 2.2 |
| `AUTH_SESSION_SECRET` | A random 32+ character string | See below for how to generate |
| `EMAIL_PROVIDER` | `resend` | Exact value, lowercase |
| `OTP_EMAIL_FROM` | `noreply@yourdomain.com` | Your verified sender address |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | Copied in Stage 3.3 |
| `APP_URL` | `https://your-project.vercel.app` | Your Vercel URL (fill after first deploy) |
| `NODE_ENV` | `production` | Exact value, lowercase |
| `ADMIN_EMAIL` | `admin@yourdomain.com` | Your admin login email |
| `ADMIN_PASSWORD` | A strong password | Keep this secure |

**How to generate a session secret:**

Run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `AUTH_SESSION_SECRET`.   

### 4.3 Deploy

1. Click **Deploy**
2. Wait 2–3 minutes for the build to complete
3. You will get a URL like `https://mhg-portal-abc123.vercel.app`
4. Go back to Vercel → **Settings** → **Environment Variables**
   Update `APP_URL` to your actual URL (e.g. `https://mhg-portal-abc123.vercel.app`)
5. Redeploy: **Deployments** → click the three dots on latest → **Redeploy**

> **Note:** The site will be live but you cannot log in yet — the database has no tables or admin user. Fix that in Stage 5.

---

## Stage 5 — Run database migrations and create admin account

The database exists on Neon but is empty. We need to:
1. Create all the tables (`prisma migrate deploy`)
2. Apply custom SQL constraints
3. Seed the admin account

### 5.1 Set up your local environment

On your computer, create a `.env` file in the project folder:

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
DATABASE_URL=postgresql://neondb_owner:XXXX@ep-cool-name-XXXX.eu-central-1.aws.neon.tech/neondb?sslmode=require
AUTH_SESSION_SECRET=your-32-char-secret-here
EMAIL_PROVIDER=resend
OTP_EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_xxxxxxxxxxxx
APP_URL=https://your-project.vercel.app
NODE_ENV=production
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongPassword123
```

### 5.2 Install dependencies (first time only)

```bash
npm install
```

### 5.3 Run database migrations

This creates all the tables in your Neon database:

```bash
npx prisma migrate deploy
```

You should see output like:
```
Applying migration `20241201_init`...
All migrations have been applied.
```

### 5.4 Apply custom SQL constraints

```bash
npx prisma db execute --file prisma/sql/landlord_constraints.sql
```

### 5.5 Create the admin account

```bash
npm run prisma:seed
```

This creates the admin user with the email and password you set in `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 5.6 Test the login

1. Open your Vercel URL (e.g. `https://mhg-portal-abc123.vercel.app`)
2. Click **Sign In**
3. Enter your `ADMIN_EMAIL` and `ADMIN_PASSWORD`
4. You will receive a 6-digit OTP code by email
5. Enter the code on the verification page
6. You should land on the Dashboard ✓

---

## Stage 6 (Optional) — Connect a custom domain

1. In Vercel → **Settings** → **Domains**
2. Add your domain (e.g. `portal.morehomesgroup.com`)
3. Follow Vercel's DNS instructions (add a CNAME or A record in your domain registrar)
4. Once verified, update `APP_URL` in Vercel environment variables to your custom domain
5. Redeploy for the change to take effect

---

## Setting up GitHub Actions for automatic deployments

The project includes a workflow file at `.github/workflows/prod-migrate-and-deploy.yml` that automatically:
- Runs database migrations when you push to `main`
- Triggers a new Vercel deployment

### Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these two secrets:

| Secret name | Value |
|-------------|-------|
| `PRODUCTION_DATABASE_URL` | Your Neon connection string |
| `VERCEL_DEPLOY_HOOK_URL` | See below |

**How to get the Vercel deploy hook URL:**
1. Vercel → **Settings** → **Git** → **Deploy Hooks**
2. Create a hook named `github-actions`, branch `main`
3. Copy the URL — it looks like `https://api.vercel.com/v1/integrations/deploy/xxxxx`

Once both secrets are added, every push to `main` will automatically migrate and redeploy.

---

## Troubleshooting

### "Build failed" on Vercel
- Check the build logs in Vercel → **Deployments** → click on the failing deployment
- The most common cause is a missing environment variable
- Make sure all variables from Stage 4.2 are set

### OTP emails not arriving
- Check your Resend dashboard → **Logs** to see if emails were sent
- Check your spam/junk folder
- Make sure `OTP_EMAIL_FROM` matches your verified Resend domain

### "Database connection refused"
- Make sure `DATABASE_URL` has `?sslmode=require` at the end
- In Neon dashboard, check the project is not suspended (free tier pauses after inactivity)

### "Invalid credentials" on login
- The admin account must be created with `npm run db:seed` (Stage 5.5)
- Make sure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` match what you typed

### Neon database pauses (free tier)
- Free Neon databases pause after 5 minutes of inactivity
- The first request after a pause takes 1–2 seconds longer to wake up
- Upgrade to Neon's paid plan to disable auto-suspend

---

## Quick Reference — All Environment Variables

```bash
# Required
NODE_ENV=production
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
APP_URL=https://your-vercel-url.vercel.app
AUTH_SESSION_SECRET=<32+ random characters>

# Email
EMAIL_PROVIDER=resend
OTP_EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_xxxxxxxxxxxx

# Optional (defaults shown)
AUTH_COOKIE_NAME=session_token
AUTH_SESSION_TTL_HOURS=12
OTP_TTL_MINUTES=10
OTP_MAX_SENDS_PER_WINDOW=5
OTP_SEND_WINDOW_MINUTES=10
OTP_MAX_VERIFY_ATTEMPTS_PER_CODE=5
OTP_MAX_VERIFY_ATTEMPTS_PER_WINDOW=10
OTP_VERIFY_WINDOW_MINUTES=10
ALLOW_ADMIN_PASSIVE_REVERT=false

# Seed only (used once to create admin)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourPassword
```

---

## Useful Commands

```bash
# Install dependencies
npm install

# Run locally (development)
npm run dev

# Run database migrations
npx prisma migrate deploy

# Apply custom SQL constraints
npx prisma db execute --file prisma/sql/landlord_constraints.sql

# Seed admin user
npm run prisma:seed

# View database in browser
npx prisma studio

# Check TypeScript errors
npm run typecheck

# Run tests
npm test
```

---

*More Homes Group · Landlord Registry Portal*
