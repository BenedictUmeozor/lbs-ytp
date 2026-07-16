# YTP Smart Waste Management MVP — Implementation Checklist

This document is the implementation source of truth for the approved PRD in:

`docs/YTP_Smart_Waste_MVP_PRD.md`

The MVP must demonstrate this operational chain:

```text
Detect
→ Locate
→ Prioritise
→ Schedule
→ Route
→ Collect
→ Confirm
→ Resolve
```

Features that do not support this chain or the approved PRD must not be added.

---

## 1. Checklist Rules

### Agent rules

* [ ] Read the approved PRD before beginning a phase.
* [ ] Read this checklist before beginning a phase.
* [ ] Read the handoff summary from previously completed phases.
* [ ] Work only on the items included in the current implementation plan.
* [ ] Do not begin later phases unless the plan explicitly requires a dependency from them.
* [ ] Do not make product or architectural decisions that have not been approved.
* [ ] Record unresolved decisions in the Decision Log and stop at the affected boundary.
* [ ] Do not add features outside the approved MVP.
* [ ] Keep real and simulated capabilities visibly distinguishable.
* [ ] Use the approved product language.
* [ ] Update this checklist after completing implementation.
* [ ] Check an item only when its implementation and acceptance criteria are complete.
* [ ] Do not check an entire phase until all required child items are complete.
* [ ] Add a concise phase handoff summary after completing every phase.
* [ ] Run checks only for files touched in the phase.
* [ ] Do not run repository-wide lint or type-check commands unless specifically instructed.

### Completion labels

* **Real:** Uses a real external input or service.
* **Simulated:** Uses controlled demo data.
* **Foundation:** Enables later functionality but is not independently visible.
* **Decision required:** Must be resolved by the product owner before implementation.
* **Future only:** Must not be implemented in this MVP.

### Manual QA

Manual QA is intentionally not assigned to the coding agent in this checklist. It will be tracked separately by the product owner.

---

## 2. Current Status

* **Current phase:** Phase 8
* **Current milestone:** Collection Tasks and Automatic Scheduling Rules
* **PRD status:** Approved
* **Pilot location:** Bariga, Lagos
* **Software cost target:** ₦0
* **Primary user:** LAWMA fleet manager
* **Secondary user:** Lagos resident

---

## 3. Approved Technology Stack

* [x] Next.js with TypeScript selected.
* [x] Tailwind CSS selected.
* [x] shadcn/ui selected.
* [x] Convex selected for the backend and database.
* [x] Convex subscriptions selected for real-time updates.
* [x] Convex HTTP actions selected for webhooks.
* [x] Leaflet selected for map rendering.
* [x] OpenStreetMap selected for map tiles.
* [x] Nominatim selected for geocoding.
* [x] Gemini free tier selected for AI-assisted report triage.
* [x] Local keyword and rules engine selected as the AI fallback.
* [x] Meta WhatsApp Cloud API test number selected.
* [x] Vercel Hobby selected for hosting.
* [x] Custom priority-and-distance algorithm selected for route ordering.
* [x] No separate Express server will be introduced.

---

## 4. Decision Log

The coding agent must not resolve these decisions independently.

### D-01 — Fleet-manager authentication

* [x] Choose the fleet-manager authentication approach.
* [x] Confirm how the demo fleet-manager account will be created.
* [x] Confirm how protected dashboard routes will be enforced.
* **Required before:** Phase 2
* **Status:** Approved — Clerk with Convex. See [D-01](decisions/D-01_FLEET_MANAGER_AUTHENTICATION.md).

### D-02 — Report photo storage

* [x] Store public-report photos in Convex File Storage.
* [x] Store an application-private Convex storage ID only; public queries return no photo data.
* [x] Accept JPEG, PNG and WebP only, with a 5 MiB maximum.
* [x] Accept a public generated upload URL for unauthenticated residents in the controlled MVP.
* **Required before:** Phase 5
* **Status:** Approved — [D-02](decisions/D-02_REPORT_PHOTO_STORAGE.md).

### D-03 — Device-offline evaluation

* [x] Use a Convex cron to evaluate offline status.
* [x] Run once per minute with the five-minute default timeout from global settings; evaluate real devices only and persist offline status.
* **Required before:** Phase 4
* **Status:** Approved — [D-03](decisions/D-03_DEVICE_OFFLINE_EVALUATION.md).

### D-04 — Gemini configuration

* [x] Choose the Gemini model used for structured triage.
* [x] Confirm the server-side environment variable name.
* [x] Confirm the response schema and retry behaviour.
* **Required before:** Phase 6
* **Status:** Approved — [D-04](decisions/D-04_GEMINI_CONFIGURATION.md).

### D-05 — WhatsApp test integration

* [ ] Confirm access to a Meta developer application.
* [ ] Confirm access to a WhatsApp Cloud API test number.
* [ ] Confirm webhook verification-token handling.
* [ ] Confirm the outbound message template limitations of the test environment.
* **Required before:** Phase 10
* **Status:** Pending owner decision

---

## 5. Implementation Handoff Log

Update this table after completing each phase.

| Phase    | Status  | Completion date | Handoff summary |
| -------- | ------- | --------------- | --------------- |
| Phase 0  | Complete | 2026-07-15 | Phase 0 established the PRD and implementation checklist as the project’s scope controls. The README now links to both documents, distinguishes real, simulated and future-only capabilities, and records that unresolved product or architecture decisions require owner approval. |
| Phase 1A | Complete | 2026-07-15 | Phase 1A established the project foundation. Convex is installed and connected through a dedicated client provider, generated Convex types are available, shadcn/ui is initialized for Tailwind CSS v4 without UI components, and environment-variable handling is documented safely. No schema, domain logic, seed data, authentication or product UI has been implemented. Phase 1B should begin by defining the Convex schema, indexes, domain status constants and allowed status transitions from the approved PRD. The current shadcn CLI’s Radix Nova style was used with explicit product-owner approval because the originally planned New York style was unavailable. |
| Phase 1B | Complete | 2026-07-15 | Phase 1B defined the complete Convex schema for the approved MVP, including 14 typed tables, required relationships, reusable domain validators, targeted indexes, approved task-status transitions and safe public report-status mapping. Convex types were regenerated successfully. No records, seed logic, queries, mutations, actions, authentication or product UI were added. Phase 1C should create the idempotent Bariga demo dataset and the typed queries and minimal mutations required by the Overview and later operational phases. |
| Phase 1C | Complete | 2026-07-15 | Phase 1C completed the Convex data foundation with an idempotent Bariga demo dataset, protected reset support, typed private operational queries, a restricted public report-tracking query, Overview and map aggregates, notification acknowledgement, validated settings updates and immutable settings-change activity history. The approved reset state contains one fleet-manager user, 10 bins, 10 devices, 30 readings, six reports, five tasks, three simulated trucks, two maintenance alerts, five notifications, 16 activity events and global settings, with no active route. Phase 2 must resolve fleet-manager authentication before exposing private dashboard functions to the browser, then build the dashboard shell and Overview UI. |
| Phase 2  | Complete | 2026-07-15 | Phase 2A implemented the Clerk and Convex authentication foundation: restricted manual demo-account flow, normalized Convex fleet-manager authorization, protected `/dashboard` routes, sign-in/sign-out, and a safe current-user query. Phase 2B built the persistent dashboard shell, reusable dashboard UI primitives, one authenticated real-time `dashboard.getOverviewData` query protected by `requireFleetManager()`, the complete Overview page with a non-interactive OpenStreetMap/Leaflet preview, and protected placeholder pages for every later dashboard section. The correction pass improved authentication failure handling, generic runtime errors, empty states and shared map data loading. Phase 3 should extend the reusable Leaflet map foundation into the full interactive operations map. |
| Phase 3  | Complete | 2026-07-15 | Dedicated protected map query with live Convex subscriptions, an interactive Leaflet map, bins/reports/trucks/depot/route layers, filters and search, live selected-item details, a keyboard-accessible operational list, and read-only active-route rendering. Route re-optimisation remains Phase 9; stop completion remains Phase 10. |
| Phase 4  | Complete | 2026-07-15 | Smart Bins provides a protected live list/detail view, public controlled-MVP hardware ingestion with payload and assignment validation, automatic task rules, real-device offline evaluation, and auditable manual/sensor emptying confirmation. The correction pass preserves awaiting-confirmation state, restores connectivity for delayed readings, rejects conflicting duplicates, safely handles invalid selected-bin URLs, fixes authentication-state ordering, and records sensor-confirmed status history. The final correction resets bin-specific UI state when selection changes, uses structured Convex application errors for hardware-domain failures, and corrects the real-device payload example. The awaiting-confirmation helper is ready, but its invocation from the later Collection Tasks “mark task collected” mutation remains deferred. |
| Phase 5  | Complete | 2026-07-16 | Public unauthenticated reporting stores the resident-selected category, original message, browser coordinates or typed landmark, optional private Convex File Storage photo ID, and a sequential report reference. Submitted and tracking views use public-safe real-time status subscriptions; raw landmarks and coordinates are excluded from public tracking. Structured field-level Convex application errors, safe unexpected-error messaging, a public route error boundary and accessible location/form corrections are complete. New reports remain `status: new` and `aiStatus: pending`; Phase 6 owns Nominatim resolution and Gemini triage. D-04 remains unresolved. |
| Phase 6  | Complete | 2026-07-16 | Asynchronous processing has monotonic attempt versions, stale-result guards, six-minute recovery checks, and a three-attempt limit. Nominatim has an eight-second timeout, caches definitive unusable results, and accepts only in-pilot locations. Gemini uses `timeout_ms: 15000` with SDK retries disabled, makes at most two application-level requests, and does not retry permanent 4xx errors. Fallback preserves successful location resolution. Outside-pilot GPS and unresolved reports are excluded from both operational maps while compatible completed/fallback legacy seeded markers remain visible. No collection tasks, duplicate detection, dashboard, or messaging were added. |
| Phase 7  | Complete | 2026-07-16 | Protected real-time citizen-report list and detail subscriptions, operational classification/location controls, manual task creation and linking, duplicate review, auditable resolution actions, and public-safe status updates are complete. Automatic task creation, task workflows, and task-to-report completion synchronisation remain Phase 8. |
| Phase 8  | Pending | —               | —               |
| Phase 9  | Pending | —               | —               |
| Phase 10 | Pending | —               | —               |
| Phase 11 | Pending | —               | —               |
| Phase 12 | Pending | —               | —               |
| Phase 13 | Pending | —               | —               |

