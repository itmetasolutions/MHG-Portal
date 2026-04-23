# MHG Portal – Implementation Status Report

> Generated: 2026-04-23  
> Covers: Agent-Side Revamp (all changes made from initial revamp spec through current session)

---

## TABLE OF CONTENTS

1. [What Was Added (New)](#1-what-was-added-new)
2. [What Was Changed (Modified)](#2-what-was-changed-modified)
3. [What Was Discarded (Removed / Deprecated)](#3-what-was-discarded-removed--deprecated)
4. [What Was Retained (Unchanged)](#4-what-was-retained-unchanged)
5. [Known Spec Deviations](#5-known-spec-deviations)
6. [Deferred / Not Yet Implemented](#6-deferred--not-yet-implemented)

---

## 1. WHAT WAS ADDED (NEW)

### 1.1 New Database Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `PropertyCategory` | `HOUSE`, `FLAT`, `STUDIO_FLAT` | Subcategory for SINGLE (Private) properties |
| `RoomType` | `STUDIO_ROOM`, `SINGLE_ROOM`, `DOUBLE_ROOM`, `ENSUITE_ROOM`, `LOFT` | Replaces freetext `roomName` on PropertyRoom |
| `LivingRoomType` | `PRIVATE`, `SHARED`, `NONE` | Living room arrangement on Property |
| `CallLogStatus` | `CONFIRMED`, `NOT_INTERESTED`, `FOLLOW_UP` | Status of auto-generated call log entries |

### 1.2 New Database Fields

**Property model:**
- `propertyCategory PropertyCategory?` — subcategory for SINGLE properties
- `rentPerWeek Decimal?` — auto-calculated from rentPerMonth; (rentPerMonth × 12 / 52)
- `expectedCommissionAmt Decimal?` — commission in £ (replaces percentage-based field)
- `garden Boolean?`, `parking Boolean?`, `billsIncluded Boolean?`, `balcony Boolean?`, `disabledAccess Boolean?`, `livingRoom LivingRoomType?`, `broadbandIncluded Boolean?`, `couplesAllowed Boolean?` — full amenity flags

**PropertyRoom model:**
- `roomType RoomType?` — enum replaces freetext `roomName`
- `rentPerMonth Decimal?`, `rentPerWeek Decimal?`, `depositAmount Decimal?`, `expectedCommissionAmt Decimal?` — per-room financials

**PotentialLandlord model (all new):**
- `firstName String?`, `lastName String?` — split name
- `scheduledAt DateTime?` — when to follow up
- `isLocked Boolean` — prevents other agents from claiming this lead
- `lockedUntil DateTime?` — auto-set to scheduledAt + 1 day
- `landlordId String? @unique` — set when follow-up converts to a real landlord
- `reminder1hSent Boolean`, `reminder5mSent Boolean` — prevent duplicate reminder sends

**PotentialTenant model:**
- `firstName String?`, `lastName String?`, `phoneLast10 String?`
- `accommodationType String?`, `countryOriginal String?`, `nationality String?`
- `roomType RoomType?`, `numberOfOccupants Int?`, `numberOfChildren Int?`
- `onDSS Boolean?`, `currentlyEmployed Boolean?`, `annualIncome Decimal?`
- `currentLivingPostcode String?`, `workplacePostcode String?`
- `maximumBudget Decimal?`, `workingProfession String?`, `immigrationStatus String?`, `moveInDate DateTime?`

**Tenant model:**
- Same new fields as PotentialTenant — matched so Close Sale creates a fully structured Tenant record
- `firstName String?`, `lastName String?`, `phoneLast10 String?`
- All occupant / employment / immigration fields

**Sale model:**
- `finalRent Decimal?` — agreed rent at time of close (new)
- `companyCommission Decimal?` — total company commission in £ (new)
- `agentCommissionAmt Decimal?` — agent's share, derived from CommissionConfig

**CallLog model (new):**
- `agentId`, `landlordId?`, `potentialLandlordId?`
- `landlordFirstName?`, `landlordLastName?` — denormalised for history
- `phone`, `phoneLast10`
- `status CallLogStatus` — CONFIRMED / NOT_INTERESTED / FOLLOW_UP
- `followUpScheduledAt DateTime?` — when follow-up is set for

**LandlordLookupLog model (new):**
- `agentId`, `phone`, `phoneLast10`, `result` (FOUND_OWN / FOUND_OTHER / NOT_FOUND), `createdAt`
- Used to calculate `totalSearched` in daily reports

**DailyReport model — new fields added:**
- `totalSearched Int` — from LandlordLookupLog
- `propertiesConfirmed Int` — CONFIRMED CallLogs
- `notInterested Int` — NOT_INTERESTED CallLogs
- `potentialTenants Int` — PotentialTenants added
- `salesClosed Int` — Sales closed

**PropertyMedia model:**
- `altText String @default("")` — alt text per image (new)

**Notification model:**
- `type` extended with `FOLLOW_UP_RING`, `FOLLOW_UP_REMINDER_1H`, `LANDLORD_LOOKUP_ALERT`

---

### 1.3 New API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `POST /api/start/interested` | POST | Atomic: creates Landlord + Property + CallLog(CONFIRMED) in one transaction. Auto-adds to Dialer Contacts. |
| `POST /api/start/not-interested` | POST | Creates CallLog(NOT_INTERESTED) for a phone number. |
| `POST /api/start/follow-up` | POST | Creates PotentialLandlord + CallLog(FOLLOW_UP). Sets isLocked + lockedUntil. Auto-adds to Dialer Contacts. Handles reschedule if potentialLandlordId provided. |
| `GET /api/call-logs` | GET | Paginated call log history. Agents see own; admins see all or filter by agentId. Query: page, pageSize, status, agentId, from, to. |
| `GET /api/daily-reports/auto` | GET | Live auto-calculated daily stats from CallLog + LandlordLookupLog + PotentialTenant + Sale. Query: agentId, from, to (default: last 30 days). |
| `GET /api/cron/follow-up-reminders` | GET | Cron endpoint — finds PotentialLandlords due in 5 min (5m reminder) or 1 hr (1h reminder). Sends email + in-app notification. Updates reminder flags. Protected by `Authorization: Bearer <CRON_SECRET>`. |

---

### 1.4 New UI Pages

| Page | Path | Description |
|------|------|-------------|
| Start Call | `/start` | Three-option card page: Interested / Follow Up / Not Interested |
| Interested Flow | `/start/interested` | Full form: landlord details + property form. Pre-fills phone from `?phone=`. Pre-fills potentialLandlordId from `?potentialLandlordId=`. Redirects to `/landlords/{id}` on success. |
| Follow Up Flow | `/start/follow-up` | Landlord details + datetime picker. Pre-fills phone. Redirects to `/potential-landlords` on success. |

---

### 1.5 New Navigation Item

- **Start Call** added to agent top-nav (second position) — `href: "/start"`, with a phone/start icon.

---

## 2. WHAT WAS CHANGED (MODIFIED)

### 2.1 API Routes Modified

| Route | Change |
|-------|--------|
| `GET /api/landlords/check-number` | Now logs a `LandlordLookupLog` entry (fire-and-forget) on every lookup. Result is classified as `FOUND_OWN / FOUND_OTHER / NOT_FOUND`. |
| `GET /api/potential-landlords` | Rewritten: agents see only their own unconverted records (`landlordId: null`). New fields returned (isLocked, lockedUntil, scheduledAt, firstName, lastName, email). POST returns 405 directing to `/api/start/follow-up`. DELETE admin-only. |
| `GET /api/potential-tenants` | Rewritten: full new field set returned. POST rewritten to accept full new tenant schema (firstName, lastName, phone, all 17+ fields). DELETE admin-only. |
| `POST /api/properties` | Was 405 stub — now a real handler. Accepts `{ landlordId, property }`. Validates agent owns the landlord. Creates property with all new fields, amenities, MULTIPLE rooms. |
| `GET /api/daily-reports` | POST now returns 405 "Daily reports are auto-generated. See /api/daily-reports/auto." |
| `POST /api/properties/[id]/close-sale` | Schema rewritten: accepts `finalRent + companyCommission` (replaces `finalAmount + commissionPct`). Full new Tenant form. Derives `agentCommissionAmt` from CommissionConfig singleton. |
| `POST /api/properties/[id]/rooms/[roomId]/close` | Same close-sale logic as property-level but at room level. |

### 2.2 UI Pages Rewritten

| Page | Path | What Changed |
|------|------|-------------|
| Call History | `/call-records` | Removed manual add and scheduled calls tab. Now reads from `GET /api/call-logs`. Status badges: Confirmed (green), Not Interested (red), Follow Up (blue). "Start Call" button in header. |
| Potential Landlords | `/potential-landlords` | Removed old "Add" modal entirely. Per-row actions (own rows only): **Interested** → `/start/interested?phone=&potentialLandlordId=`, **Reschedule** → `/start/follow-up?phone=&potentialLandlordId=`. Overdue marker (red) when scheduledAt < now. Lock status using isLocked + lockedUntil. Header button "+ Schedule Follow-up". |
| Properties / New | `/properties/new` | Removed inline landlord creation. Now: searchable picker for existing landlords only. Full new property form: vacancy toggle, property category, all amenity checkboxes, MULTIPLE rooms table with roomType enum, rentPerWeek auto-calc, expectedCommissionAmt in £. POSTs to `/api/properties`. |
| Potential Tenants | `/potential-tenants` | Modal form replaced with full 20-field tenant form (Personal Details, Accommodation Requirements, Employment & Immigration). Table columns updated: Name, Phone, Room Type, Budget, Move-in, DSS, Agent, Date. |
| Daily Reports | `/daily-reports` | Manual form entirely removed. Date-range filter (from/to, defaults last 30 days). Summary stat cards (6 metrics). Table: Date, Searches, Confirmed, Not Interested, Follow Ups, Potential Tenants, Sales Closed. Reads from `/api/daily-reports/auto`. |
| Landlords / New | `/landlords/new` | Now a redirect page → redirects to `/start/interested`. |

### 2.3 Agent Shell (`agent-shell.tsx`)

- Added **Not Interested** button to lookup strip result for NOT_FOUND case — POSTs to `/api/start/not-interested` (fire-and-forget, then shows success).
- Lookup result for `FOUND_OWN` (own landlord): "Add Property" link now goes to `/start/interested?phone=...&landlordId=...` (updated from old `/properties/new` path).
- Lookup result for `NOT_FOUND`: now shows 3 buttons — Interested / Follow Up / Not Interested.
- `useRouter` import added for navigation after Not Interested.

### 2.4 App Shell (`components/app-shell.tsx`)

- Added `/start` to the `isProtectedPath` check so Start Call pages are inside the authenticated shell.

### 2.5 Potential Tenants Page (`page.tsx`)

- DB query updated to select all new fields (firstName, lastName, phoneLast10, accommodationType, roomType, numberOfOccupants, numberOfChildren, onDSS, currentlyEmployed, annualIncome, currentLivingPostcode, workplacePostcode, maximumBudget, workingProfession, immigrationStatus, moveInDate).
- Serialization updated: Decimal fields converted to strings, moveInDate converted to ISO string.

### 2.6 Landlords Registry (`registry-client.tsx`)

- Removed the `+ Add New Landlord` button entirely. Landlords are now created only via the Start Call → Interested flow.

### 2.7 Environment Config (`lib/env.ts`)

- Added `CRON_SECRET: z.string().optional()` — used to protect the cron endpoint.

### 2.8 Global CSS (`app/globals.css`)

- Added: `.form-grid-2`, responsive grid for 2-column forms
- Added: `@media (max-width: 580px)` breakpoint for form grid
- Added: `.checkbox-grid` — grid layout for amenity checkboxes
- Added: `.checkbox-label` — styled checkbox + label pair
- Added: `.form-error-banner`, `.field-error` — inline form error styles
- Added: `span.required` — red asterisk styling

---

## 3. WHAT WAS DISCARDED (REMOVED / DEPRECATED)

### 3.1 UI Flows Removed

| Item | Old Behavior | Replacement |
|------|-------------|-------------|
| `/landlords/new` direct add page | Agent fills form to add landlord manually from Landlords page | Redirect to `/start/interested`. Landlords only via Interested flow. |
| Manual Add button on Landlords page | `+ Add New Landlord` button in header | Button removed. |
| Inline landlord creation on `/properties/new` | Agent could create a new landlord inline while adding a property | Removed. Must use existing landlord from dropdown. |
| Old potential landlord "Add" modal | Agent manually added potential landlords from `/potential-landlords` | Removed. PotentialLandlords only created via Follow Up flow. |
| Manual call log creation | Agent could manually add call records | Removed. All CallLogs auto-generated from flow actions. |
| Manual daily report submission form | Agent fills in `callsMade`, `callsConnected`, `dialingArea`, etc. | Removed. Reports auto-calculated from portal activity. |
| Old start flow options | Any options beyond Interested / Not Interested / Follow Up | Replaced by exactly 3-option Start page. |
| Scheduled Calls tab on Call Records page | Separate tab showing upcoming scheduled calls | Removed. Follow-ups shown on Potential Landlords page. |
| Tenant add directly from Tenants page | Agent could add a tenant from the Tenants listing page | Removed. Tenants only created via Close Sale. |

### 3.2 API Endpoints Deprecated

| Endpoint | Status |
|----------|--------|
| `POST /api/call-records` (manual creation) | Deprecated — no longer callable by agents |
| `POST /api/daily-reports` | Returns 405 with redirect message |
| `POST /api/potential-landlords` | Returns 405 with redirect to `/api/start/follow-up` |
| `POST /api/landlords` direct | Still exists but agents should not call directly — use `/api/start/interested` |

### 3.3 Schema / Logic Deprecated (Retained in DB for backward compat)

| Item | Status |
|------|--------|
| `PotentialTenant.interestedIn` | Field retained in DB but no longer exposed in the form UI |
| `PotentialTenant.budget` | Field retained in DB but replaced by `maximumBudget` in UI |
| `Property.landlordDemand` | Still in schema (backward compat); `rentPerMonth` is the new primary field |
| `Property.expectedCommissionPct` | Still in schema; close-sale now uses `companyCommission` in £ |
| `Sale.commissionPct` | Set to 0 for backward compat when using new close-sale flow |
| `Sale.finalAmount` | Set equal to `finalRent` for backward compat |
| `Property.beds`, `Property.baths` | Still in DB schema but no longer in any form |
| `Property.county` | Still in DB schema but no longer in new property forms |
| `Property.personsAllowed` | Still in DB schema but no longer in new property forms |
| `DailyReport` manual fields | `callsMade`, `callsConnected`, `callsFailed`, `landlordConfirm`, `viewingsArranged`, `successfulViewings`, `reSchedule` — still in schema, no longer updated by any new flow |

---

## 4. WHAT WAS RETAINED (UNCHANGED)

| System | Notes |
|--------|-------|
| Auth (email + OTP + JWT) | Fully unchanged |
| Dashboard stat cards | All existing metrics cards untouched |
| Admin commission config | CommissionConfig model, admin UI, and agent commission calculation logic unchanged |
| VoIP / Dialer system | All dialer pages, call routing, labels, history — unchanged |
| Dialer contacts | Auto-add behaviour layered on top; core contacts system unchanged |
| Templates system | Fully unchanged |
| Inter-agent chat / messaging | Fully unchanged |
| Audit log system | Continues to log all entity mutations; new entries added for new flows |
| Admin management pages | Agents, approvals, commission config — unchanged |
| Media library | Photo upload system unchanged; `altText` field added to PropertyMedia |
| Notification bell | Retained; new notification types (`FOLLOW_UP_RING`, `LANDLORD_LOOKUP_ALERT`) added |
| Admin property edit approvals | Retained |
| Website public API | `/api/website/properties` unchanged |
| `publishedToWebsite` toggle | Admin-only feature unchanged |
| Landlord detail page | `/landlords/[id]` unchanged |
| Property detail page | `/properties/[id]` unchanged |
| Properties listing page | `/properties` unchanged |
| Sales page | `/sales` unchanged |
| Tenants page | `/tenants` unchanged |

---

## 5. KNOWN SPEC DEVIATIONS

These items differ from what the original spec specified vs what was actually implemented:

| # | Spec Said | What Was Implemented | Reason |
|---|-----------|---------------------|--------|
| S1 | `PropertyStatus.ACTIVE` (rename from AVAILABLE) | Still uses `AVAILABLE` | Renaming the enum would require a destructive migration on a live DB; `AVAILABLE` retained to avoid breaking existing records |
| S2 | `VacancyType` renamed to `PropertyType` (PRIVATE/SHARED) | Still uses `VacancyType` (SINGLE/MULTIPLE) | Same reason — backward compat with existing property records |
| S3 | Photo minimum 1 + alt text required in property form | Not enforced in form UI | Can be enforced as a follow-up validation pass |
| S4 | Available Rooms > Total Rooms validation (E4) | Not validated client-side | Server does not block this; client-side guard can be added |
| S5 | Follow-up "Continue" button uses `/start?phone=` | Uses separate `/start/interested?potentialLandlordId=` and `/start/follow-up?potentialLandlordId=` | More direct UX — skips the 3-option page and goes straight to the chosen action |
| S6 | `/start?phone=` redirected to start page | Not Interested is handled inline in agent shell (no navigation) | Avoids a page load for what is a one-click action |
| S7 | `ScheduledCall` model deletion | Model still in schema | Backward compat; removal requires migration |
| S8 | `CallRecord` model deletion | Model still in schema | Same as above |
| S9 | DailyReport `totalCallsMade` / `callsConnected` auto-fields | Not stored in DailyReport; computed live via `/api/daily-reports/auto` | Live calculation is more accurate and doesn't require a separate cron job to update stored values |
| S10 | Admin reports page updates | Not changed in this revamp | Admin reports page remains on old DailyReport model; can be connected to `/api/daily-reports/auto` |

---

## 6. DEFERRED / NOT YET IMPLEMENTED

These items are in the spec but were not built in this revamp:

| Item | Priority | Notes |
|------|----------|-------|
| Admin daily reports page (`/admin/reports`) update | Medium | Still reads from old DailyReport model; should be connected to auto endpoint |
| Agent-level filter on Potential Landlords page | Low | Currently no filter by lock status / date range |
| Photo alt text enforcement | Medium | `altText` field exists in DB but not required in form submission |
| Available Rooms > Total Rooms client validation | Low | Edge case E4 from spec |
| Property filters: PropertyCategory, availability date range | Low | Additional filter params |
| `/start?phone=` E10: redirect to dashboard if no phone param | Low | Currently the page loads blank; should redirect |
| Email retry on failure (E11) | Low | Failed emails are silently swallowed; no retry queue |
| BullMQ / Redis reminder jobs (Option B) | Low | Currently using cron-based Option A |
| Admin ability to reassign locked potential landlords (E13) | Medium | Admin panel for potential landlord management |
| DailyReport snapshot storage (midnight cron) | Low | Currently live-calculated only; no persistent snapshot |

---

*End of Implementation Status Report*
