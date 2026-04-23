# MHG Portal – Agent-Side Revamp: Implementation Specification

> Generated: 2026-04-22  
> Status: Implementation-ready handoff document

---

## TABLE OF CONTENTS

1. [Deprecated vs Retained Logic](#1-deprecated-vs-retained-logic)
2. [Role Permissions](#2-role-permissions)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Page-by-Page Behavior](#4-page-by-page-behavior)
5. [Workflow States & Flow Map](#5-workflow-states--flow-map)
6. [Field Validations](#6-field-validations)
7. [Notification & Reminder Logic](#7-notification--reminder-logic)
8. [Reporting Logic](#8-reporting-logic)
9. [Edge Cases](#9-edge-cases)
10. [Developer Handoff Notes](#10-developer-handoff-notes)

---

## 1. DEPRECATED vs RETAINED LOGIC

### ❌ DEPRECATED – Remove / Decline All Of These

| # | Feature / Flow | Old Behavior | Reason Deprecated |
|---|---------------|-------------|-------------------|
| D1 | `/landlords/new` direct add page | Agent could add landlord directly from Landlords page | Landlords now only created via Dashboard lookup flow |
| D2 | Properties page "Add Property" without landlord pre-selection | Property form opened independently | Now requires selecting existing landlord first |
| D3 | Manual call log creation | Agent manually submitted call records | Auto-generated from Interested / Not Interested / Follow Up clicks |
| D4 | Manual daily report submission | Agent filled in daily report form | Auto-generated from portal activity data |
| D5 | Old potential landlord add flow | Direct add from Potential Landlords page | Now only created via Follow Up path in dashboard lookup |
| D6 | Old start flow / alternate first-contact options | Any options other than Interested/Not Interested/Follow Up | Replaced by exactly 3 options |
| D7 | VacancyType enum (SINGLE/MULTIPLE) | Property flagged as single or multiple vacancy | Replaced by PropertyType (PRIVATE/SHARED) |
| D8 | `beds` and `baths` fields on Property | Bedroom and bathroom count | Replaced by `noOfRooms`, `availableRooms`, `propertyCategory` |
| D9 | `landlordDemand` field on Property and PropertyRoom | Landlord's rent demand | Replaced by `rentPerMonth` at property/room level |
| D10 | `expectedCommissionPct` on Property and PropertyRoom | Commission stored as percentage | Replaced by `expectedCommissionAmt` in £ (pounds) |
| D11 | `county` field on Property | County field | Removed from property form; city is sufficient |
| D12 | `roomName` freetext on PropertyRoom | Freetext room name | Replaced by `roomType` enum |
| D13 | `personsAllowed` freetext on Property | Number of persons allowed | Replaced by per-close-sale occupant tracking on Tenant |
| D14 | Old Tenant add flow (from Tenants page directly) | Could add tenant independently | Tenants now only created via Close Sale flow |
| D15 | `fullName` single field on Landlord / PotentialLandlord | Combined full name | Split into `firstName` + `lastName` |
| D16 | `fullName` single field on PotentialTenant | Combined full name | Split into `firstName` + `lastName` |
| D17 | `publishedToWebsite` / property publish flow | Separate publish step | Retained for admin/website but no longer a required agent step |
| D18 | `ScheduledCall` model (old scheduled calls) | Separate scheduled call entries | Replaced by `scheduledFollowUpAt` on PotentialLandlord + CallLog |
| D19 | `CallRecord` model (old call records) | Manual call records with conversion tracking | Replaced by auto-generated `CallLog` model |
| D20 | `DailyReport` manual POST endpoint | Agent submits their own report | Replaced by auto-calculation endpoint |
| D21 | `PotentialTenant.interestedIn` / `budget` freetext | Simple notes on interested-in | Replaced by full Tenant Form fields on PotentialTenant |
| D22 | `Tenant.fullName` / `currentAddress` combined | Combined address string | Split into structured fields matching Tenant Form |
| D23 | Old contact add logic outside Contacts page | Contacts added via various old flows | Contacts now also auto-seeded from Interested/Follow Up landlord actions |

---

### ✅ RETAINED – Keep Exactly As-Is (Explicitly Confirmed)

| # | Feature / System | Notes |
|---|-----------------|-------|
| R1 | Dashboard stats | Same as before; keep all existing stat cards |
| R2 | Admin commission split settings | Admin-set commission percentage split for agents unchanged |
| R3 | Templates system | No changes to template system |
| R4 | VoIP / Dialer system | Entire dialer, contacts with labels, call history, inter-calling unchanged |
| R5 | Auth system (email + OTP + JWT) | No changes |
| R6 | Admin management pages | Agents, approvals, audit log, commission config unchanged |
| R7 | Inter-agent chat / messaging | No changes |
| R8 | Audit log system | No changes; continue logging all entity mutations |
| R9 | Media library / property photos | Photo upload system retained; add alt text support per image |
| R10 | Notification bell UI | Retained; add new notification triggers described in §7 |
| R11 | Dialer contacts | Retained; auto-add logic for Interested/Follow Up landlords layered on top |
| R12 | Admin-side property edit approvals | Retain edit approval workflow |
| R13 | `publishedToWebsite` on Property | Admin can still publish to website; not agent-facing |
| R14 | Website API (`/api/website/properties`) | Public listing API unchanged |

---

## 2. ROLE PERMISSIONS

### 2.1 Agent Permissions

| Action | Allowed |
|--------|---------|
| Dashboard landlord phone lookup | ✅ |
| Start flow (Interested / Not Interested / Follow Up) | ✅ |
| Add landlord (via Interested flow only) | ✅ |
| Add property (via Interested flow OR Properties page Add button → own landlords only) | ✅ |
| View own landlords | ✅ |
| View own properties | ✅ |
| Close sale on own property/room | ✅ |
| View own tenants (from closed sales) | ✅ |
| View own sales | ✅ |
| Add potential tenant (Potential Tenants page only) | ✅ |
| View own potential tenants | ✅ |
| View own potential landlords | ✅ |
| Continue follow-up flow on own potential landlords | ✅ |
| View own call logs (auto-generated) | ✅ |
| View own daily reports (auto-generated) | ✅ |
| View own dialer contacts, history | ✅ |
| Use templates | ✅ |
| View own notifications | ✅ |
| Access any other agent's landlords, properties, tenants | ❌ |
| Add entities to another agent's landlord | ❌ |
| Continue another agent's follow-up | ❌ (locked) |
| Manual call log creation | ❌ |
| Manual daily report creation | ❌ |
| Add landlord directly (not via lookup flow) | ❌ |
| Add tenant directly (not via Close Sale) | ❌ |

### 2.2 Admin Permissions

| Action | Allowed |
|--------|---------|
| All agent permissions (across all agents) | ✅ |
| View all agents' reports | ✅ |
| View each agent's daily reports | ✅ |
| Configure commission split | ✅ |
| Manage users (create, deactivate agents) | ✅ |
| Approve / reject property edits | ✅ |
| View audit logs | ✅ |
| Publish property to website | ✅ |
| View all landlords, properties, tenants, sales | ✅ |
| View all call logs | ✅ |
| Apply filters on all pages | ✅ |

---

## 3. DATABASE SCHEMA CHANGES

### 3.1 New / Modified Enums

```prisma
// NEW
enum PropertyType {
  PRIVATE
  SHARED
}

enum PropertyCategory {
  HOUSE
  FLAT
  STUDIO_FLAT
}

enum RoomType {
  STUDIO_ROOM
  SINGLE_ROOM
  DOUBLE_ROOM
  ENSUITE_ROOM
  LOFT
}

enum LivingRoomType {
  PRIVATE
  SHARED
  NONE
}

enum CallLogStatus {
  CONFIRMED       // Interested → property added
  NOT_INTERESTED
  FOLLOW_UP
}

// MODIFIED – PropertyStatus: rename AVAILABLE → ACTIVE for clarity
enum PropertyStatus {
  DRAFT
  ACTIVE    // was AVAILABLE
  CLOSED
}

// KEEP as-is
enum RoomStatus { AVAILABLE  UNDER_OFFER  CLOSED }
enum UserRole   { ADMIN  AGENT }
```

### 3.2 Modified Models

#### Landlord (modified)

```prisma
model Landlord {
  id              String   @id @default(cuid())
  firstName       String                          // NEW (was part of landlordName)
  lastName        String                          // NEW
  // landlordName DEPRECATED – derive as firstName + " " + lastName in application layer
  phone           String   @unique               // stored E.164
  phoneLast10     String
  email           String?
  ownerAgentId    String
  createdByUserId String
  updatedByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  ownerAgent      User       @relation("OwnedLandlords", fields: [ownerAgentId], references: [id])
  createdBy       User       @relation("CreatedLandlords", fields: [createdByUserId], references: [id])
  updatedBy       User?      @relation("UpdatedLandlords", fields: [updatedByUserId], references: [id])
  properties      Property[]
  callLogs        CallLog[]
  potentialLandlord PotentialLandlord? // if this landlord came from Follow Up path
}
```

#### Property (significantly modified)

```prisma
model Property {
  id                    String           @id @default(cuid())
  landlordId            String
  ownerAgentId          String
  propertyRef           String           @unique // auto-generated
  propertyType          PropertyType                       // NEW: PRIVATE | SHARED
  propertyCategory      PropertyCategory?                  // NEW: only for PRIVATE
  description           String
  addressLine1          String
  addressLine2          String?
  postcode              String                             // always stored UPPERCASE
  city                  String
  status                PropertyStatus   @default(DRAFT)

  // Financials – PRIVATE only (null for SHARED, financials are per-room)
  rentPerMonth          Decimal?
  rentPerWeek           Decimal?                           // calculated field
  depositAmount         Decimal?
  expectedCommissionAmt Decimal?                           // in £, NEW

  // Room counts (both types)
  totalRooms            Int?                               // hidden for STUDIO_FLAT
  availableRooms        Int?                               // hidden for STUDIO_FLAT

  // Amenities / flags (all required)
  isFurnished           Boolean
  livingLandlord        Boolean
  garden                Boolean
  parking               Boolean
  billsIncluded         Boolean
  balcony               Boolean
  disabledAccess        Boolean
  livingRoom            LivingRoomType
  broadbandIncluded     Boolean
  couplesAllowed        Boolean
  petsAllowed           Boolean
  dssAllowed            Boolean
  childrenAllowed       Boolean

  availabilityDate      DateTime
  publishedToWebsite    Boolean          @default(false)   // admin use only

  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  landlord              Landlord         @relation(...)
  ownerAgent            User             @relation(...)
  rooms                 PropertyRoom[]
  sales                 Sale[]
  mediaLinks            PropertyMedia[]
}
```

#### PropertyRoom (significantly modified)

```prisma
model PropertyRoom {
  id                    String      @id @default(cuid())
  propertyId            String
  roomType              RoomType                           // NEW enum
  rentPerMonth          Decimal
  rentPerWeek           Decimal                            // calculated
  depositAmount         Decimal
  expectedCommissionAmt Decimal                            // in £, NEW
  status                RoomStatus  @default(AVAILABLE)
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  property              Property    @relation(...)
  sale                  Sale?
}
```

#### PotentialLandlord (significantly modified)

```prisma
model PotentialLandlord {
  id               String    @id @default(cuid())
  addedByAgentId   String
  firstName        String                                  // NEW split
  lastName         String                                  // NEW split
  phone            String    @unique
  phoneLast10      String
  email            String?
  scheduledAt      DateTime                                // follow-up scheduled time
  isLocked         Boolean   @default(true)
  lockedUntil      DateTime                                // scheduledAt + 1 day
  landlordId       String?   @unique                       // set when landlord is created
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  addedByAgent     User       @relation(...)
  landlord         Landlord?  @relation(...)
  callLogs         CallLog[]
}
```

#### PotentialTenant (significantly modified – full Tenant Form fields)

```prisma
model PotentialTenant {
  id                     String    @id @default(cuid())
  addedByAgentId         String
  firstName              String
  lastName               String
  phone                  String
  phoneLast10            String
  email                  String?
  accommodationType      String
  countryOriginal        String
  nationality            String
  roomType               RoomType
  numberOfOccupants      Int
  numberOfChildren       Int
  onDSS                  Boolean
  currentlyEmployed      Boolean
  annualIncome           Decimal
  currentLivingPostcode  String                            // stored UPPERCASE
  workplacePostcode      String                            // stored UPPERCASE
  maximumBudget          Decimal
  workingProfession      String
  immigrationStatus      String
  moveInDate             DateTime
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  addedByAgent           User @relation(...)
}
```

#### Tenant (redesigned – only created via Close Sale)

```prisma
model Tenant {
  id                     String    @id @default(cuid())
  saleId                 String    @unique
  addedByAgentId         String
  firstName              String
  lastName               String
  phone                  String
  phoneLast10            String
  email                  String?
  accommodationType      String
  countryOriginal        String
  nationality            String
  roomType               RoomType
  numberOfOccupants      Int
  numberOfChildren       Int
  onDSS                  Boolean
  currentlyEmployed      Boolean
  annualIncome           Decimal
  currentLivingPostcode  String                            // stored UPPERCASE
  workplacePostcode      String                            // stored UPPERCASE
  maximumBudget          Decimal
  workingProfession      String
  immigrationStatus      String
  immigrationStatus      String
  moveInDate             DateTime
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  sale                   Sale @relation(...)
  addedByAgent           User @relation(...)
}
```

#### Sale (modified)

```prisma
model Sale {
  id                  String    @id @default(cuid())
  propertyId          String
  roomId              String?   @unique                    // null for PRIVATE property sales
  closedByUserId      String
  finalRent           Decimal                              // NEW: agreed rent at close
  companyCommission   Decimal                              // NEW: company commission in £
  agentCommissionAmt  Decimal                              // derived from admin split config
  closedAt            DateTime  @default(now())

  property            Property  @relation(...)
  room                PropertyRoom? @relation(...)
  closedBy            User      @relation(...)
  tenant              Tenant?
}
```

#### CallLog (NEW model – replaces deprecated CallRecord for workflow actions)

```prisma
model CallLog {
  id                   String         @id @default(cuid())
  agentId              String
  landlordId           String?                             // set if landlord exists
  potentialLandlordId  String?                             // set if in Follow Up path
  landlordFirstName    String?                             // denormalized for history
  landlordLastName     String?
  phone                String                              // the phone number dialed/looked up
  status               CallLogStatus
  followUpScheduledAt  DateTime?                           // set for FOLLOW_UP status
  createdAt            DateTime       @default(now())

  agent                User               @relation(...)
  landlord             Landlord?          @relation(...)
  potentialLandlord    PotentialLandlord? @relation(...)
}
```

#### PropertyMedia (add alt text)

```prisma
model PropertyMedia {
  propertyId   String
  mediaAssetId String
  sortOrder    Int      @default(0)
  altText      String   @default("")                       // NEW: alt text per image

  property     Property   @relation(...)
  mediaAsset   MediaAsset @relation(...)

  @@id([propertyId, mediaAssetId])
}
```

#### DailyReport (auto-generated, structure updated)

```prisma
model DailyReport {
  id                   String   @id @default(cuid())
  agentId              String
  reportDate           DateTime
  totalSearched        Int      @default(0)               // phone lookups on dashboard
  totalCallsMade       Int      @default(0)               // total CallLogs for the day
  callsConnected       Int      @default(0)               // CONFIRMED + NOT_INTERESTED + FOLLOW_UP
  propertiesConfirmed  Int      @default(0)               // CONFIRMED logs
  notInterested        Int      @default(0)               // NOT_INTERESTED logs
  followUp             Int      @default(0)               // FOLLOW_UP logs
  potentialTenants     Int      @default(0)               // PotentialTenants added today
  salesClosed          Int      @default(0)               // Sales closed today
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  agent                User @relation(...)

  @@unique([agentId, reportDate])
}
```

---

## 4. PAGE-BY-PAGE BEHAVIOR

### 4.1 Dashboard (`/dashboard`)

**Unchanged:** All existing stat cards remain.

**New – Landlord Lookup Widget (top of dashboard or prominent section):**

1. Agent types a landlord phone number and clicks **Lookup**.
2. System calls `GET /api/landlords/check-number?phone=<number>`.
3. **Case A – Found, different agent's landlord:**
   - Display: "This landlord is registered with another agent."
   - Action: Send in-app notification to the owner agent (type: `LANDLORD_LOOKUP_ALERT`).
   - No further action for the searching agent.
4. **Case B – Found, same agent's landlord:**
   - Display: Landlord card (name, phone).
   - Action button: **Add Property**.
   - Clicking Add Property → `/properties/new?landlordId=<id>` (property form pre-bound to that landlord).
5. **Case C – Not found:**
   - Display: "No landlord found."
   - Action button: **Start**.
   - Clicking Start → `/start?phone=<number>` (3-option page).

**Phone number matching:** Normalize to last 10 digits for lookup (strip country code). Match against `phoneLast10`.

---

### 4.2 Start Page (`/start?phone=<number>`)

Displays exactly **3 options** as large, clear buttons/cards:

| Option | Label | Action |
|--------|-------|--------|
| 1 | Interested | → `/start/interested?phone=<number>` |
| 2 | Not Interested | → Logs call as NOT_INTERESTED, redirects to dashboard |
| 3 | Follow Up | → `/start/follow-up?phone=<number>` |

**Every option click auto-creates a CallLog entry before navigating away.**

---

### 4.3 Start – Interested Page (`/start/interested?phone=<number>`)

**Section 1: Landlord Form** (phone pre-filled, non-editable)  
**Section 2: Property Form** (Private or Shared, based on Property Type selection)

On submit:
1. Create Landlord record.
2. Create Property record (linked to new landlord).
3. Auto-generate `propertyRef`.
4. Update the pre-existing CallLog to status `CONFIRMED`.
5. Redirect to newly created property detail page.

---

### 4.4 Start – Follow Up Page (`/start/follow-up?phone=<number>`)

**Section 1: Landlord Form** (phone pre-filled)  
**Section 2: Schedule** – Date picker + Time picker for follow-up appointment

On submit:
1. Create PotentialLandlord record.
2. Set `scheduledAt` = selected date/time.
3. Set `isLocked = true`, `lockedUntil = scheduledAt + 1 day`.
4. CallLog status = `FOLLOW_UP`, `followUpScheduledAt` = scheduledAt.
5. Auto-add landlord to Dialer Contacts (if not already present).
6. Schedule reminder jobs (see §7).
7. Redirect to Potential Landlords page.

---

### 4.5 Potential Landlords Page (`/potential-landlords`)

Lists the agent's Follow Up landlords.

**Columns:** Name, Phone, Scheduled Date/Time, Status (Locked / Unlocked), Actions

**Per row – Continue button:**
- Visible when: agent is the owner OR `lockedUntil` has passed.
- Clicking Continue → `/start?phone=<phone>` (restarts 3-option flow for this landlord).
- The new CallLog created from this Continue flow links to the existing `potentialLandlordId`.

**Filters:** Date range, lock status (Locked / Unlocked / All)

---

### 4.6 Properties Page (`/properties`)

**Add button behavior:**
1. Clicking Add → opens modal or navigates to `/properties/new`.
2. First step: **Select Landlord** – dropdown/search showing ONLY the agent's own landlords.
3. After selecting landlord → full Property Form.

**Filters (agent):** Status (Draft/Active/Closed), Property Type (Private/Shared), Property Category, City, Postcode, Date range (created), Availability date range

**Filters (admin):** All agent filters + Agent selector

**Per-property actions:**
- View details
- Edit (goes through approval if admin-configured)
- Close Sale (see §4.8)
- Change status (Draft ↔ Active)

---

### 4.7 Property Detail Page (`/properties/[id]`)

**Private Property:**
- Shows all property fields + photos with alt text
- Close Sale button at property level (only if status = ACTIVE)

**Shared Property:**
- Shows property-level fields + photos
- Room table listing each room with: Room Type, Rent/Month, Rent/Week, Deposit, Commission, Status
- Each room has its own Close Sale button (only if room status = AVAILABLE)

---

### 4.8 Close Sale Flow (`/properties/[id]/close-sale` or `/properties/[id]/rooms/[roomId]/close`)

**Form includes:**
1. **Tenant Form** (full, same as §4.11)
2. **Rent** – final agreed rent between landlord and tenant (£, required)
3. **Company Commission** – total company commission in £ (required)

On submit:
1. Create Tenant record.
2. Create Sale record (with `finalRent`, `companyCommission`, `agentCommissionAmt` derived from admin split config).
3. Update Property status → CLOSED (for private) OR update Room status → CLOSED (for shared).
4. If all rooms are CLOSED on a shared property → Property status → CLOSED.
5. Tenant appears on Tenants page.
6. Sale appears on Sales page.

---

### 4.9 Landlords Page (`/landlords`)

**No direct Add button.** Landlords are created only via dashboard lookup flow.

**Columns:** Name, Phone, Email, Properties (count), Date Added, Actions

**Per-row actions:** View details, View properties

**Filters (agent):** Search by name/phone, Date added range  
**Filters (admin):** All agent filters + Agent selector

---

### 4.10 Landlord Detail Page (`/landlords/[id]`)

Shows landlord info + list of their properties (with mini-cards).

**No edit button visible to agent by default** (edits go through admin approval workflow – RETAINED R12).

---

### 4.11 Potential Tenants Page (`/potential-tenants`)

**Add Potential Tenant button** → opens Tenant Form (full, no Close Sale fields).

On submit → creates PotentialTenant record.

**Columns:** Name, Phone, Room Type, Budget, Move-in Date, Date Added, Actions  
**Filters (agent):** Room type, Budget range, Move-in date range, DSS (Yes/No), Employment status  
**Filters (admin):** All above + Agent selector

---

### 4.12 Tenants Page (`/tenants`)

**No Add button.** Tenants only created via Close Sale.

**Columns:** Name, Phone, Room Type, Final Rent, Move-in Date, Date Closed, Property, Actions  
**Filters (agent):** Room type, Move-in date range, DSS, Property  
**Filters (admin):** All above + Agent selector

---

### 4.13 Sales Page (`/sales`)

**No Add button.** Sales only created via Close Sale.

**Columns:** Property, Room (if shared), Tenant Name, Final Rent, Company Commission, Agent Commission, Closed By, Closed Date  
**Filters (agent):** Date range, Property type, Rent range  
**Filters (admin):** All above + Agent selector, Commission range

---

### 4.14 Call History Page (`/call-records`)

Auto-generated. No manual entries.

**Columns:** Landlord Name (or "Unknown"), Phone, Status (Confirmed/Not Interested/Follow Up), Follow-up Date (if applicable), Date/Time  
**Filters:** Status, Date range, Phone search

---

### 4.15 Daily Reports Page (`/daily-reports`)

Auto-generated. No manual submission.

Agent sees only their own reports.

**Columns:** Date, Searches, Calls Made, Connected, Confirmed, Not Interested, Follow Up, Potential Tenants, Sales Closed  
**Filters:** Date range

---

### 4.16 Admin Reports Page (`/admin/reports`)

Admin sees reports per agent.

**Filters:** Agent, Date range, Any metric threshold

---

### 4.17 Contacts (Dialer Contacts – `/dialer/contacts`)

Retained as-is (R4, R11).

**NEW auto-add behavior:**
- When a landlord is marked **Interested** (and landlord is created): auto-add to Dialer Contacts if not already present.
- When a landlord is marked **Follow Up** (and PotentialLandlord is created): auto-add to Dialer Contacts if not already present.
- Auto-add uses: name = `firstName + lastName`, phone = landlord's phone.

---

## 5. WORKFLOW STATES & FLOW MAP

### 5.1 Landlord Lookup Flow

```
Dashboard
    └── [Enter phone] → [Lookup]
            ├── Phone found, different agent
            │       └── Show "Exists with another agent"
            │           └── Notify owner agent (notification)
            │
            ├── Phone found, same agent
            │       └── Show landlord card + [Add Property]
            │           └── → /properties/new?landlordId=<id>
            │
            └── Phone not found
                    └── Show [Start]
                        └── → /start?phone=<number>
                                ├── [Interested]   → LOG CallLog(CONFIRMED pending) → /start/interested
                                ├── [Not Interested] → LOG CallLog(NOT_INTERESTED) → Dashboard
                                └── [Follow Up]    → LOG CallLog(FOLLOW_UP pending) → /start/follow-up
```

### 5.2 Interested Flow State Machine

```
CallLog.status = CONFIRMED_PENDING
    └── [Submit Landlord Form + Property Form]
            ├── Validation passes
            │       ├── Create Landlord
            │       ├── Create Property (DRAFT or ACTIVE)
            │       ├── Update CallLog → CONFIRMED
            │       └── Redirect to /properties/[id]
            └── Validation fails
                    └── Show errors, stay on page
```

### 5.3 Follow Up State Machine

```
CallLog.status = FOLLOW_UP
PotentialLandlord.isLocked = true
PotentialLandlord.lockedUntil = scheduledAt + 1 day

    Schedule:
        - T-60min: Email reminder to agent
        - T-5min:  Email reminder + in-app notification ring to agent
        - T+0:     Follow-up time arrives
        - T+1day:  lockedUntil expires → isLocked = false (or remains if not actioned)

    [Agent clicks Continue on Potential Landlord]
        └── → /start?phone=<phone>  (restart 3-option flow)
                ├── Interested   → Create Landlord + Property; link potentialLandlordId
                ├── Not Interested → Log new CallLog (NOT_INTERESTED)
                └── Follow Up    → Create new PotentialLandlord entry (or update existing scheduledAt)
```

### 5.4 Close Sale State Machine

```
Property.status = ACTIVE (Private) OR Room.status = AVAILABLE (Shared)
    └── [Click Close Sale]
            └── [Fill Tenant Form + Rent + Company Commission]
                    ├── Validation passes
                    │       ├── Create Tenant
                    │       ├── Create Sale
                    │       ├── Set Property → CLOSED (Private) OR Room → CLOSED (Shared)
                    │       │   └── If all rooms CLOSED → Property → CLOSED
                    │       └── Redirect to /sales/[id]
                    └── Validation fails → show errors
```

### 5.5 Property Status States

```
DRAFT → ACTIVE → CLOSED
         ↑
     (can revert to DRAFT if no sale yet – admin approval may be required)
```

### 5.6 Room Status States

```
AVAILABLE → UNDER_OFFER → CLOSED
              ↑
          (set manually by agent if negotiating)
```

---

## 6. FIELD VALIDATIONS

### 6.1 Global Rules

| Rule | Details |
|------|---------|
| Postcode auto-uppercase | Applied on every `onChange` event and before save/API call. Regex: `/[a-zA-Z]/g` → `.toUpperCase()`. Store uppercase in DB. |
| Rent Per Week calculation | `rentPerWeek = (rentPerMonth * 12) / 52`. Round to 2 decimal places. Non-editable input field. |
| Property Reference auto-generation | Format: `PROP-<YEAR>-<6-digit-random>` e.g. `PROP-2026-A4F7K2`. Generated server-side on creation. |

### 6.2 Landlord Form

| Field | Required | Validation |
|-------|----------|------------|
| First Name | ✅ | 1–100 chars, letters/spaces/hyphens only |
| Last Name | ✅ | 1–100 chars, letters/spaces/hyphens only |
| Phone No | ✅ | Valid UK phone (07xx or +447xx), unique in system |
| Email | ❌ | Valid email format if provided |

### 6.3 Property Form – Private

| Field | Required | Validation |
|-------|----------|------------|
| Photos | ✅ | Minimum 1. Each must have non-empty alt text (max 200 chars). |
| Description | ✅ | 10–5000 chars |
| Rent Per Month | ✅ | Positive number, max 2 decimal places |
| Rent Per Week | auto | Non-editable; calculated from rentPerMonth |
| Deposit Amount | ✅ | Positive number, max 2 decimal places |
| Expected Commission (£) | ✅ | Positive number, max 2 decimal places |
| Address Line 1 | ✅ | 1–200 chars |
| Address Line 2 | ❌ | 0–200 chars |
| Post Code | ✅ | Valid UK postcode format; auto-uppercase |
| City | ✅ | 1–100 chars |
| Property Category | ✅ | HOUSE \| FLAT \| STUDIO_FLAT |
| No of Rooms | ✅ (if not STUDIO_FLAT) | Positive integer; hidden for STUDIO_FLAT |
| Available Rooms | ✅ (if not STUDIO_FLAT) | Positive integer ≤ No of Rooms; hidden for STUDIO_FLAT |
| Property Furnished | ✅ | Boolean (Yes/No) |
| Living Landlord | ✅ | Boolean |
| Garden | ✅ | Boolean |
| Parking | ✅ | Boolean |
| Bills Included | ✅ | Boolean |
| Balcony/Roof Terrace | ✅ | Boolean |
| Disabled Access | ✅ | Boolean |
| Living Room | ✅ | PRIVATE \| SHARED \| NONE |
| Broadband Included | ✅ | Boolean |
| Couples Allowed | ✅ | Boolean |
| Pets Allowed | ✅ | Boolean |
| DSS Allowed | ✅ | Boolean |
| Children Allowed | ✅ | Boolean |
| Availability Date | ✅ | Date; must be today or future |
| Property Reference | auto | Non-editable; server-generated |
| Initial Status | ✅ | DRAFT \| ACTIVE |

### 6.4 Property Form – Shared (Room Rows)

Each room row:

| Field | Required | Validation |
|-------|----------|------------|
| Room Type | ✅ | STUDIO_ROOM \| SINGLE_ROOM \| DOUBLE_ROOM \| ENSUITE_ROOM \| LOFT |
| Rent Per Month | ✅ | Positive number |
| Rent Per Week | auto | Calculated |
| Deposit Amount | ✅ | Positive number |
| Expected Commission (£) | ✅ | Positive number |

Minimum 1 room row required. Remove Row button disabled when only 1 row remains.

Property-level fields for Shared are identical to Private except: no `propertyCategory`, no studio flat hiding logic, `noOfRooms` and `availableRooms` are always visible and required.

### 6.5 Tenant Form (used in both Potential Tenant and Close Sale)

| Field | Required | Validation |
|-------|----------|------------|
| First Name | ✅ | 1–100 chars |
| Last Name | ✅ | 1–100 chars |
| Phone No | ✅ | Valid UK phone format |
| Email | ❌ | Valid email if provided |
| Accommodation Type | ✅ | Non-empty string (text input or dropdown – define options as needed) |
| Country Original | ✅ | Non-empty string |
| Nationality | ✅ | Non-empty string |
| Room Type | ✅ | STUDIO_ROOM \| SINGLE_ROOM \| DOUBLE_ROOM \| ENSUITE_ROOM \| LOFT |
| Number of Occupants | ✅ | Positive integer ≥ 1 |
| Number of Children | ✅ | Non-negative integer |
| On DSS | ✅ | Boolean |
| Currently Employed | ✅ | Boolean |
| Annual Income | ✅ | Non-negative number |
| Current Living Postcode | ✅ | Valid UK postcode; auto-uppercase |
| Workplace Postcode | ✅ | Valid UK postcode; auto-uppercase |
| Maximum Budget | ✅ | Positive number |
| Working Profession | ✅ | Non-empty string |
| Immigration Status | ✅ | Non-empty string |
| Move-in Date | ✅ | Date (can be past for historical entries) |

### 6.6 Close Sale Additional Fields

| Field | Required | Validation |
|-------|----------|------------|
| Rent (final agreed) | ✅ | Positive number |
| Company Commission | ✅ | Positive number in £ |

### 6.7 Follow Up Schedule Fields

| Field | Required | Validation |
|-------|----------|------------|
| Follow-up Date | ✅ | Must be today or future date |
| Follow-up Time | ✅ | Valid time; combined with date must be in the future |

---

## 7. NOTIFICATION & REMINDER LOGIC

### 7.1 Follow-Up Reminders

Implemented via a background job scheduler (recommended: Vercel Cron or BullMQ).

| Trigger Time | Action |
|-------------|--------|
| scheduledAt − 60 minutes | Send email to agent: "Reminder: Follow-up with [Name] in 1 hour at [time]" |
| scheduledAt − 5 minutes | Send email to agent: "Reminder: Follow-up with [Name] in 5 minutes" |
| scheduledAt − 5 minutes | Create in-app Notification record for agent (type: `FOLLOW_UP_RING`, triggers bell ring/highlight in UI) |

**Email content must include:** Landlord name, phone number, scheduled time, link to Potential Landlord record.

### 7.2 Landlord Lookup Alert

When Agent B looks up a phone that belongs to Agent A's landlord:

- Create Notification for Agent A: type `LANDLORD_LOOKUP_ALERT`, body: "Agent [B name] searched for your landlord [Name / phone]."
- No action required from Agent A; informational only.

### 7.3 In-App Notification Types (extend existing notification system)

| Type | Recipient | Trigger |
|------|-----------|---------|
| `LANDLORD_LOOKUP_ALERT` | Owner agent | Another agent lookups their landlord |
| `FOLLOW_UP_RING` | Owner agent | 5 minutes before scheduled follow-up |
| `FOLLOW_UP_REMINDER_1H` | Owner agent | 1 hour before scheduled follow-up (can be email-only if desired) |

### 7.4 Dialer Contact Auto-Add

On **Interested** flow completion (landlord created):
```
POST /api/dialer/contacts
{
  fullName: `${landlord.firstName} ${landlord.lastName}`,
  phoneNumber: landlord.phone,
  notes: "Auto-added from Interested flow"
}
```

On **Follow Up** flow completion (potential landlord created):
```
POST /api/dialer/contacts
{
  fullName: `${potentialLandlord.firstName} ${potentialLandlord.lastName}`,
  phoneNumber: potentialLandlord.phone,
  notes: "Auto-added from Follow Up flow"
}
```

Check for existing contact by phone before creating (de-duplicate).

---

## 8. REPORTING LOGIC

### 8.1 Daily Report Auto-Generation

Reports are calculated automatically; there is no manual submission endpoint.

**Trigger:** A scheduled job runs at midnight (or on-demand via admin) to generate/update the daily report for each agent.

**Alternatively:** Recalculate on-the-fly when the reports page is loaded (aggregate query, no stored report needed for real-time accuracy). Store for historical snapshot.

**Calculation queries per agent per day:**

| Metric | Query |
|--------|-------|
| `totalSearched` | Count of dashboard lookup attempts logged (need a `LandlordLookup` event log or derive from CallLogs + no-result lookups) |
| `totalCallsMade` | Count of CallLog entries for the day (all statuses) |
| `callsConnected` | Count of CallLog entries (all statuses – each option click = connected call) |
| `propertiesConfirmed` | Count of CallLog entries where status = CONFIRMED |
| `notInterested` | Count of CallLog entries where status = NOT_INTERESTED |
| `followUp` | Count of CallLog entries where status = FOLLOW_UP |
| `potentialTenants` | Count of PotentialTenant records created on that day by the agent |
| `salesClosed` | Count of Sale records with closedAt on that day by the agent |

> **Note on `totalSearched`:** To track lookups that result in no-match (Case C), add a lightweight `LandlordLookupEvent` log (agentId, phone, resultType: FOUND_OTHER / FOUND_OWN / NOT_FOUND, createdAt). This makes `totalSearched = count of lookup events for the day`.

### 8.2 Permissions

- Agent: `GET /api/daily-reports?agentId=self&date=...`
- Admin: `GET /api/admin/daily-reports?agentId=<any>&date=...`

---

## 9. EDGE CASES

| # | Scenario | Handling |
|---|---------|---------|
| E1 | Agent clicks Follow Up twice for same phone number | Check if active (non-expired) PotentialLandlord exists for that phone. If yes, redirect to existing record's Continue flow. Do not create duplicate. |
| E2 | Follow-up time passes with no action | `lockedUntil` expires → `isLocked` auto-sets to false via cron job. Landlord remains in Potential Landlords page. Another agent can now look up that phone and start fresh. |
| E3 | Shared property where agent adds 0 rooms | Block form submission: minimum 1 room required. |
| E4 | Available Rooms > No of Rooms | Block: validation error "Available rooms cannot exceed total rooms." |
| E5 | Close Sale clicked on DRAFT property | Button disabled / hidden for DRAFT status. Only ACTIVE properties show Close Sale. |
| E6 | All rooms closed on shared property | Auto-set Property.status = CLOSED. |
| E7 | Agent tries to add property for another agent's landlord from Properties page | Server-side check: `landlord.ownerAgentId` must equal requesting agent's id. Return 403. |
| E8 | Phone number format variation (spaces, dashes, +44 vs 07xx) | Normalize to E.164 before storing and to last 10 digits for lookup. Always match on `phoneLast10`. |
| E9 | Postcode entered with mixed case | Auto-uppercase on every keystroke in frontend; server also transforms before storing. |
| E10 | Agent navigates directly to `/start/interested` without phone param | Redirect to dashboard. |
| E11 | Follow-up email fails to send | Log email failure to audit log. Do not block the follow-up creation. Retry via job queue. |
| E12 | Two agents simultaneously look up same unclaimed phone | Race condition: first to submit Interested/Follow Up creates the record. Second agent gets the "exists with another agent" / "already a potential landlord" response. Use DB-level unique constraint on `phone`. |
| E13 | Agent deactivated mid-flow | Sessions invalidated. Locked follow-up landlords remain locked until `lockedUntil` expires. Admin can reassign. |
| E14 | Studio Flat rooms/available rooms submitted despite being hidden | Server-side: if `propertyCategory === STUDIO_FLAT`, ignore/null out `noOfRooms` and `availableRooms`. |
| E15 | Photo uploaded without alt text | Block submission. Show inline error: "Please add alt text for all photos." |

---

## 10. DEVELOPER HANDOFF NOTES

### 10.1 Migration Strategy

1. **Schema migration must be sequential.** Do not apply all changes in one migration.
   - Phase 1: Add new columns as nullable. Backfill data.
   - Phase 2: Add NOT NULL constraints after backfill.
   - Phase 3: Drop deprecated columns.

2. **Data backfill for Landlord name split:**
   - `firstName = landlordName.split(' ')[0]`
   - `lastName = landlordName.split(' ').slice(1).join(' ') || ''`
   - Manually review records with empty lastName after migration.

3. **Postcode backfill:**
   - Run: `UPDATE "Property" SET postcode = UPPER(postcode);`
   - Run: `UPDATE "PotentialTenant" SET "currentLivingPostcode" = UPPER("currentLivingPostcode"), "workplacePostcode" = UPPER("workplacePostcode");`
   - Run equivalent for any other postcode fields.

4. **CallRecord migration:**
   - Map existing `CallRecord` entries to `CallLog` where possible.
   - Entries with no clear status mapping should be archived, not deleted.

5. **DailyReport migration:**
   - Existing manually-submitted reports: keep as historical data.
   - Going forward: auto-generation only. Remove manual POST endpoint.

### 10.2 API Changes Summary

| Old Endpoint | New Behavior |
|-------------|-------------|
| `POST /api/landlords` | Remove direct access for agents. Only callable from Interested flow server action. |
| `POST /api/call-records` | Deprecated. Remove manual creation endpoint. |
| `POST /api/daily-reports` | Deprecated for agents. Convert to internal/admin-triggered recalculation. |
| `GET /api/landlords/check-number` | Extend to return ownership info and lock status. |
| `POST /api/properties` | Add server-side check: landlord must belong to requesting agent. |

**New Endpoints Needed:**

| Endpoint | Purpose |
|----------|---------|
| `POST /api/start/interested` | Full Interested flow: create landlord + property + call log atomically |
| `POST /api/start/not-interested` | Log NOT_INTERESTED call log |
| `POST /api/start/follow-up` | Create potential landlord + call log + schedule reminders |
| `GET /api/daily-reports/recalculate` | Admin trigger to recalculate reports |
| `POST /api/landlord-lookups` | Log each lookup attempt (for totalSearched metric) |
| `GET /api/potential-landlords/[id]/continue` | Validate lock status, return restart flow URL |
| `POST /api/properties/[id]/close-sale` | Unified close sale: creates tenant + sale atomically |
| `POST /api/properties/[id]/rooms/[roomId]/close` | Room-level close sale |

### 10.3 Frontend Postcode Handling

In every form input that captures a postcode, add:

```tsx
// React controlled input pattern
<input
  value={postcode}
  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
  // or onInput for uncontrolled
/>
```

In API route handlers, normalize before storing:
```ts
const normalizedPostcode = body.postcode?.toUpperCase().trim()
```

### 10.4 Rent Per Week Calculation

```ts
function calcRentPerWeek(rentPerMonth: number): number {
  return Math.round((rentPerMonth * 12 / 52) * 100) / 100
}
```

React: Derive this value in a `useMemo` or computed value; render as a disabled/readonly input.

### 10.5 Property Reference Generation

```ts
function generatePropertyRef(): string {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const random = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `PROP-${year}-${random}`
}
```

Generate server-side in the create property API route. Retry on collision (unique constraint on `propertyRef`).

### 10.6 Reminder Job System

Recommended approach for Vercel/Next.js deployment:

**Option A – Vercel Cron (simple):**
- Add a cron at `*/1 * * * *` (every minute).
- API route: `GET /api/cron/follow-up-reminders`
- Query: `PotentialLandlord WHERE scheduledAt BETWEEN now()+4min AND now()+6min AND isLocked=true` → send 5-min reminder.
- Query: `PotentialLandlord WHERE scheduledAt BETWEEN now()+59min AND now()+61min` → send 1-hour reminder.
- Track sent flags on PotentialLandlord: `reminder1hSent Boolean`, `reminder5mSent Boolean`.

**Option B – BullMQ / Redis (robust):**
- On follow-up creation, enqueue two delayed jobs.
- Job 1: delay = scheduledAt − 60min − now.
- Job 2: delay = scheduledAt − 5min − now.
- Requires Redis add-on.

### 10.7 Filter Implementation Pattern

For each entity list page, implement server-side filtering via query params:

```
/api/properties?status=ACTIVE&propertyType=PRIVATE&city=London&from=2026-01-01&to=2026-12-31
```

Use Prisma `where` clauses built from optional params. Never filter client-side for security.

### 10.8 Lock Enforcement

When an agent attempts to access `/start?phone=<phone>` where that phone belongs to a locked PotentialLandlord owned by another agent:
1. Server-side: return 403 with message "This lead is currently reserved by another agent."
2. Frontend: show informative message, do not show the 3-option buttons.

### 10.9 Commission Calculation

On Close Sale:
1. Fetch admin `CommissionConfig` (singleton record).
2. If `type = FIXED`: `agentCommissionAmt = commissionConfig.fixedAmount`.
3. If `type = FLEXIBLE`: find applicable range based on `companyCommission` value.
4. Store both `companyCommission` (total, entered by agent) and `agentCommissionAmt` (agent's share per config).
5. Do not expose the commission split calculation formula to the agent.

---

## APPENDIX A – DEPRECATED OLD LOGIC LIST (Quick Reference)

```
D1  /landlords/new direct add page
D2  Properties Add without landlord pre-selection
D3  Manual call log creation
D4  Manual daily report submission
D5  Old potential landlord add flow
D6  Old start flow options (any other than 3 specified)
D7  VacancyType enum (SINGLE/MULTIPLE)
D8  beds / baths fields on Property
D9  landlordDemand field (Property + PropertyRoom)
D10 expectedCommissionPct (Property + PropertyRoom)
D11 county field on Property
D12 roomName freetext on PropertyRoom
D13 personsAllowed freetext on Property
D14 Old tenant direct add flow
D15 landlordName / fullName single combined field (Landlord)
D16 fullName single combined field (PotentialLandlord, PotentialTenant)
D17 publishedToWebsite as required agent step
D18 ScheduledCall model (old scheduled calls)
D19 CallRecord model (replaced by CallLog)
D20 DailyReport manual POST for agents
D21 PotentialTenant.interestedIn / budget freetext
D22 Tenant.fullName / currentAddress combined
D23 Old contact add logic outside Contacts page
```

---

## APPENDIX B – RETAINED OLD LOGIC LIST (Quick Reference)

```
R1  Dashboard stats (all existing stat cards)
R2  Admin commission split configuration
R3  Templates system (unchanged)
R4  VoIP / Dialer system (unchanged)
R5  Auth system (email + OTP + JWT)
R6  Admin management pages
R7  Inter-agent chat / messaging
R8  Audit log system
R9  Media library / property photos (+ add alt text)
R10 Notification bell UI (+ new triggers added)
R11 Dialer contacts (+ auto-add from flows)
R12 Admin-side property edit approvals
R13 publishedToWebsite (admin-only, not agent-facing)
R14 Website public API
```

---

## APPENDIX C – STATE/FLOW MAP SUMMARY

```
DASHBOARD
    └── Lookup [phone]
            ├── Found (other agent) → Notify owner → END
            ├── Found (own agent)   → Add Property → /properties/new?landlordId=
            └── Not found           → Start
                    ├── INTERESTED   → Landlord Form + Property Form → Create both → CallLog(CONFIRMED)
                    ├── NOT INTERESTED → Dashboard → CallLog(NOT_INTERESTED)
                    └── FOLLOW UP    → Landlord Form + Schedule → PotentialLandlord → CallLog(FOLLOW_UP)
                                                                        └── Reminders scheduled
                                                                        └── Locked for others (scheduledAt + 1d)
                                                                        └── Contacts auto-add

POTENTIAL LANDLORDS PAGE
    └── [Continue] → Start (3 options again, linked to potentialLandlordId)

PROPERTIES PAGE
    └── [Add] → Select landlord (own only) → Property Form → Create

PROPERTY DETAIL (ACTIVE)
    ├── Private: [Close Sale] → Tenant Form + Rent + Commission → Create Tenant + Sale
    └── Shared:  [Close Sale per room] → same as above

POTENTIAL TENANTS PAGE
    └── [Add Potential Tenant] → Tenant Form → Create PotentialTenant

CALL HISTORY → Auto-populated from all flow actions
DAILY REPORTS → Auto-calculated from all portal activity
CONTACTS      → Retained + auto-seeded from Interested/Follow Up
```

---

*End of MHG Portal Agent-Side Revamp Specification*