---

# Phase 0 — Project Tracking and Scope Protection

## Documentation

* [x] Add this file as `docs/IMPLEMENTATION_CHECKLIST.md`.
* [x] Link this checklist to the approved PRD.
* [x] Add a short README section pointing contributors to the PRD and checklist.
* [x] Document the rule that the PRD controls product scope.
* [x] Document the rule that unchecked decision items require owner approval.
* [x] Document which capabilities are real.
* [x] Document which capabilities are simulated.
* [x] Document which capabilities are future only.

## Scope restrictions

* [x] Do not implement a native mobile application.
* [x] Do not implement multiple LGAs.
* [x] Do not implement multiple organisations or tenants.
* [x] Do not implement billing or payments.
* [x] Do not implement SMS or email notifications.
* [x] Do not implement advanced workforce scheduling.
* [x] Do not implement live traffic feeds.
* [x] Do not implement live road-condition feeds.
* [x] Do not implement real driver tracking.
* [x] Do not implement real fleet telemetry.
* [x] Do not implement real predictive maintenance.
* [x] Do not implement autonomous dispatch.
* [x] Do not implement production LAWMA integration.
* [x] Do not implement production WhatsApp messaging outside the approved test environment.

## Phase completion

* [x] Scope rules are documented.
* [x] The PRD and checklist are discoverable from the repository.
* [x] The Phase 0 handoff summary is recorded.

---

# Phase 1A — Project and Convex Foundation

## Project dependencies

* [x] Install the Convex client and server dependencies.
* [x] Initialise Convex using the official project structure.
* [x] Preserve the existing Next.js App Router structure.
* [x] Avoid adding dependencies not required by the approved MVP.
* [x] Confirm Tailwind CSS remains functional.
* [x] Prepare the project for shadcn/ui without adding unused components.
* [x] Add only the shared utility dependencies required by installed UI components.

## Convex connection

* [x] Create the Convex backend directory.
* [x] Generate the required Convex client types.
* [x] Add the Convex client provider at the appropriate application boundary.
* [x] Keep the root layout a Server Component where possible.
* [x] Isolate only required providers as Client Components.
* [x] Configure the public Convex URL through environment variables.
* [x] Add an environment example file without secrets.
* [x] Ensure environment secrets are not exposed to browser code.
* [x] Confirm the Next.js application can connect to the Convex development deployment.
* [x] Link the project to the product owner’s Convex account.
* [x] Select an account-backed cloud development deployment for ongoing development.
* [x] Configure the local environment to use the cloud development deployment instead of the temporary `127.0.0.1` deployment.
* [x] Push the approved schema and Convex functions to the cloud development deployment.
* [x] Restore the approved Bariga demo dataset in the cloud development deployment.
* [ ] Configure the Convex production deployment when preparing the Vercel release.

## Project organisation

* [x] Establish `components/providers` for application providers required by the current phase.
* [x] Reserve `components/ui` for shadcn components when the first component is installed; do not add an empty directory.
* [x] Create domain-specific component folders only when their implementation phase begins.
* [x] Create public-app component folders only when the public reporting phase begins.
* [x] Create fleet-dashboard component folders only when the dashboard phase begins.
* [x] Avoid premature abstraction.
* [x] Avoid adding a separate API server.

## Foundation acceptance criteria

* [x] The application starts with the Convex provider configured.
* [x] Convex-generated types are available.
* [x] Environment configuration is documented.
* [x] No secrets are committed.
* [x] Existing application behaviour is not broken.
* [x] Only required dependencies have been introduced.
* [x] Checks for touched files pass.
* [x] The Phase 1A handoff summary is recorded.

---

# Phase 1B — Convex Schema and Domain Rules

## Core tables

* [x] Create the `users` table.
* [x] Create the `devices` table.
* [x] Create the `bins` table.
* [x] Create the `sensorReadings` table.
* [x] Create the `citizenReports` table.
* [x] Create the `whatsappConversations` table.
* [x] Create the `collectionTasks` table.
* [x] Create the `trucks` table.
* [x] Create the `routes` table.
* [x] Create the `routeStops` table.
* [x] Create the `maintenanceAlerts` table.
* [x] Create the `notifications` table.
* [x] Create the `activityEvents` table.
* [x] Create the `settings` table.

## User fields

* [x] Store name.
* [x] Store email.
* [x] Store role.
* [x] Store creation time.

## Device fields

* [x] Store unique device identifier.
* [x] Store assigned bin ID.
* [x] Store device status.
* [x] Store last-seen time.
* [x] Store whether the device is real or simulated.

## Bin fields

* [x] Store display ID.
* [x] Store name.
* [x] Store address.
* [x] Store latitude and longitude.
* [x] Store current fill percentage.
* [x] Store current bin status.
* [x] Store last-reading time.
* [x] Store last-collection time.
* [x] Store linked device ID.
* [x] Store whether the bin is real or simulated.
* [x] Store awaiting-empty-confirmation state where required.

## Sensor-reading fields

* [x] Store device ID.
* [x] Store bin ID.
* [x] Store fill percentage.
* [x] Store device-recorded time.
* [x] Store server-received time.
* [x] Store unusual-reading flag.

## Citizen-report fields

* [x] Store unique public reference number.
* [x] Store report source.
* [x] Preserve the original message.
* [x] Store category.
* [x] Store priority.
* [x] Store operational summary.
* [x] Store landmark text.
* [x] Store latitude and longitude.
* [x] Store optional photo reference.
* [x] Store whether collection is required.
* [x] Store whether clarification is required.
* [x] Store AI-processing status.
* [x] Store report status.
* [x] Store linked task ID.
* [x] Store linked bin ID.
* [x] Store creation and resolution times.
* [x] Store duplicate-candidate relationships without automatic merging.

## WhatsApp-conversation fields

* [x] Store WhatsApp user identifier.
* [x] Store current conversation state.
* [x] Store draft description.
* [x] Store draft landmark.
* [x] Store draft latitude and longitude.
* [x] Store draft photo reference.
* [x] Store last-message time.

