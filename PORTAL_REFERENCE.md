# MHG Portal Complete Reference

This file is the current source-of-truth reference for the More Homes Group portal so future redesign work can cover the full system without missing any admin or agent functionality.

## 1. Portal Roles

### Public / unauthenticated

- `/`
- `/login`
- `/verify-otp`
- `/admin/login`
- `/admin/verify-otp`

### Agent access

- Agents use the protected app under `app/(protected)`.
- Agents get the `AgentShell`.
- Agents have sidebar navigation, landlord number lookup, notifications, floating chat, account/profile access, and logout.

### Admin access

- Admins use the `/admin` area.
- Admins get the `AdminShell`.
- Admins have admin navigation, admin shortcuts, floating chat, profile access, and logout.
- Admins can also open the agent view from the admin shell.

## 2. Shared Portal Systems

### Authentication

- Email/login flow via `/api/auth/login`
- OTP verification via `/api/auth/verify-otp`
- Logout via `/api/auth/logout`
- Activity tracking via `/api/auth/activity`

### Shared shell behavior

- Global top nav for non-protected/non-admin pages via `components/app-shell.tsx`
- Agent full shell via `app/(protected)/agent-shell.tsx`
- Admin full shell via `app/admin/admin-shell.tsx`
- Session activity tracking via `AuthActivityTracker`

### Shared communication

- Notifications UI + dropdown
- Floating chat widget
- Full chat/conversation APIs

### Shared user utilities

- Profile update support
- Notification read/read-all support
- Notes
- Templates

## 3. Agent Portal

## 3.1 Agent Shell Features

- Dashboard-style workspace shell
- Sidebar grouped into `Core`, `Pipeline`, and `Support`
- Top header with breadcrumb, page title, page description, notification bell, user pill
- Quick landlord number lookup directly in shell
- Lookup outcomes:
- Existing landlord owned by current agent -> continue to property creation
- Existing landlord owned by another agent -> blocked from creation
- New number -> Interested / Follow Up / Not Interested options
- Floating chat with other users
- Profile card and logout

## 3.2 Agent Sidebar Navigation

### Core

- `/dashboard` -> Dashboard
- `/start` -> Start Call
- `/dialer` -> Dialpad
- `/dialer/history` -> Call History
- `/dialer/intercalling` -> Intercalling
- `/dialer/contacts` -> Contacts

### Pipeline

- `/landlords` -> Landlords
- `/properties` -> Properties
- `/sales` -> Sales
- `/tenants` -> Tenants
- `/potential-tenants` -> Potential Tenants
- `/potential-landlords` -> Potential Landlords

### Support

- `/daily-reports` -> Daily Reports
- `/call-records` -> Call Records
- `/notes` -> My Notes
- `/templates` -> Templates

### Additional agent-access screens

- `/messages` -> full agent messaging screen
- `/profile` -> profile page

## 3.3 Agent Screen Inventory

### Dashboard and overview

- `/dashboard`
- Main performance dashboard for agent portfolio
- Includes KPI cards, sales filtering, postcode/property search, recent properties, recent sales, recent tenants, recent landlords, quick actions, and status breakdowns

### Start-call workflow

- `/start`
- Workflow selection hub after checking landlord number
- `/start/interested`
- Registers landlord + property details
- Includes landlord info, property type, address, amenities, room setup, pricing, commission, and availability
- `/start/follow-up`
- Schedules follow-up date/time
- Lead is locked to the agent until scheduled time plus one day
- Reminder emails are expected before the scheduled time
- `Not Interested`
- Logged directly from shell lookup via `/api/start/not-interested`

### Dialer workspace

- `/dialer`
- Main dialpad page
- Supports recent calls, keypad, speaker selection, call initiation, call status, incoming calls, live call controls
- Supports SIP and Linkus modes
- `/dialer/history`
- Full dialer history view
- `/dialer/intercalling`
- Internal calling / agent-to-agent calling
- `/dialer/contacts`
- Saved dialer contacts

