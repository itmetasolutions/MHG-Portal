# MHG Portal – User & Developer Guide

> Version: 2.0 (Post-Revamp)  
> Last updated: 2026-04-23

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Agent Workflows](#2-agent-workflows)
   - 2.1 [Starting a Call — Dashboard Lookup](#21-starting-a-call--dashboard-lookup)
   - 2.2 [Interested Flow](#22-interested-flow)
   - 2.3 [Follow Up Flow](#23-follow-up-flow)
   - 2.4 [Not Interested Flow](#24-not-interested-flow)
   - 2.5 [Adding a Property to an Existing Landlord](#25-adding-a-property-to-an-existing-landlord)
   - 2.6 [Closing a Sale (Private Property)](#26-closing-a-sale-private-property)
   - 2.7 [Closing a Sale (Shared Property / Room)](#27-closing-a-sale-shared-property--room)
   - 2.8 [Adding a Potential Tenant](#28-adding-a-potential-tenant)
3. [Admin Workflows](#3-admin-workflows)
4. [Page Reference](#4-page-reference)
5. [Navigation Map](#5-navigation-map)
6. [Business Rules](#6-business-rules)
7. [Auto-Generated Data](#7-auto-generated-data)
8. [Developer Reference](#8-developer-reference)

---

## 1. OVERVIEW

The MHG Portal is a property management CRM for agents and admins. It manages the full lifecycle from first contact with a landlord through to closing a sale and onboarding a tenant.

### Key Principles

- **Every landlord starts from a phone lookup.** Agents do not add landlords manually.
- **Every property is linked to a landlord.** Properties are created via the Interested flow or the Add Property form.
- **Every tenant comes from a closed sale.** Tenants are never added manually.
- **All call records and daily reports are auto-generated.** Agents never submit these manually.
- **Follow-up leads are locked.** When an agent schedules a follow-up, that landlord number is locked to them for 24 hours past the scheduled time.

---

## 2. AGENT WORKFLOWS

### 2.1 Starting a Call — Dashboard Lookup

Every call starts with a phone number lookup on the **Dashboard**.

**Steps:**
1. Go to **Dashboard** (`/dashboard`).
2. Find the **Lookup Strip** in the sidebar or top section.
3. Type the landlord's phone number and press **Lookup**.

**Three outcomes:**

---

#### Outcome A: Number belongs to another agent's landlord

- Display: `"This landlord is registered with another agent."`
- No action available — do not call this number.
- The owner agent receives an in-app notification that their landlord was searched.

---

#### Outcome B: Number belongs to your own landlord

- Display: Landlord name card.
- Action button: **Add Property** → goes to `/start/interested?phone=<number>&landlordId=<id>` (interested form, pre-bound to this landlord).

---

#### Outcome C: Number not found

- Display: `"No landlord found."`
- Three action buttons appear:
  - **Interested** → go to `/start/interested?phone=<number>`
  - **Follow Up** → go to `/start/follow-up?phone=<number>`
  - **Not Interested** → logs call immediately, no page change

---

### 2.2 Interested Flow

Used when a landlord on the call is ready to list a property.

**Path:** `/start/interested?phone=<number>`

**What to fill in:**

**Section 1 — Landlord Details:**
| Field | Required | Notes |
|-------|----------|-------|
| First Name | Yes | |
| Last Name | Yes | |
| Phone | Yes | Pre-filled from lookup; editable |
| Email | No | |

**Section 2 — Property Type:**
Choose one:
- **Private (Single Tenancy)** — one tenant for the whole property
- **Shared (Multiple Rooms)** — rooms let individually

**Section 3 — Property Category** (Private only):
- House
- Flat
- Studio Flat

> Studio Flat hides Total Rooms / Available Rooms fields (they are not applicable).

**Section 4 — Property Details:**
| Field | Required | Notes |
|-------|----------|-------|
| Description | Yes | 10–5000 chars |
| Address Line 1 | Yes | |
| Address Line 2 | No | |
| City / Town | Yes | |
| Postcode | Yes | Auto-uppercased as you type |

**Section 5 — Financials (Private):**
| Field | Required | Notes |
|-------|----------|-------|
| Rent / Month (£) | Yes | |
| Rent / Week (£) | Auto | Calculated: (rent × 12 / 52), non-editable |
| Deposit (£) | Yes | |
| Expected Commission (£) | Yes | Amount in pounds, not a percentage |
| Total Rooms | No (Yes if not Studio) | |
| Available Rooms | No (Yes if not Studio) | |

**Section 5 — Rooms (Shared):**

Add at least one room row. Each row:
| Field | Required |
|-------|----------|
| Room Type | Yes (Studio / Single / Double / Ensuite / Loft) |
| Rent / Month (£) | Yes |
| Deposit (£) | Yes |
| Expected Commission (£) | Yes |

**Section 6 — Amenities:**
All Boolean — tick the ones that apply:
- Garden, Parking, Bills Included, Balcony, Disabled Access, Broadband Included

Selects:
- Living Room: None / Private / Shared
- Furnished: Yes / No
- Living Landlord: No / Yes
- DSS Accepted: Yes / No
- Pets Allowed: No / Yes
- Children Allowed: Yes / No
- Couples Allowed: Yes / No

**Section 7 — Status & Date:**
- Availability Date (required)
- Listing Status: **Draft** (saved, not live) or **Available** (live listing)

**On Submit:**
1. Landlord record is created (or updated if the number was previously a potential landlord).
2. Property record is created with auto-generated reference (`PROP-2026-XXXXXX`).
3. A `CallLog` entry is created with status `CONFIRMED`.
4. Landlord is auto-added to your Dialer Contacts.
5. Redirect to the new landlord's detail page.

---

### 2.3 Follow Up Flow

Used when the landlord needs more time before deciding, and you schedule a callback.

**Path:** `/start/follow-up?phone=<number>`

**What to fill in:**

| Field | Required | Notes |
|-------|----------|-------|
| First Name | Yes | |
| Last Name | Yes | |
| Phone | Yes | Pre-filled |
| Email | No | |
| Follow-up Date & Time | Yes | Must be in the future |

**On Submit:**
1. A `PotentialLandlord` record is created.
2. The lead is **locked to you** until the scheduled time + 24 hours.
3. A `CallLog` entry is created with status `FOLLOW_UP`.
4. Landlord is auto-added to your Dialer Contacts.
5. You will receive:
   - An **email reminder 1 hour** before the scheduled time.
   - An **email + in-app notification 5 minutes** before the scheduled time.
6. Redirect to `/potential-landlords`.

**When the follow-up time arrives:**
1. Go to **Potential Landlords** (`/potential-landlords`).
2. Find the record (overdue entries are highlighted red).
3. Click:
   - **Interested** — takes you to the Interested flow pre-filled with their phone number.
   - **Reschedule** — takes you to the Follow Up form pre-filled to pick a new time.

> If you do not act within 24 hours of the scheduled time, the lead automatically **unlocks** and becomes available for other agents.

---

### 2.4 Not Interested Flow

Used when the landlord is not interested at all.

**From the dashboard lookup strip (Outcome C):**
- Click **Not Interested** next to the phone number.
- A `CallLog` entry is immediately created with status `NOT_INTERESTED`.
- No page navigation — you stay on the dashboard.

---

### 2.5 Adding a Property to an Existing Landlord

When you already have a landlord in the system and want to add a new property.

**Path:** `/properties/new` (via "Add Property" button on the Properties page)

**Steps:**
1. Go to **Properties** → click **+ Add Property**.
2. **Step 1** — Search for the landlord by name or phone from your list.
3. Click their name to select them.
4. **Step 2** — Fill in the full property form (same as Interested flow, Section 2–7 above).
5. Submit → property is created and you are redirected to `/properties`.

> This does **not** create a new landlord or a call log. It is a standalone property creation for an existing landlord.

---

### 2.6 Closing a Sale (Private Property)

**Path:** `/properties/[id]/close-sale`

Available only when the property status is **Available**.

**What to fill in:**

**Tenant Form (Section 1):**
| Field | Required |
|-------|----------|
| First Name | Yes |
| Last Name | Yes |
| Phone | Yes |
| Email | No |
| Accommodation Type | Yes (e.g. HMO, Private) |
| Country of Origin | Yes |
| Nationality | Yes |
| Room Type | Yes |
| Number of Occupants | Yes |
| Number of Children | Yes |
| On DSS | Yes |
| Currently Employed | Yes |
| Annual Income (£) | Yes |
| Current Living Postcode | Yes |
| Workplace Postcode | Yes |
| Max Budget (£) | Yes |
| Profession | Yes |
| Immigration Status | Yes |
| Move-in Date | Yes |

**Financial Fields (Section 2):**
| Field | Required | Notes |
|-------|----------|-------|
| Final Rent (£) | Yes | Agreed monthly rent between landlord and tenant |
| Company Commission (£) | Yes | Total company earnings from this deal |

> Your personal commission is calculated automatically from the admin CommissionConfig and is shown after submission. You do not set it yourself.

**On Submit:**
1. Tenant record is created.
2. Sale record is created (includes final rent, company commission, your agent commission).
3. Property status changes to **Closed**.
4. Sale appears on `/sales`. Tenant appears on `/tenants`.

---

### 2.7 Closing a Sale (Shared Property / Room)

**Path:** `/properties/[id]/rooms/[roomId]/close`

Same as above, but applies to a single **room** on a shared property.

- Room status changes to **Closed** after sale.
- If **all rooms** on the property are closed → property status automatically becomes **Closed**.

---

### 2.8 Adding a Potential Tenant

Potential Tenants are pre-sale leads — people who are looking for accommodation but have not been matched to a property yet.

**Path:** `/potential-tenants` → click **+ Add Potential Tenant**

This opens a full form with all the same fields as the Tenant Form above (see §2.6). Fill in what you know — all fields except First Name, Last Name, and Phone are optional for potential tenants.

**On Submit:** A `PotentialTenant` record is created. It does **not** create a sale or a tenant record.

When a potential tenant is matched to a property and you close a sale, the actual `Tenant` record is created through the Close Sale flow.

---

## 3. ADMIN WORKFLOWS

Admins have access to all agent data plus the following additional capabilities:

### 3.1 Commission Configuration

**Path:** `/admin/commission-config`

- Set commission type: **Fixed** (same amount for every deal) or **Flexible** (tiered by deal size).
- Agents never see this config or how their commission is calculated.

### 3.2 User Management

**Path:** `/admin/agents`

- Create new agent accounts.
- Deactivate agents (removes their session; their data is retained).

### 3.3 Property Edit Approvals

**Path:** `/admin/edit-approvals`

- Agents submit edit requests for properties they own.
- Admin reviews and approves or rejects.

### 3.4 Daily Reports (All Agents)

**Path:** `/admin/reports` (or `/daily-reports` with agent filter)

- View auto-calculated activity for any agent over any date range.

### 3.5 Publishing Properties to Website

**Path:** Property detail page → toggle `Published to Website`

- Admin can mark any property as published, which makes it visible via the public website API.
- Agents cannot toggle this.

### 3.6 Audit Log

**Path:** `/admin/audit-log`

- Full history of all mutations (creates, updates, deletes) across all entities.

---

## 4. PAGE REFERENCE

| Page | Path | Who Can Access | Purpose |
|------|------|---------------|---------|
| Dashboard | `/dashboard` | Agent, Admin | Phone lookup + stats overview |
| Start Call | `/start` | Agent | 3-option landing after lookup |
| Interested Flow | `/start/interested` | Agent | Create landlord + property |
| Follow Up Flow | `/start/follow-up` | Agent | Schedule a callback |
| Landlords | `/landlords` | Agent (own), Admin (all) | Landlord registry — no manual add |
| Landlord Detail | `/landlords/[id]` | Agent (own), Admin | View landlord info + their properties |
| Properties | `/properties` | Agent (own), Admin (all) | Property listing |
| Property Detail | `/properties/[id]` | Agent (own), Admin | View/edit property, close sale |
| Add Property | `/properties/new` | Agent | Add property to existing landlord |
| Close Sale | `/properties/[id]/close-sale` | Agent (own), Admin | Close a private property sale |
| Close Room Sale | `/properties/[id]/rooms/[roomId]/close` | Agent (own), Admin | Close a room-level sale |
| Potential Landlords | `/potential-landlords` | Agent (own), Admin | Follow-up leads + reschedule/convert |
| Potential Tenants | `/potential-tenants` | Agent, Admin | Pre-sale tenant leads |
| Tenants | `/tenants` | Agent (own), Admin (all) | Tenants from closed sales |
| Sales | `/sales` | Agent (own), Admin (all) | Sales history |
| Call History | `/call-records` | Agent (own), Admin (all) | Auto-generated call log |
| Daily Reports | `/daily-reports` | Agent (own), Admin (all) | Auto-calculated activity stats |
| Dialer | `/dialer` | Agent, Admin | VoIP calling interface |
| Contacts | `/dialer/contacts` | Agent, Admin | Dialer contact book |
| Templates | `/templates` | Agent, Admin | Message templates |
| Profile | `/profile` | All | Personal settings |
| Admin — Agents | `/admin/agents` | Admin | User management |
| Admin — Commission | `/admin/commission-config` | Admin | Commission split settings |
| Admin — Approvals | `/admin/edit-approvals` | Admin | Property edit approval queue |
| Admin — Audit Log | `/admin/audit-log` | Admin | Full change history |

---

## 5. NAVIGATION MAP

```
DASHBOARD
│
├── [Lookup phone]
│       ├── Found — other agent  → "Exists with another agent" (no action)
│       ├── Found — your landlord → [Add Property] → /start/interested?landlordId=
│       └── Not found →
│               ├── [Interested]     → /start/interested?phone=
│               ├── [Follow Up]      → /start/follow-up?phone=
│               └── [Not Interested] → logs NOT_INTERESTED instantly
│
SIDE NAV (Agent)
├── Dashboard          /dashboard
├── Start Call         /start                 ← new
├── Landlords          /landlords
├── Properties         /properties
├── Potential Landlords /potential-landlords
├── Potential Tenants  /potential-tenants
├── Tenants            /tenants
├── Sales              /sales
├── Call History       /call-records
├── Daily Reports      /daily-reports
├── Dialer             /dialer
└── Profile            /profile

SIDE NAV (Admin)
└── All above + /admin/* section

FLOW MAP
Landlord Lookup (Dashboard)
    └── Not Found
            ├── Interested → Create Landlord + Property + CallLog(CONFIRMED)
            │                   → /landlords/{id}
            │                   Auto: Dialer Contact added
            │
            ├── Follow Up → Create PotentialLandlord + CallLog(FOLLOW_UP)
            │                   → /potential-landlords
            │                   Auto: Dialer Contact added
            │                   Auto: Email reminder at T-1h and T-5min
            │                   Lock: isLocked=true until scheduledAt+1day
            │
            └── Not Interested → Create CallLog(NOT_INTERESTED)
                                     Stay on Dashboard

Potential Landlords Page
    └── [Interested] → /start/interested?phone=&potentialLandlordId=
    └── [Reschedule] → /start/follow-up?phone=&potentialLandlordId=

Properties Page
    └── [+ Add Property] → /properties/new
            └── Step 1: Search & select your landlord
            └── Step 2: Full property form
            └── Submit → POST /api/properties → /properties

Property Detail (status = Available)
    ├── Private: [Close Sale]
    │       └── Tenant Form + finalRent + companyCommission
    │               → Create Tenant + Sale + CLOSED property
    │               → /sales
    │
    └── Shared: [Close Sale] per room
                → Same form → Create Tenant + Sale + CLOSED room
                → If all rooms CLOSED → property auto-CLOSED

Potential Tenants
    └── [+ Add Potential Tenant]
            └── Full Tenant Form (20 fields)
            → Create PotentialTenant
```

---

## 6. BUSINESS RULES

### Phone Numbers
- All phone numbers are stored as UK E.164 (`+447xxxxxxxxx`).
- Lookup and deduplication use the **last 10 digits** (`phoneLast10`).
- Entering `07911122233`, `+447911122233`, or `7911122233` all resolve to the same number.

### Postcodes
- All postcodes are auto-uppercased on every keystroke in form inputs.
- Stored uppercase in the database.
- Both frontend (`onChange`) and API routes (before DB write) apply this rule.

### Rent Per Week
- Always auto-calculated: `Math.round((rentPerMonth × 12 / 52) × 100) / 100`
- The field is read-only in all forms. Agents cannot override it.

### Property References
- Auto-generated server-side on creation.
- Format: `PROP-YYYY-XXXXXX` (e.g. `PROP-2026-A4F7K2`).
- 6-character alphanumeric random suffix from `A–Z` + `0–9`.
- Guaranteed unique (retry on collision).

### Landlord Lock Rules
- When an agent schedules a Follow Up, the phone number is **locked to that agent**.
- `lockedUntil = scheduledAt + 24 hours`
- While locked, no other agent can start a new Interested/Follow Up flow for that number.
- Lock expires automatically — no manual unlock needed.
- Admins can see locked records but cannot currently force-unlock (deferred feature).

### Commission Rules
- Agents enter the **Company Commission** in £ at Close Sale time.
- The agent's personal share is **not visible to agents** — it is derived from the admin CommissionConfig and stored as `agentCommissionAmt` on the Sale record.
- Two commission config types:
  - **Fixed**: same £ amount regardless of deal size.
  - **Flexible**: tiered — larger deals earn more for the agent.

### Who Can Create What

| Entity | How it's created | Who can create |
|--------|-----------------|---------------|
| Landlord | `/start/interested` flow only | Any agent (for new numbers) |
| Property | `/start/interested` or `/properties/new` | Any agent (own landlords only) |
| PotentialLandlord | `/start/follow-up` flow only | Any agent (unlocked numbers only) |
| Tenant | Close Sale flow only | Any agent (own properties only) |
| PotentialTenant | `/potential-tenants` page form | Any agent |
| CallLog | Auto-generated by Interested / Not Interested / Follow Up flows | System only |
| Sale | Close Sale flow only | Any agent (own properties only) |

---

## 7. AUTO-GENERATED DATA

### Call Logs (`/call-records`)
A call log entry is automatically created every time:
- An agent clicks **Interested** → `status: CONFIRMED`
- An agent clicks **Not Interested** → `status: NOT_INTERESTED`
- An agent submits the **Follow Up** form → `status: FOLLOW_UP`

Call logs can never be manually created or edited.

### Daily Reports (`/daily-reports`)
Reports are computed live from raw activity data. There is no manual submission.

| Metric | Source |
|--------|--------|
| Searches | `LandlordLookupLog` — every number typed into the lookup |
| Confirmed | `CallLog` entries with `status = CONFIRMED` |
| Not Interested | `CallLog` entries with `status = NOT_INTERESTED` |
| Follow Ups | `CallLog` entries with `status = FOLLOW_UP` |
| Potential Tenants | `PotentialTenant` records created that day |
| Sales Closed | `Sale` records with `closedAt` on that day |

Reports default to the last 30 days and can be filtered by date range.

### Follow-Up Reminders
Reminders are sent automatically via a cron job that runs every minute.

| Trigger | Action |
|---------|--------|
| 60 minutes before `scheduledAt` | Email to agent: "Follow-up reminder in 1 hour" |
| 5 minutes before `scheduledAt` | Email + in-app notification ring to agent |

Each reminder is sent only once per follow-up (tracked via `reminder1hSent`, `reminder5mSent` flags).

### Dialer Contact Auto-Add
Whenever an agent creates a new landlord (Interested flow) or a new potential landlord (Follow Up flow), the contact is automatically added to their Dialer Contacts — if not already present.

---

## 8. DEVELOPER REFERENCE

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/start/interested` | Atomic: landlord + property + call log |
| `POST` | `/api/start/not-interested` | Log NOT_INTERESTED call log |
| `POST` | `/api/start/follow-up` | Create potential landlord + call log |
| `GET` | `/api/call-logs` | Paginated call history |
| `GET` | `/api/daily-reports/auto` | Live auto-calculated daily stats |
| `GET` | `/api/cron/follow-up-reminders` | Cron: send due reminders |
| `GET` | `/api/landlords/check-number` | Phone number lookup + logs LandlordLookupLog |
| `GET` | `/api/potential-landlords` | Agent's own follow-up leads |
| `POST` | `/api/properties` | Create property for existing landlord |
| `GET` | `/api/properties` | Paginated property list |
| `POST` | `/api/properties/[id]/close-sale` | Close sale on private property |
| `POST` | `/api/properties/[id]/rooms/[roomId]/close` | Close sale on a room |
| `GET` | `/api/potential-tenants` | Paginated potential tenant list |
| `POST` | `/api/potential-tenants` | Create potential tenant |

### Auth Pattern
```ts
// In API routes:
const auth = await requireUser(request);
if (!auth.ok) return auth.response;

const roleCheck = requireRole(auth.user, [UserRole.AGENT, UserRole.ADMIN]);
if (!roleCheck.ok) return roleCheck.response;
```

### Phone Normalization
```ts
import { normalizeUkPhone } from "@/server/phone";

const normalized = normalizeUkPhone(rawPhone);
if (!normalized.ok) return 400; // invalid phone

// normalized.phoneLast10  → "7911122233"
// normalized.phoneE164    → "+447911122233"
```

### Rent Per Week Calculation
```ts
function calcRentPerWeek(rentPerMonth: number): number {
  return Math.round((rentPerMonth * 12 / 52) * 100) / 100;
}
```

### Property Reference Generation
```ts
function generatePropertyRef(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `PROP-${year}-${random}`;
}
```

### Commission Calculation
```ts
import { calcAgentCommissionGBP } from "@/lib/commission";

// Fetch CommissionConfig singleton
const config = await db.commissionConfig.findFirst({ where: { id: "singleton" } });

// Calculate agent's share of companyCommissionGBP
const agentCommissionAmt = calcAgentCommissionGBP(companyCommissionGBP, config);
```

### Cron Endpoint Protection
```ts
// Set CRON_SECRET in environment variables.
// Protected by: Authorization: Bearer <CRON_SECRET>
// If CRON_SECRET is not set, the endpoint is open (development mode).
```

### Database Transaction Pattern (atomic operations)
```ts
const result = await db.$transaction(async (tx) => {
  const landlord = await tx.landlord.create({ ... });
  const property = await tx.property.create({ ... });
  const callLog  = await tx.callLog.create({ ... });
  return { landlord, property, callLog };
});
```

### Agent Ownership Checks
```ts
// Properties: check landlord.ownerAgentId
if (auth.user.role === UserRole.AGENT && landlord.ownerAgentId !== auth.user.id) {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

// PotentialLandlords: check addedByAgentId
if (existing.addedByAgentId !== auth.user.id) { ... }
```

### Lock Check (Follow-Up)
```ts
const lockedByOther = await db.potentialLandlord.findFirst({
  where: {
    phoneLast10: normalized.phoneLast10,
    isLocked: true,
    lockedUntil: { gt: new Date() },
    NOT: { addedByAgentId: auth.user.id },
  },
});

if (lockedByOther) {
  return 409; // "This lead is currently reserved by another agent."
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Yes | Secret for signing session cookies |
| `CRON_SECRET` | No | Bearer token for cron endpoint auth |
| `EMAIL_PROVIDER` | No | `console` (default) or `resend` |
| `RESEND_API_KEY` | If Resend | API key for Resend email service |

---

*End of MHG Portal Guide*