## Collection-task fields

* [x] Store display ID.
* [x] Store source type.
* [x] Store source ID.
* [x] Store latitude and longitude.
* [x] Store priority.
* [x] Store reason.
* [x] Store task status.
* [x] Store assigned truck ID.
* [x] Store route ID.
* [x] Store creation and completion times.

## Truck fields

* [x] Store display ID.
* [x] Store driver name.
* [x] Store status.
* [x] Store current latitude and longitude.
* [x] Store assigned route ID.
* [x] Store capacity indicator.
* [x] Store maintenance risk.
* [x] Store mileage since service.
* [x] Store last-service date.
* [x] Store battery status.
* [x] Store engine-health score.
* [x] Mark truck data as simulated.

## Route and route-stop fields

* [x] Store route display ID.
* [x] Store assigned truck ID.
* [x] Store depot coordinates.
* [x] Store route status.
* [x] Store ordered stop IDs.
* [x] Store current stop index.
* [x] Store estimated distance.
* [x] Store estimated duration.
* [x] Store simulated traffic penalty.
* [x] Store simulated road-condition penalty.
* [x] Store created, started and completed times.
* [x] Store route-stop sequence number.
* [x] Store route-stop status.
* [x] Store route-stop arrival and completion times.

## Maintenance, notification and activity fields

* [x] Store maintenance-alert truck ID.
* [x] Store maintenance risk.
* [x] Store reason.
* [x] Store recommendation.
* [x] Store simulated flag.
* [x] Store created and resolved times.
* [x] Store notification type and severity.
* [x] Store notification title and description.
* [x] Store related entity type and ID.
* [x] Store notification read time.
* [x] Store immutable activity-event type and description.
* [x] Store activity related entity type and ID.
* [x] Store activity creation time.

## Settings fields and defaults

* [x] Define the approaching-full threshold field; its 60% default is seeded in Phase 1C.
* [x] Define the collection-required threshold field; its 80% default is seeded in Phase 1C.
* [x] Define the critical threshold field; its 95% default is seeded in Phase 1C.
* [x] Define the empty-confirmation threshold field; its below-30% rule is seeded in Phase 1C.
* [x] Define the device-offline timeout field; its five-minute default is seeded in Phase 1C.
* [x] Define the duplicate-distance field; its 100-metre default is seeded in Phase 1C.
* [x] Define the maximum-route-stops field; its eight-stop default is seeded in Phase 1C.
* [x] Define the depot-coordinate fields.
* [x] Define the simulation-speed field.
* [x] Define the simulated traffic-penalty field.
* [x] Define the simulated road-condition-penalty field.
* [x] Define the hardware-demo-interval field; its 30-second default is seeded in Phase 1C.

## Indexes and query access

* [x] Add indexes for unique device identifiers.
* [x] Add indexes for bin display IDs.
* [x] Add indexes for report references.
* [x] Add indexes for task display IDs.
* [x] Add indexes for truck display IDs.
* [x] Add indexes for route display IDs.
* [x] Add indexes for statuses used by dashboard filters.
* [x] Add indexes for active tasks by source.
* [x] Add indexes for route stops by route and sequence.
* [x] Add indexes for time-ordered readings and activity events.
* [x] Add indexes required for WhatsApp conversation lookup.
* [x] Avoid speculative indexes not used by approved queries.

## Domain constants and transitions

* [x] Define bin statuses.
* [x] Define device statuses.
* [x] Define report categories.
* [x] Define report priorities.
* [x] Define internal report statuses.
* [x] Define public report statuses.
* [x] Define task statuses.
* [x] Define allowed task transitions.
* [x] Define truck statuses.
* [x] Define route statuses.
* [x] Define maintenance-risk levels.
* [x] Define WhatsApp conversation states.
* [x] Implement internal-to-public report-status mapping.
* [x] Completed and cancelled task statuses have no outgoing transitions.

## Phase completion

* [x] All PRD entities are represented.
* [x] Required relationships are represented.
* [x] Required status values are centralised.
* [x] Invalid status transitions can be rejected.
* [x] Schema generation succeeds.
* [x] Checks for touched files pass.
* [x] The Phase 1B handoff summary is recorded.

---

# Phase 1C — Demo Dataset, Core Queries and Mutations

Phase 1C-A handoff — 2026-07-15: The approved Bariga demo dataset is now available through idempotent internal seed and reset mutations. The starting state contains one fleet-manager user, 10 bins, 10 devices, 30 readings, six reports, five tasks, three simulated trucks, two maintenance alerts, five notifications, 16 activity events and global settings. No route exists initially so the primary demonstration can show route generation. Phase 1C-B must add typed core queries, safe public report lookup, overview/map aggregates, notification and settings mutations, and audit-preserving write operations.

## Seed dataset

* [x] Seed exactly 10 smart bins in Bariga.
* [x] Mark one bin as the real hardware-connected bin.
* [x] Mark nine bins as simulated.
* [x] Seed one device for the real hardware bin.
* [x] Seed simulated devices where needed for demo behaviour.
* [x] Seed exactly three simulated trucks.
* [x] Seed Truck 01 as available for the main route.
* [x] Seed Truck 02 with medium maintenance risk.
* [x] Seed Truck 03 as under maintenance with high risk.
* [x] Seed six citizen reports.
* [x] Seed one depot.
* [x] Seed the approved resettable pre-route demo state; no active route exists initially.
* [x] Seed two prototype maintenance alerts.
* [x] Seed one normal truck state.
* [x] Seed one medium-risk truck state.
* [x] Seed one high-risk truck state.
* [x] Seed default settings.
* [x] Seed realistic activity events.
* [x] Seed realistic dashboard notifications.
* [x] Label every simulated record clearly.

## Seed behaviour

* [x] Make the seed operation safe to rerun.
* [x] Prevent accidental duplicate seed records.
* [x] Provide a protected reset operation.
* [x] Ensure reset restores the approved demo starting state.
* [x] Do not expose reset controls in the public app.

## Core queries

* [x] Query current settings.
* [x] Query all bins.
* [x] Query a bin by ID.
* [x] Query bin readings chronologically.
* [x] Query citizen reports.
* [x] Query a report by internal ID.
* [x] Query a report by public reference.
* [x] Query collection tasks.
* [x] Query trucks.
* [x] Query routes.
* [x] Query the active route.
* [x] Query route stops in sequence.
* [x] Query maintenance alerts.
* [x] Query notifications.
* [x] Query recent activity events.
* [x] Query overview summary counts.
* [x] Query map-ready operational data.

## Core mutations

* [x] Update notification read state.
* [x] Update supported settings.
* [x] Reset the demo dataset through a protected operation.
* [x] Add immutable activity events through a shared helper.
* [x] Create dashboard notifications through a shared helper.
* [x] Preserve immutable audit history for settings changes introduced in Phase 1C; later operational lifecycle mutations must record their own status-change events transactionally.

## Overview summary data

* [x] Return total monitored bins.
* [x] Return bins requiring collection.
* [x] Return critical bins.
* [x] Return open citizen reports.
* [x] Return pending collection tasks.
* [x] Return active trucks.
* [x] Return collections completed today.
* [x] Return trucks with maintenance alerts.

## Phase completion

* [x] The complete approved demo dataset can be created.
* [x] Re-running seed does not create duplicate data.
* [x] Core data is available through typed Convex queries.
* [x] Overview counts derive from current Convex data.
* [x] Activity and notification records are queryable.
* [x] Checks for touched files pass.
* [x] The Phase 1C handoff summary is recorded.

---

# Phase 2 — Authentication, Dashboard Shell and Overview

## Decision dependency

* [x] Decision D-01 has been resolved.

## Authentication

* [x] Add fleet-manager authentication using the approved approach.
* [x] Create the approved demo fleet-manager account flow.
* [x] Protect all fleet-dashboard routes.
* [x] Keep public-report routes accessible without authentication.
* [x] Prevent public users from accessing dashboard data.
* [x] Add sign-in and sign-out flows.
* [x] Handle unauthenticated dashboard access safely.

## Dashboard shell