### Pipeline management

- `/landlords`
- Landlord registry/list
- `/landlords/new`
- New landlord / add property flow entry
- `/landlords/[id]`
- Landlord detail page
- `/landlords/[id]/properties`
- Properties under a specific landlord

- `/properties`
- Property list/grid
- `/properties/new`
- New property creation
- `/properties/[id]`
- Property detail page
- `/properties/[id]/edit`
- Property edit page

- `/sales`
- Sales list and filtering
- `/sales/[id]`
- Sale detail page

- `/tenants`
- Tenant list
- `/tenants/[id]`
- Tenant detail page

- `/potential-tenants`
- Potential tenant list
- `/potential-tenants/[id]`
- Potential tenant detail page

- `/potential-landlords`
- Potential landlord list
- `/potential-landlords/[id]`
- Potential landlord detail page

### Support / operations

- `/daily-reports`
- Daily reporting page
- `/call-records`
- Call records list/audit page
- `/notes`
- Personal notes
- `/templates`
- Reusable templates
- `/messages`
- Full messaging interface for agent with other active users
- `/profile`
- Agent profile page

## 3.4 Agent Workflow Summary

### Agent lead flow

- Check landlord number
- If landlord exists and belongs to agent -> continue with property creation
- If landlord exists and belongs to another agent -> block duplicate ownership action
- If number is new -> Interested / Follow Up / Not Interested

### Agent property flow

- Create landlord + property from interested flow
- Manage property details
- Manage rooms where applicable
- Publish property
- Close rooms
- Close sale on property

### Agent sales flow

- View sales
- Track commission and profit figures
- Move sold properties into tenant records

### Agent communication flow

- Floating chat
- Full messages page
- Notifications
- Dialer
- Call records
- Templates
- Notes

## 4. Admin Portal

## 4.1 Admin Shell Features

- Dedicated admin dashboard shell
- Sidebar grouped into `Overview`, `Operations`, and `Control`
- Top header with breadcrumb, page title, and page description
- Admin shortcut strip
- Floating chat with agents
- Admin profile card and logout

## 4.2 Admin Sidebar Navigation

### Overview

- `/admin` -> Dashboard
- `/admin/reports` -> Reports
- `/admin/approvals` -> Approvals

### Operations

- `/admin/agents` -> Agents
- `/admin/landlords` -> Landlords
- `/admin/properties` -> Properties
- `/admin/sales` -> Sales
- `/admin/tenants` -> Tenants
- `/admin/potential-tenants` -> Potential Tenants
- `/admin/potential-landlords` -> Potential Landlords

### Control

- `/admin/audit` -> Audit Logs
- `/admin/commission` -> Commission
- `/admin/dialer-domain` -> Dialer Settings

### Additional admin-access screens

- `/admin/profile`
- `/admin/chat`

## 4.3 Admin Screen Inventory

### Dashboard and reporting

- `/admin`
- Platform-wide dashboard
- Includes sales overview, postcode property search, financial cards, property status, agent performance, recent sales, recent agents, audit activity, quick actions

- `/admin/reports`
- Reporting/analytics screen for broader operational reporting

- `/admin/approvals`
- Pending approval management

### Operations management

- `/admin/agents`
- Agent list / management
- `/admin/agents/[id]`
- Agent report/detail page
- `/admin/agents/[id]/settings`
- Agent-specific settings page

- `/admin/landlords`
- Platform-wide landlord management

- `/admin/properties`
- Platform-wide property management
- `/admin/properties/[id]`
- Property detail page
- `/admin/properties/[id]/edit`
- Property edit page

- `/admin/sales`
- Platform-wide sales management
- `/admin/sales/[id]`
- Sale detail page

- `/admin/tenants`
- Platform-wide tenant management
- `/admin/tenants/[id]`
- Tenant detail page

- `/admin/potential-tenants`
- Potential tenant management
- `/admin/potential-tenants/[id]`
- Potential tenant detail page