* [x] Create a persistent dashboard layout.
* [x] Add the Overview navigation item.
* [x] Add the Map navigation item.
* [x] Add the Smart Bins navigation item.
* [x] Add the Citizen Reports navigation item.
* [x] Add the Collection Tasks navigation item.
* [x] Add the Routes navigation item.
* [x] Add the Fleet & Maintenance navigation item.
* [x] Add the Settings navigation item.
* [x] Highlight the active navigation item.
* [x] Add a fleet-manager account area.
* [x] Add a visible “Bariga pilot” label.
* [x] Add a visible “Proof of concept” label where appropriate.
* [x] Support desktop and tablet dashboard layouts.
* [x] Keep public-app navigation separate from dashboard navigation.

## Shared UI

* [x] Configure shadcn/ui using the approved project structure.
* [x] Add only components needed by the current phase.
* [x] Create reusable status badges.
* [x] Create reusable priority badges.
* [x] Create reusable real-versus-simulated labels.
* [x] Create reusable page headers.
* [x] Create reusable summary cards.
* [x] Create reusable loading skeletons.
* [x] Create reusable empty-state components.
* [x] Ensure status is not communicated through colour alone.

## Overview page

* [x] Display total monitored bins.
* [x] Display bins requiring collection.
* [x] Display critical bins.
* [x] Display open citizen reports.
* [x] Display pending collection tasks.
* [x] Display active trucks.
* [x] Display collections completed today.
* [x] Display trucks with maintenance alerts.
* [x] Display a small operations map.
* [x] Display critical alerts ordered by severity and time.
* [x] Display recent activity.
* [x] Display collection progress.
* [x] Display active-route summary.
* [x] Display prototype vehicle-health summary.
* [x] Link cards to the relevant filtered dashboard pages.
* [x] Link the map summary to the full map.
* [x] Link active-route summary to the route view.
* [x] Link maintenance summary to Fleet & Maintenance.

## Overview acceptance criteria

* [x] Summary cards use current Convex data.
* [x] Critical alerts are ordered correctly.
* [x] Recent activity updates through Convex subscriptions.
* [x] Overview data updates without a manual refresh.
* [x] Summary-card links open the correct destination.
* [x] Prototype maintenance data is labelled as simulated.
* [x] Loading and empty states are present.
* [x] Checks for touched files pass.
* [x] The Phase 2 handoff summary is recorded.

---

# Phase 3 — Live Operations Map

## Map foundation

* [x] Install Leaflet and required React integration.
* [x] Load the interactive map only in the browser.
* [x] Use OpenStreetMap tiles.
* [x] Display required OpenStreetMap attribution.
* [x] Centre the map on the approved Bariga pilot area.
* [x] Ensure the map does not break server rendering.
* [x] Provide a non-map text alternative for operational items.

## Map data layers

* [x] Display all smart-bin markers.
* [x] Display all citizen-report markers with valid coordinates.
* [x] Display all truck markers.
* [x] Display the depot.
* [x] Display the active-route line.
* [x] Display numbered route stops.
* [x] Update markers through Convex subscriptions.

## Marker states

* [x] Use green for normal bins.
* [x] Use yellow for approaching-full bins.
* [x] Use red for collection-required bins.
* [x] Use dark red with a visible critical treatment for critical bins.
* [x] Use purple for citizen reports.
* [x] Use blue for the active truck.
* [x] Use a distinguishable light-blue treatment for idle trucks.
* [x] Use a recognisable depot marker.
* [x] Include a text label or accessible status alongside colour.

## Marker details

* [x] Show bin ID.

* [x] Show bin address.

* [x] Show bin fill percentage.

* [x] Show bin status.

* [x] Show bin last-reading time.

* [x] Show device status.

* [x] Show active bin task.

* [x] Show last collection time.

* [x] Link to full bin details.

* [x] Show report reference.

* [x] Show report category.

* [x] Show report priority.

* [x] Show report summary.

* [x] Show report source.

* [x] Show report location.

* [x] Show report time.

* [x] Show linked task.

* [x] Link to full report details.

* [x] Show truck ID.

* [x] Show truck status.

* [x] Show assigned route.

* [x] Show current stop.

* [x] Show remaining stops.

* [x] Show maintenance risk.

* [x] Link to full truck details.

## Route panel

* [x] Show assigned truck.
* [x] Show number of stops.
* [x] Show estimated distance.
* [x] Show estimated duration.
* [x] Show current stop.
* [x] Show remaining stops.
* [x] Show completed stops.
* [ ] Provide Re-optimise Route action. **Phase 9 ownership; not implemented in Phase 3.**
* [ ] Provide Mark Stop Completed action. **Phase 10 ownership; not implemented in Phase 3.**
* [ ] Require confirmation before route re-optimisation. **Phase 9 ownership; not implemented in Phase 3.**

## Filters and search

* [x] Add All filter.
* [x] Add Smart Bins filter.
* [x] Add Citizen Reports filter.
* [x] Add Trucks filter.
* [x] Add Critical Only filter.
* [x] Add Active Route Only filter.
* [x] Search by bin ID.
* [x] Search by truck ID.
* [x] Search by report reference.
* [x] Search by landmark.
* [x] Search by address.
* [x] Focus or select the matching map item.

## Map acceptance criteria

* [x] All configured bins appear at stored coordinates.
* [x] Bin marker status updates in real time.
* [x] New geolocated reports appear without refresh.
* [x] Marker selection opens the correct detail panel.
* [x] Active route stops are numbered.
* [x] Completed stops remain visible.
* [x] OpenStreetMap attribution is visible.
* [x] Map loading and empty states are present.
* [x] The configured demo dataset performs smoothly.
* [x] Checks for touched files pass.
* [x] The Phase 3 handoff summary is recorded.

---

# Phase 4 — Smart-Bin Monitoring and Hardware Flow

## Decision dependency

* [x] Decision D-03 has been resolved.

## Smart Bins page

* [x] Display bin ID.
* [x] Display bin name.
* [x] Display address.
* [x] Display fill percentage.
* [x] Display bin status.
* [x] Display device status.
* [x] Display last reading.
* [x] Display active task.
* [x] Display last collection.
* [x] Display real or simulated source.

## Bin filters

* [x] Filter all bins.
* [x] Filter normal bins.
* [x] Filter approaching-full bins.
* [x] Filter collection-required bins.
* [x] Filter critical bins.
* [x] Filter offline devices.
* [x] Filter real hardware.
* [x] Filter simulated bins.

## Bin detail

* [x] Show bin ID.
* [x] Show device ID.
* [x] Show name and location.
* [x] Show coordinates.
* [x] Show current fill percentage.
* [x] Show current status.
* [x] Show device connectivity.
* [x] Show last reading.
* [x] Show fill-level history.
* [x] Show recent readings.
* [x] Show collection history.
* [x] Show active collection task.
* [x] Show related citizen reports.
* [x] Show real or simulated source.

## Bin actions

* [x] Create collection task manually.
* [x] View bin on the map.
* [x] Mark device inactive.
* [x] Manually confirm emptying.
* [x] Edit bin name and location.
* [x] View flagged unusual readings.

## Hardware HTTP action

* [x] Add a Convex HTTP `POST` endpoint.
* [x] Require `deviceId`.
* [x] Require `binId`.
* [x] Require `fillPercentage`.
* [x] Require `recordedAt`.
* [x] Validate fill percentage is between 0 and 100.
* [x] Confirm the device exists.
* [x] Confirm the device is assigned to the submitted bin.
* [x] Store the sensor reading.
* [x] Record received time.
* [x] Update the bin’s current fill percentage.
* [x] Update the bin’s last-reading time.
* [x] Update the device’s last-seen time.
* [x] Mark the device online.
* [x] Recalculate bin status.
* [x] Evaluate automatic task rules.
* [x] Return a successful response after storage.
* [x] Return a validation response for invalid payloads.
* [x] Keep the hardware endpoint intentionally unauthenticated for the controlled MVP and document this limitation.
* [x] Validate payload and device-to-bin assignment.
* [x] Reject simulated and inactive devices.

## Bin status rules

* [x] Calculate 0–59% as Normal.
* [x] Calculate 60–79% as Approaching full.
* [x] Calculate 80–94% as Collection required.
* [x] Calculate 95–100% as Critical.
* [x] Use current settings instead of hardcoded thresholds where required.
* [x] Flag unusual sudden jumps.
* [x] Create a notification when a bin reaches collection threshold.
* [x] Create a notification when a bin becomes critical.
* [x] Create immutable activity events for readings and status changes.

## Device-offline rules

* [x] Mark a device offline after the approved five-minute rule.
* [x] Create an offline notification.
* [x] Create an immutable offline activity event.
* [x] Restore online status after a valid new reading.
* [x] Keep real and simulated device states distinguishable.

## Duplicate-task protection

* [x] Prevent repeated high readings from creating duplicate tasks.
* [x] Allow only one active collection task per bin.
* [x] Preserve new sensor readings even when an active task already exists.

## Emptying confirmation

* [x] A reusable helper moves a linked smart bin into awaiting confirmation.
* [ ] Deferred integration: call that helper from the later Collection Tasks “mark task collected” mutation.
* [x] Confirm emptying after a reading below 30%.
* [x] Return the bin to Normal after confirmation.
* [x] Record the confirmed collection time.
* [x] Support manual emptying confirmation.
* [x] Record emptying and status transitions in history.

## Smart-bin acceptance criteria

* [x] One real device can send valid readings.
* [x] A reading updates the correct bin.
* [x] Status changes according to thresholds.
* [x] Real-time dashboard and map updates occur.
* [x] A qualifying bin creates only one active task.
* [x] Invalid readings are rejected.
* [x] Offline state follows the approved rule.
* [x] Reading history is chronological.
* [x] Manual confirmation is auditable.
* [x] Checks for touched files pass.
* [x] The Phase 4 handoff summary is recorded.

---

# Phase 5 — Public Web Reporting and Report Tracking

## Decision dependency

* [x] Decision D-02 has been resolved. See [D-02](decisions/D-02_REPORT_PHOTO_STORAGE.md).

## Public-app structure

* [x] Create Submit Report page.
* [x] Create Report Submitted page.
* [x] Create Track Report page.
* [x] Keep the public app separate from the protected dashboard.
* [x] Design the public app mobile first.
* [x] Prevent public routes from loading private dashboard data.

## Submit Report page

* [x] Add problem-category field.
* [x] Add description field.
* [x] Add location-method selection.
* [x] Add browser-location option.
* [x] Add typed-landmark option.
* [x] Add one optional photo.
* [x] Add submit action.
* [x] Support Overflowing waste point.
* [x] Support Illegal dumpsite.
* [x] Support Missed collection.
* [x] Support Drainage blockage caused by waste.
* [x] Support Other waste issue.

## Submission validation

* [x] Require description.
* [x] Require at least one location method.
* [x] Validate supplied coordinates.
* [x] Limit upload to one photo.
* [x] Validate accepted image types.
* [x] Validate approved image size.
* [x] Associate readable structured application errors with their fields; unexpected errors use a safe form-level message.
* [x] Handle denied browser-location permission.
* [x] Preserve entered data after recoverable errors.

## Submission processing

* [x] Store the original report before Phase 6 AI processing.
* [x] Generate a unique report reference.
* [x] Store submission source as web.
* [x] Store submitted time.
* [x] Store browser coordinates or the exact typed landmark for Phase 6 resolution.
* [x] Store the private Convex File Storage ID where provided.
* [x] Store location inputs for Phase 6 resolution; do not call Nominatim.
* [x] Store the report with AI processing pending for Phase 6; do not call Gemini.
* [x] Return the submitted state without exposing internal processing details.

## Report Submitted page

* [x] Display success state.
* [x] Display report reference.
* [x] Display submitted time.
* [x] Display current public status.
* [x] Allow the resident to copy the reference.
* [x] Link to Track Report.
* [x] Avoid exposing private dashboard data.

## Track Report page

* [x] Accept a report reference.
* [x] Display report category.
* [x] Display a generic public-safe location summary only; never return raw coordinates or typed landmarks.
* [x] Display current public status.
* [x] Display submitted time.
* [x] Display last status update.
* [x] Show a clear not-found state.
* [x] Never show internal AI reasoning.
* [x] Never show internal fleet data.
* [x] Never show private contact data.

## Public status mapping

* [x] Map New to Received.
* [x] Map Needs clarification to More information required.
* [x] Map Under review to Under review.
* [x] Map Task created to Scheduled for collection.
* [x] Map Scheduled to Scheduled for collection.
* [x] Map In progress to In progress.
* [x] Map Resolved to Resolved.
* [x] Map Duplicate to Under review.
* [x] Map Rejected to Under review.

## Public-app acceptance criteria

* [x] Public web reporting works on mobile.
* [x] Original reports are stored before Phase 6 AI processing.
* [x] Each submitted report receives one unique reference.
* [x] Public tracking reflects current report status.
* [x] Invalid references show a safe not-found state.
* [x] Photos are not publicly browsable by default.
* [x] Raw submitted locations are private; tracking uses generic summaries only.
* [x] Loading and realistic error states are implemented, including a safe public route error boundary.
* [x] Checks for touched files pass.
* [x] The Phase 5 handoff summary is recorded.

---

# Phase 6 — Location Resolution and AI-Assisted Triage

## Decision D-04

* [x] Gemini model, server-side environment variable, structured schema, retries, and fallback are approved in D-04.

## Location priority

* [x] Browser GPS is preferred, validated against the Bariga pilot, and never reverse geocoded.
* [x] Clear typed landmarks use Nominatim; vague locations require clarification without invented coordinates.

## Nominatim geocoding

* [x] Searches use Lagos/Nigeria context, a clear User-Agent, cache, cross-action throttling, and OpenStreetMap attribution.
* [x] Original landmarks remain stored separately from resolved coordinates and display names.
* [x] Empty and definitive unusable results are cached; temporary provider failures are not.

## Vague and failed locations

* [x] Bariga, Lagos, around my area, near the road, and bus stop alone are rejected deterministically.
* [x] Failed and outside-pilot locations require clarification while preserving submitted location data.

## Gemini triage

* [x] Server-only Gemini receives contact-redacted, minimal report input and validated structured output.
* [x] All supported categories and priorities are stored as operational recommendations without replacing the original message.

## Rules fallback and AI guardrails

* [x] Deterministic category, priority, collection, and clarification rules apply after Gemini failure.
* [x] AI does not approve vague locations, create tasks, merge reports, or expose internal details publicly.

## Recovery and stale-attempt safety

* [x] Processing attempts are versioned.
* [x] Stale actions cannot overwrite newer results.
* [x] Interrupted processing receives scheduled recovery.
* [x] Processing stops after three attempts.
* [x] Nominatim requests have an eight-second timeout.
* [x] Gemini requests use the correct 15-second SDK timeout.
* [x] Gemini SDK internal retries are disabled.
* [x] The application makes at most two Gemini requests per processing attempt.
* [x] Permanent Gemini 4xx errors are not retried.
* [x] AI failure preserves successful location resolution.
* [x] Outside-pilot GPS requires clarification.
* [x] All operational map views exclude unresolved reports.
* [x] The Overview map preserves valid legacy seeded report markers.
* [x] Definitive unusable geocoding results are cached.

## Phase acceptance criteria

* [x] New reports are processed asynchronously with public-safe real-time status updates.
* [x] No collection task is created, and reset clears geocoding cache and throttle records.
* [x] Targeted code generation and lint checks pass.
* [x] The corrected Phase 6 handoff summary is recorded.

---

# Phase 7 — Citizen Reports Dashboard

## Reports table

* [x] Display reference number.
* [x] Display category.
* [x] Display priority.
* [x] Display location.
* [x] Display source.
* [x] Display submission time.
* [x] Display status.
* [x] Display AI status.
* [x] Display linked task.

## Report filters

* [x] Filter all reports.
* [x] Filter new reports.
* [x] Filter reports needing clarification.
* [x] Filter reports under review.
* [x] Filter scheduled reports.
* [x] Filter reports in progress.
* [x] Filter resolved reports.
* [x] Filter duplicates.
* [x] Filter by priority.
* [x] Filter by category.
* [x] Filter by source.

## Report detail