- `/admin/potential-landlords`
- Potential landlord management
- `/admin/potential-landlords/[id]`
- Potential landlord detail page

### Governance / control

- `/admin/audit`
- Audit log review

- `/admin/commission`
- Commission config management
- Fixed and flexible commission support exists in code paths

- `/admin/dialer-domain`
- Dialer domain / dialer mode management
- Supports SIP/Linkus configuration in the system

### Admin utilities

- `/admin/profile`
- Admin profile page
- `/admin/chat`
- Admin-to-agent messaging page

## 4.4 Admin Workflow Summary

### Admin operational oversight

- Monitor platform-wide KPIs
- Review recent sales
- Review recent activity / audit logs
- Review property status mix
- Review agent performance

### Admin management controls

- Create/update/manage agents
- Reassign records/users
- Manage approvals
- Manage commission logic
- Manage dialer configuration
- Audit sensitive actions

## 5. Core Business Objects In The Portal

- Users
- Agents
- Admins
- Landlords
- Properties
- Rooms
- Sales
- Tenants
- Potential Landlords
- Potential Tenants
- Notes
- Notifications
- Chat conversations/messages
- Dialer contacts
- Dialer call history
- Call records / call logs
- Daily reports
- Scheduled calls
- Approvals
- Media library / property media

## 6. Route Inventory By UI Area

### Public/auth routes

- `app/page.tsx`
- `app/login/page.tsx`
- `app/verify-otp/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/verify-otp/page.tsx`

### Agent routes

- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/start/page.tsx`
- `app/(protected)/start/interested/page.tsx`
- `app/(protected)/start/follow-up/page.tsx`
- `app/(protected)/dialer/page.tsx`
- `app/(protected)/dialer/history/page.tsx`
- `app/(protected)/dialer/intercalling/page.tsx`
- `app/(protected)/dialer/contacts/page.tsx`
- `app/(protected)/landlords/page.tsx`
- `app/(protected)/landlords/new/page.tsx`
- `app/(protected)/landlords/[id]/page.tsx`
- `app/(protected)/landlords/[id]/properties/page.tsx`
- `app/(protected)/properties/page.tsx`
- `app/(protected)/properties/new/page.tsx`
- `app/(protected)/properties/[id]/page.tsx`
- `app/(protected)/properties/[id]/edit/page.tsx`
- `app/(protected)/sales/page.tsx`
- `app/(protected)/sales/[id]/page.tsx`
- `app/(protected)/tenants/page.tsx`
- `app/(protected)/tenants/[id]/page.tsx`
- `app/(protected)/potential-tenants/page.tsx`
- `app/(protected)/potential-tenants/[id]/page.tsx`
- `app/(protected)/potential-landlords/page.tsx`
- `app/(protected)/potential-landlords/[id]/page.tsx`
- `app/(protected)/daily-reports/page.tsx`
- `app/(protected)/call-records/page.tsx`
- `app/(protected)/notes/page.tsx`
- `app/(protected)/templates/page.tsx`
- `app/(protected)/messages/page.tsx`
- `app/(protected)/profile/page.tsx`

### Admin routes

- `app/admin/page.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/approvals/page.tsx`
- `app/admin/agents/page.tsx`
- `app/admin/agents/[id]/page.tsx`
- `app/admin/agents/[id]/settings/page.tsx`
- `app/admin/landlords/page.tsx`
- `app/admin/properties/page.tsx`
- `app/admin/properties/[id]/page.tsx`
- `app/admin/properties/[id]/edit/page.tsx`
- `app/admin/sales/page.tsx`
- `app/admin/sales/[id]/page.tsx`
- `app/admin/tenants/page.tsx`
- `app/admin/tenants/[id]/page.tsx`
- `app/admin/potential-tenants/page.tsx`
- `app/admin/potential-tenants/[id]/page.tsx`
- `app/admin/potential-landlords/page.tsx`
- `app/admin/potential-landlords/[id]/page.tsx`
- `app/admin/audit/page.tsx`
- `app/admin/commission/page.tsx`
- `app/admin/dialer-domain/page.tsx`
- `app/admin/profile/page.tsx`
- `app/admin/chat/page.tsx`

## 7. API Capability Map

### Auth and profile

- `/api/auth/login`
- `/api/auth/verify-otp`
- `/api/auth/logout`
- `/api/auth/activity`
- `/api/profile`

### Notifications and chat

- `/api/notifications`
- `/api/notifications/[id]/read`
- `/api/notifications/read-all`
- `/api/chat/conversations`
- `/api/chat/conversations/[agentId]`
- `/api/chat/messages`

### Start-call / lead intake

- `/api/landlords/check-number`
- `/api/start/interested`
- `/api/start/follow-up`
- `/api/start/not-interested`
- `/api/scheduled-calls`
- `/api/scheduled-calls/[id]`

### Landlords

- `/api/landlords`
- `/api/landlords/[landlordId]`
- `/api/landlords/[landlordId]/status`
- `/api/landlords/[landlordId]/properties`

### Properties and rooms

- `/api/properties`
- `/api/properties/intake`
- `/api/properties/[propertyId]`
- `/api/properties/[propertyId]/publish`
- `/api/properties/[propertyId]/close-sale`
- `/api/properties/[propertyId]/rooms`
- `/api/properties/[propertyId]/rooms/[roomId]`
- `/api/properties/[propertyId]/rooms/[roomId]/close`
- `/api/media-library`

### Sales and tenants

- `/api/sales`
- `/api/tenants`
- `/api/tenants/[tenantId]`

### Potential leads

- `/api/potential-landlords`
- `/api/potential-landlords/[landlordId]`
- `/api/potential-tenants`
- `/api/potential-tenants/[tenantId]`

### Daily reports, notes, call data

- `/api/daily-reports`
- `/api/daily-reports/auto`
- `/api/notes`
- `/api/notes/[id]`
- `/api/call-records`
- `/api/call-records/[id]`
- `/api/call-logs`

### Dialer

- `/api/dialer/bootstrap`
- `/api/dialer/history`
- `/api/dialer/history/[callId]`
- `/api/dialer/contacts`
- `/api/dialer/contacts/[contactId]`
- `/api/dialer/labels`
- `/api/dialer/labels/[labelId]`

### Approvals

- `/api/approvals`
- `/api/approvals/[approvalId]`

### Admin APIs

- `/api/admin/users`
- `/api/admin/users/[userId]`
- `/api/admin/users/[userId]/settings`
- `/api/admin/users/[userId]/reassign`
- `/api/admin/tenants`
- `/api/admin/call-records`
- `/api/admin/daily-reports`
- `/api/admin/dialer-domain`
- `/api/admin/commission`
- `/api/admin/audit`

### Website/public property feed

- `/api/website/properties`
- `/api/website/properties/[propertyId]`

### Automation / cron

- `/api/cron/follow-up-reminders`

## 8. Important Design Targets For The Future Redesign

When redesigning, these areas must be considered part of the complete portal:

- Public auth flow
- Agent shell
- Admin shell
- Agent dashboard
- Admin dashboard
- Start-call workflow
- Interested form
- Follow-up form
- Dialer main page
- Dialer history / intercalling / contacts
- Landlords
- Properties
- Sales
- Tenants
- Potential landlords
- Potential tenants
- Daily reports
- Call records
- Notes
- Templates
- Agent messages
- Admin chat
- Notifications
- Profile/account areas
- Admin approvals
- Admin reports
- Admin audit
- Admin commission
- Admin dialer settings

## 9. Recommended Use Of This File

- Use this file as the master checklist before changing layout/navigation
- Use this file to ensure no page or role-specific option is dropped in redesign
- Add future sections here whenever new pages, sidebars, workflows, or backend modules are introduced