* [x] Show reference number.
* [x] Preserve and show original message.
* [x] Show optional photo through authorised access.
* [x] Show submitted location pin.
* [x] Show typed landmark.
* [x] Show resolved coordinates.
* [x] Show AI-generated summary.
* [x] Show AI category.
* [x] Show AI priority.
* [x] Show AI collection recommendation.
* [x] Show AI-processing status.
* [x] Show related nearby reports.
* [x] Show linked bin.
* [x] Show linked collection task.
* [x] Show status history.
* [x] Show submission source.
* [x] Show submission time.
* [x] Show resolution time.

## Fleet-manager actions

* [x] Confirm AI classification.
* [x] Change category.
* [x] Change priority.
* [x] Change resolved coordinates.
* [x] Request more information.
* [x] Create a collection task.
* [x] Link report to an existing task.
* [x] Mark report as duplicate.
* [x] Reject irrelevant reports.
* [x] Mark report resolved.
* [x] Record every status-changing action in activity history.

## Duplicate suggestions

* [x] Identify nearby unresolved reports.
* [x] Use the configured duplicate-distance threshold.
* [x] Display possible duplicate candidates.
* [x] Do not merge automatically.
* [x] Require fleet-manager review.
* [x] Preserve each original report.

## Reports acceptance criteria

* [x] AI-derived values are editable.
* [x] Original messages remain unchanged.
* [x] Reports without clear locations cannot create tasks automatically.
* [x] Duplicate suggestions do not automatically merge records.
* [x] Manual report resolution works, and linked task information is ready for Phase 8 task-to-report synchronisation.
* [x] Status changes appear in the public tracker.
* [x] Report changes update without page refresh.
* [x] Loading and empty states are present.
* [x] Checks for touched files pass.
* [x] The Phase 7 handoff summary is recorded.

---

# Phase 8 — Collection Tasks and Automatic Scheduling Rules

## Automatic creation rules

* [ ] Create a task when a smart bin reaches 80% or the configured threshold.
* [ ] Create a task for a High report that requires collection and has valid coordinates.
* [ ] Create a task for a Critical report that requires collection and has valid coordinates.
* [ ] Create task and activity records atomically where required.

## Do-not-create rules

* [ ] Do not create a task when location is unclear.
* [ ] Do not create a task when coordinates are missing.
* [ ] Do not automatically create a task for Low reports.
* [ ] Do not automatically create a task for Medium reports.
* [ ] Do not automatically create an illegal-dumpsite task requiring investigation.
* [ ] Do not create a task when a matching active task already exists.
* [ ] Do not create a task for a duplicate report.
* [ ] Do not create a task for a rejected report.

## Duplicate prevention

* [ ] Check for an existing active task for the same bin.
* [ ] Check for an active task within the configured radius.
* [ ] Consider task category similarity.
* [ ] Consider unresolved task status.
* [ ] Link possible duplicates for fleet-manager review.
* [ ] Do not automatically merge reports or tasks.
* [ ] Do not create a second task until a possible match is reviewed.

## Task statuses

* [ ] Support Pending.
* [ ] Support Scheduled.
* [ ] Support Assigned.
* [ ] Support En route.
* [ ] Support Collected.
* [ ] Support Unable to complete.
* [ ] Support Cancelled.
* [ ] Enforce Pending → Scheduled.
* [ ] Enforce Scheduled → Assigned.
* [ ] Enforce Assigned → En route.
* [ ] Enforce En route → Collected.
* [ ] Allow approved active statuses → Unable to complete.
* [ ] Allow Pending or Scheduled → Cancelled.
* [ ] Keep completed and cancelled tasks immutable except approved notes.

## Collection Tasks page

* [ ] Display task ID.
* [ ] Display source.
* [ ] Display location.
* [ ] Display coordinates.
* [ ] Display priority.
* [ ] Display reason.
* [ ] Display status.
* [ ] Display assigned truck.
* [ ] Display route.
* [ ] Display creation time.
* [ ] Display completion time.

## Task filters

* [ ] Filter pending tasks.
* [ ] Filter scheduled tasks.
* [ ] Filter assigned tasks.
* [ ] Filter en-route tasks.
* [ ] Filter collected tasks.
* [ ] Filter unable-to-complete tasks.
* [ ] Filter cancelled tasks.
* [ ] Filter by priority.
* [ ] Filter by source.

## Task detail and actions

* [ ] Show source reference.
* [ ] Show related bin or report details.
* [ ] Show coordinates.
* [ ] Show active route.
* [ ] Show assigned truck.
* [ ] Show status history.
* [ ] Show scheduled and completion times.
* [ ] Show related citizen reports.
* [ ] Allow priority editing.
* [ ] Allow assignment to a route.
* [ ] Allow removal from an unstarted route.
* [ ] Allow unable-to-complete status.
* [ ] Allow permitted cancellation.
* [ ] Allow collected status.
* [ ] Link to map location.

## Linked-record behaviour

* [ ] Updating a task updates its linked bin where required.
* [ ] Updating a task updates its linked report where required.
* [ ] Completing a report task resolves the report.
* [ ] Smart-bin completion waits for sensor or manual confirmation.
* [ ] Preserve status history.
* [ ] Create activity events for task changes.
* [ ] Create a notification when a task becomes unable to complete.

## Tasks acceptance criteria

* [ ] Only pending tasks can be selected for a new route.
* [ ] A task belongs to no more than one active route.
* [ ] Cancelled tasks do not appear in route generation.
* [ ] Automatic task creation follows approved rules.
* [ ] Duplicate task prevention works.
* [ ] Linked report and bin states remain consistent.
* [ ] Checks for touched files pass.
* [ ] The Phase 8 handoff summary is recorded.

---

# Phase 9 — Route Generation and Active-Route Operations

## Route validation

* [ ] Require one available truck.
* [ ] Reject trucks under maintenance.
* [ ] Require at least one task.
* [ ] Allow a maximum of eight tasks.
* [ ] Require all selected tasks to be pending.
* [ ] Require all selected tasks to have coordinates.
* [ ] Prevent tasks already belonging to an active route.
* [ ] Allow one truck per route.

## Route algorithm

* [ ] Start from the configured depot.
* [ ] Select Critical tasks first.
* [ ] Select the nearest eligible Critical task.
* [ ] Continue until all selected Critical tasks are placed.
* [ ] Order High tasks using nearest-neighbour distance.
* [ ] Add lower-priority tasks only when manually selected.
* [ ] Apply simulated traffic penalty.
* [ ] Apply simulated road-condition penalty.
* [ ] Return an ordered stop list.
* [ ] Calculate geographic distance between coordinates.
* [ ] Calculate an estimated duration appropriate for the demo.
* [ ] Keep the algorithm deterministic for identical inputs where practical.

## Route builder

* [ ] Allow selection of one available truck.
* [ ] Allow selection of pending tasks.
* [ ] Enforce the eight-stop maximum.
* [ ] Prioritise Critical tasks in the proposal.
* [ ] Display route ID.
* [ ] Display assigned truck.
* [ ] Display depot.
* [ ] Display ordered stops.
* [ ] Display number of stops.
* [ ] Display estimated straight-line distance.
* [ ] Display estimated duration.
* [ ] Display priority composition.
* [ ] Display simulated traffic penalty.
* [ ] Display simulated road-condition penalty.

## Route actions

* [ ] Generate proposed route.
* [ ] Review proposed order before assignment.
* [ ] Remove a proposed stop.
* [ ] Move a proposed stop manually.
* [ ] Assign route.
* [ ] Start route.
* [ ] Re-optimise route.
* [ ] Cancel eligible route.
* [ ] Complete route.
* [ ] Preserve completed route history.

## Active route

* [ ] Display route line.
* [ ] Display numbered stops.
* [ ] Display current truck location.
* [ ] Display current stop.
* [ ] Display next stop.
* [ ] Display completed stops.
* [ ] Display remaining stops.
* [ ] Display progress percentage.
* [ ] Display estimated remaining distance.
* [ ] Display estimated remaining duration.

## Re-optimisation

* [ ] Notify the manager when a new urgent task arrives.
* [ ] Indicate whether the task is near the active route.
* [ ] Require the manager to initiate re-optimisation.
* [ ] Display the proposed new order.
* [ ] Require explicit confirmation.
* [ ] Preserve completed stops.
* [ ] Reorder only remaining stops.
* [ ] Do not change an active route automatically.

## Product wording

* [ ] Describe the feature as “AI-assisted route optimisation using urgency, fill level, distance and simulated traffic and road-condition penalties.”
* [ ] Do not claim live Lagos traffic data.
* [ ] Clearly label traffic penalties as simulated.
* [ ] Clearly label road-condition penalties as simulated.

## Route acceptance criteria

* [ ] A route has one truck.
* [ ] A route has no more than eight stops.
* [ ] Critical tasks are prioritised.
* [ ] Active routes do not change automatically.
* [ ] Re-optimisation requires confirmation.
* [ ] Completed stops remain visible.
* [ ] One active route supports the primary demo.
* [ ] Route generation completes quickly for eight stops.
* [ ] Checks for touched files pass.
* [ ] The Phase 9 handoff summary is recorded.

---

# Phase 10 — Truck Simulation, Fleet and Maintenance

## Truck simulation

* [ ] Start Truck 01 movement when its route starts.
* [ ] Move the truck between route stops.
* [ ] Update location at the configured interval.
* [ ] Update route progress.
* [ ] Update current stop.
* [ ] Preserve completed stops.
* [ ] Allow simulation pause.
* [ ] Allow simulation resume.
* [ ] Allow manual advancement to the next stop.
* [ ] Allow manual stop completion.
* [ ] Do not use real driver-phone location.

## Collection progress

* [ ] Display current stop.
* [ ] Display next stop.
* [ ] Display completed stops.
* [ ] Display remaining stops.
* [ ] Display progress percentage.
* [ ] Display estimated remaining duration.
* [ ] Update map truck position through Convex subscriptions.

## Fleet table

* [ ] Display truck ID.
* [ ] Display driver name.
* [ ] Display status.
* [ ] Display current location.
* [ ] Display assigned route.
* [ ] Display remaining stops.
* [ ] Display capacity indicator.
* [ ] Display maintenance risk.
* [ ] Display last-service date.

## Truck statuses

* [ ] Support Available.
* [ ] Support Assigned.
* [ ] Support On route.
* [ ] Support At collection point.
* [ ] Support Returning.
* [ ] Support Maintenance.
* [ ] Support Offline.

## Truck detail

* [ ] Show truck ID.
* [ ] Show driver.
* [ ] Show current status.
* [ ] Show current route.
* [ ] Show simulated location.
* [ ] Show collection history.
* [ ] Show mileage since service.
* [ ] Show last-service date.
* [ ] Show battery status.
* [ ] Show engine-health score.
* [ ] Show maintenance risk.
* [ ] Show maintenance alerts.

## Prototype maintenance

* [ ] Seed one normal truck.
* [ ] Seed one medium-risk truck.
* [ ] Seed one high-risk truck.
* [ ] Keep the high-risk truck in Maintenance status.
* [ ] Prevent maintenance trucks from route assignment.
* [ ] Generate the approved medium-risk example alert.
* [ ] Generate the approved high-risk example alert.
* [ ] Display maintenance risk in table and detail views.
* [ ] Display “Prototype Vehicle Health Monitoring — based on simulated data.”
* [ ] Label every maintenance input as simulated.
* [ ] Do not claim real predictive diagnostics.
* [ ] Create a notification when maintenance risk becomes high.
* [ ] Create immutable maintenance activity events.

## Fleet acceptance criteria

* [ ] Truck movement updates route progress.
* [ ] Truck location updates on the map.
* [ ] Completed stops remain visible.
* [ ] Simulation can be paused.
* [ ] Maintenance trucks cannot be assigned.
* [ ] Normal, Medium and High risk are visible.
* [ ] Simulated data is clearly labelled.
* [ ] Checks for touched files pass.
* [ ] The Phase 10 handoff summary is recorded.

---

# Phase 11 — WhatsApp Citizen Reporting

## Decision dependency

* [ ] Decision D-05 has been resolved.

## Meta webhook

* [ ] Add webhook verification.
* [ ] Receive text-message events.
* [ ] Receive shared-location events.
* [ ] Receive one optional photo.
* [ ] Validate the expected webhook source.
* [ ] Keep Meta credentials server side.
* [ ] Store incoming message events needed for the demo.
* [ ] Handle unsupported messages with a clear response.

## Guided conversation

* [ ] Support Awaiting description.
* [ ] Support Awaiting location.
* [ ] Support Awaiting optional photo.
* [ ] Support Ready to submit.
* [ ] Support Submitted.
* [ ] Support Awaiting clarification.
* [ ] Preserve state per WhatsApp user.
* [ ] Ask for a problem description.
* [ ] Ask for a location pin or landmark.
* [ ] Ask for an optional photo or `SKIP`.
* [ ] Skip unnecessary questions when the first message contains clear information.
* [ ] Do not create a report until location information exists.
* [ ] Store draft conversation data between messages.

## WhatsApp report creation

* [ ] Preserve the original resident message.
* [ ] Store source as WhatsApp.
* [ ] Store shared coordinates when supplied.
* [ ] Store landmark when supplied.
* [ ] Store one optional photo through approved private storage.
* [ ] Run location resolution.
* [ ] Run AI-assisted triage.
* [ ] Apply fallback classification when required.
* [ ] Generate one reference per report.
* [ ] Create qualifying collection tasks.
* [ ] Display the report on the dashboard and map.

## Outbound messages

* [ ] Send acknowledgement after report creation.
* [ ] Include report reference.
* [ ] Include public status Received.
* [ ] Send clarification request for unclear locations.
* [ ] Send resolution message when the linked report resolves.
* [ ] Avoid exposing internal fleet or AI information.

## WhatsApp acceptance criteria

* [ ] Webhook verification works.
* [ ] Meta test messages reach Convex.
* [ ] Conversation state persists per user.
* [ ] Shared coordinates are stored correctly.
* [ ] Landmark-based reports can be resolved.
* [ ] A report is not created without location information.
* [ ] One report reference is generated per submission.
* [ ] Acknowledgement messages work.
* [ ] Resolution messages work.
* [ ] Processing failures produce realistic responses.
* [ ] Checks for touched files pass.
* [ ] The Phase 11 handoff summary is recorded.

---

# Phase 12 — Settings, Notifications, Activity and Demo Controls

## Settings page

* [ ] Display approaching-full threshold.
* [ ] Display collection-required threshold.
* [ ] Display critical threshold.
* [ ] Display empty-confirmation threshold.
* [ ] Display device-offline timeout.
* [ ] Display duplicate-distance threshold.
* [ ] Display maximum route stops.
* [ ] Display depot coordinates.
* [ ] Display simulation speed.
* [ ] Display simulated traffic penalty.
* [ ] Display simulated road-condition penalty.
* [ ] Restrict settings changes to fleet managers.
* [ ] Store settings changes in Convex.
* [ ] Apply changes to future status calculations.
* [ ] Do not rewrite completed historical records.

## Notifications

* [ ] Notify when a bin becomes critical.
* [ ] Notify when a bin reaches collection threshold.
* [ ] Notify for new Critical citizen reports.
* [ ] Notify for new High citizen reports.
* [ ] Notify when a device goes offline.
* [ ] Notify when a route may require re-optimisation.
* [ ] Notify when maintenance risk becomes High.
* [ ] Notify when a task cannot be completed.
* [ ] Keep Critical notifications unread until acknowledged.
* [ ] Support marking eligible notifications as read.
* [ ] Do not send email or SMS.

## Activity feed

* [ ] Record sensor-reading events.
* [ ] Record task creation.
* [ ] Record report submission.
* [ ] Record report classification.
* [ ] Record route creation.
* [ ] Record route assignment.
* [ ] Record stop completion.
* [ ] Record report resolution.
* [ ] Record device-offline events.
* [ ] Record maintenance alerts.
* [ ] Keep activity events immutable.
* [ ] Order activity events by time.

## Demo controls

* [ ] Add a protected reset-demo-data control.
* [ ] Add a protected simulate-bin-fill control.
* [ ] Add a protected create-critical-report control.
* [ ] Add a protected start-truck-movement control.
* [ ] Add a protected pause-truck-movement control.
* [ ] Add a protected advance-to-next-stop control.
* [ ] Add a protected trigger-maintenance-alert control.
* [ ] Add a protected reset-active-route control.
* [ ] Keep all demo controls out of the public app.
* [ ] Clearly label demo controls as simulation tools.

## Phase acceptance criteria

* [ ] Settings changes persist.
* [ ] Future calculations use updated settings.
* [ ] Historical completed records remain unchanged.
* [ ] Notifications are created by approved events.
* [ ] Activity events are immutable.
* [ ] Demo controls restore or advance the approved scenario safely.
* [ ] Public users cannot access demo controls.
* [ ] Checks for touched files pass.
* [ ] The Phase 12 handoff summary is recorded.

---

# Phase 13 — Cross-Cutting Quality and End-to-End Integration

## Loading states

* [ ] Dashboard data has a loading state.
* [ ] Map markers have a loading state.
* [ ] Geocoding has a progress state.
* [ ] AI classification has a progress state.
* [ ] Route generation has a progress state.
* [ ] Report submission has a progress state.
* [ ] Image upload has a progress state.

## Empty states

* [ ] No critical bins state.
* [ ] No reports state.
* [ ] No pending tasks state.
* [ ] No active route state.
* [ ] No notifications state.
* [ ] No reading history state.
* [ ] No maintenance alerts state.

## Realistic error states

* [ ] Report submission failed.
* [ ] Location permission denied.
* [ ] Landmark could not be found.
* [ ] AI triage unavailable.
* [ ] Route could not be generated.
* [ ] WhatsApp message could not be processed.
* [ ] Sensor payload invalid.
* [ ] Photo upload failed.
* [ ] Reports remain stored when AI processing fails.
* [ ] Impossible scenarios are not given unnecessary error handling.

## Security and privacy

* [ ] Fleet dashboard requires authentication.
* [ ] Residents cannot access dashboard data.
* [ ] Phone numbers are never sent to Gemini.
* [ ] Only required report text is sent to Gemini.
* [ ] Public tracking exposes only safe status data.
* [ ] The hardware endpoint is intentionally unauthenticated for the controlled MVP; its limitation and payload/device-assignment validation are documented.
* [ ] WhatsApp webhook validates its expected source.
* [ ] Uploaded photos are not publicly browsable.
* [ ] Environment secrets are not exposed to the browser.
* [ ] Simulated data is visibly labelled.
* [ ] Activity and status changes are auditable.

## Accessibility

* [ ] Dashboard supports desktop and tablet.
* [ ] Public app is mobile first.
* [ ] Status is not communicated by colour alone.
* [ ] Buttons have visible or accessible labels.
* [ ] Form fields have visible labels.
* [ ] Map entities have associated text alternatives.
* [ ] Non-map controls support keyboard navigation.
* [ ] Dialogs and drawers manage focus correctly.
* [ ] Form errors are associated with their fields.
* [ ] Interactive controls have clear focus states.

## Performance

* [ ] Initial dashboard loads within a reasonable demo timeframe.
* [ ] Real-time sensor changes appear within seconds.
* [ ] Route generation is fast for eight stops.
* [ ] Map handles 10 bins, six reports, three trucks and the active route smoothly.
* [ ] Repeated geocoding requests use cached results.
* [ ] Avoid unnecessary client components.
* [ ] Avoid loading dashboard-only code in the public app.
* [ ] Avoid loading map code on pages that do not use it.

## Product language

* [ ] Use “Smart Waste Management Platform.”
* [ ] Use “AI-assisted report triage.”
* [ ] Use “Demand-based collection scheduling.”
* [ ] Use “AI-assisted route optimisation.”
* [ ] Use “Prototype Vehicle Health Monitoring.”
* [ ] Use “Simulated traffic and road-condition penalties.”
* [ ] Use “Proof of concept.”
* [ ] Use “Bariga pilot.”
* [ ] Do not claim live Lagos traffic intelligence.
* [ ] Do not claim real predictive maintenance.
* [ ] Do not claim production LAWMA integration.
* [ ] Do not claim city-wide deployment.
* [ ] Do not claim fully autonomous dispatch.
* [ ] Do not claim real vehicle telemetry.

---

# Final End-to-End Demo Checklist

## Demo starting state

* [ ] The operations map shows 10 bins.
* [ ] The operations map shows three trucks.
* [ ] The operations map shows citizen reports.
* [ ] The operations map shows one depot.
* [ ] The real hardware bin begins at 45%.
* [ ] The real hardware bin appears Normal.
* [ ] Truck 01 is available.
* [ ] Truck 02 has Medium maintenance risk.
* [ ] Truck 03 has High maintenance risk and is unavailable.

## Smart-bin scenario

* [ ] The real device sends an 87% reading.
* [ ] Convex validates and stores the reading.
* [ ] The correct bin updates immediately.
* [ ] The bin changes to Collection required.
* [ ] The marker changes to the correct visual state.
* [ ] One High-priority collection task is created.
* [ ] Repeated readings do not create duplicate tasks.

## WhatsApp scenario

* [ ] A resident sends an overflowing-waste report.
* [ ] The bot requests or accepts location information.
* [ ] Bariga Market is resolved to coordinates.
* [ ] Gemini classifies the report as overflowing waste.
* [ ] Gemini assigns High priority.
* [ ] Gemini recommends collection.
* [ ] The report appears on the map.
* [ ] One collection task is created.
* [ ] The resident receives a reference number.

## Route scenario

* [ ] The manager opens pending tasks.
* [ ] The manager selects Truck 01.
* [ ] The route contains the real smart bin.
* [ ] The route contains the WhatsApp report.
* [ ] The route contains two simulated full bins.
* [ ] The proposed route displays ordered stops.
* [ ] The manager assigns the route.
* [ ] The manager starts the route.
* [ ] Truck movement begins.
* [ ] Route progress updates.
* [ ] The manager completes stops.
* [ ] Completed stops remain visible.
* [ ] Tasks update as stops are completed.

## Resolution scenario

* [ ] The report-linked task becomes Collected.
* [ ] The citizen report becomes Resolved.
* [ ] The public tracker displays Resolved.
* [ ] The resident receives a WhatsApp resolution message.
* [ ] The smart-bin task waits for sensor or manual emptying confirmation.
* [ ] A reading below 30% confirms the bin is empty.
* [ ] The bin returns to Normal.

## Maintenance scenario

* [ ] The fleet page shows one Medium-risk alert.
* [ ] The fleet page shows one High-risk alert.
* [ ] Both alerts are clearly labelled as simulated.
* [ ] Truck 03 cannot be assigned to a route.

---

# Overall MVP Acceptance Criteria

The MVP is complete only when every item below is checked.

* [ ] One real device can send valid fill-level data.
* [ ] A reading updates the correct bin.
* [ ] Bin status changes according to thresholds.
* [ ] A qualifying bin creates one active collection task.
* [ ] Meta WhatsApp test messages reach the system.
* [ ] Guided WhatsApp reporting works.
* [ ] Shared coordinates appear correctly on the map.
* [ ] A typed landmark can be geocoded.
* [ ] Vague locations trigger clarification.
* [ ] Public web reporting works.
* [ ] Gemini returns structured triage.
* [ ] Rules-based fallback works when Gemini is unavailable.
* [ ] High and Critical qualifying reports create tasks.
* [ ] Duplicate task prevention works.
* [ ] Dashboard data updates in real time.
* [ ] The map displays bins, reports, trucks, depot and active route.
* [ ] One route can be generated with up to eight stops.
* [ ] Route re-optimisation requires manager approval.
* [ ] Simulated truck movement updates route progress.
* [ ] Smart-bin task completion waits for sensor or manual confirmation.
* [ ] Completing a report task resolves the report.
* [ ] The public tracker displays current report status.
* [ ] WhatsApp acknowledgement messages work.
* [ ] WhatsApp resolution messages work.
* [ ] Prototype maintenance alerts are visible.
* [ ] Prototype maintenance alerts are labelled as simulated.
* [ ] All software services remain within the approved ₦0 MVP approach.
* [ ] Every implemented feature supports the approved operational chain.
* [ ] No future-only capability has been presented as part of the MVP.

---

# Final Completion Record

* **Implementation completed:** —
* **Final checklist reviewed by:** —
* **PRD deviations:** None / —
* **Outstanding limitations:** —
* **Demo deployment:** —
* **Final handoff summary:** —
