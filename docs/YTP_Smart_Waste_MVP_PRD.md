# Product Requirements Document (PRD)

## YTP Smart Waste Management MVP

**Document status:** Approved  
**Product type:** Software MVP / proof of concept  
**Primary user:** LAWMA fleet manager  
**Secondary user:** Lagos resident  
**Pilot location:** Bariga, Lagos  
**Frontend:** Next.js with TypeScript  
**Backend and database:** Convex  
**Map:** Leaflet with OpenStreetMap tiles  
**Geocoding:** OpenStreetMap Nominatim  
**AI triage:** Google Gemini free tier, with a rules-based fallback  
**WhatsApp integration:** Meta WhatsApp Cloud API test number  
**Hosting:** Vercel Hobby  
**Cost target:** ₦0 for software services  

---

## 1. Product Summary

The product is a smart waste-management platform that combines:

1. IoT smart-bin fill-level monitoring.
2. Citizen waste reporting through WhatsApp and a lightweight web app.
3. AI-assisted report classification and prioritisation.
4. Demand-based collection-task creation.
5. Priority-and-distance route optimisation.
6. A real-time operations dashboard for fleet managers.
7. Simulated truck movement and vehicle-maintenance alerts.

The MVP must demonstrate one complete operational loop:

```text
Detect a waste problem
→ locate it
→ prioritise it
→ create a collection task
→ add it to a route
→ track collection progress
→ resolve the issue
```

The MVP is a controlled proof of concept for Bariga. It is not a production-ready LAWMA deployment.

---

## 2. Problem Statement

Waste collection is often performed using fixed schedules rather than actual demand. This can result in:

- Overflowing bins remaining unattended.
- Trucks visiting bins that are not yet full.
- Missed collections.
- Delayed response to illegal dumpsites.
- Poor visibility into collection progress.
- Inefficient route planning.
- Limited citizen participation in reporting waste problems.

The MVP will show how real-time bin readings and citizen reports can be combined into one operational system.

---

## 3. Product Goals

The MVP must:

- Receive fill-level readings from a real smart-bin device.
- Display bin status changes on a live map.
- Allow residents to submit reports through WhatsApp.
- Allow residents to submit reports through a public mobile-friendly web form.
- Convert shared locations or landmarks into map coordinates.
- Use AI to classify and prioritise reports.
- Automatically create collection tasks from qualifying sensor readings and reports.
- Generate a recommended route for one active truck.
- Allow a fleet manager to monitor and complete collection tasks.
- Show simulated truck location and progress.
- Show clearly labelled prototype maintenance alerts.
- Operate using only free software services.

---

## 4. Non-Goals

The MVP will not include:

- A production-grade city-wide deployment.
- Real integration with LAWMA internal systems.
- Real traffic feeds.
- Real road-condition feeds.
- Real vehicle telematics.
- Real predictive-maintenance models.
- Real driver phone tracking.
- A native mobile application.
- Multi-LGA administration.
- Multiple organisations or tenants.
- Billing or payments.
- SMS or email notifications.
- Advanced workforce scheduling.
- Automated route changes without manager approval.
- Production WhatsApp messaging outside the test environment.

---

## 5. Real vs Simulated Capabilities

### 5.1 Real capabilities

- One physical smart-bin prototype.
- Hardware-to-Convex webhook.
- Live bin fill-level updates.

The physical smart-bin webhook is intentionally unauthenticated for the controlled proof-of-concept demonstration. Production device authentication is outside the MVP scope.
- Convex database and real-time subscriptions.
- WhatsApp citizen reporting using Meta's test number.
- Public web reporting form.
- Landmark-to-coordinate conversion.
- Gemini-assisted report triage.
- Collection-task creation.
- Interactive map.
- Route generation using a custom algorithm.
- Route assignment.
- Task completion.
- Report resolution.
- Dashboard notifications.

### 5.2 Simulated capabilities

- Nine additional smart bins.
- Three LAWMA trucks.
- Truck movement along an active route.
- Traffic penalties.
- Road-condition penalties.
- Vehicle-health data.
- Predictive-maintenance alerts.
- Larger operational activity history.

### 5.3 Future capabilities only

- Live Lagos traffic integration.
- Live road-condition intelligence.
- Real fleet telemetry.
- Production predictive maintenance.
- Multi-truck optimisation.
- Multi-LGA rollout.
- Native driver app.
- Automated driver dispatch.
- City-wide demand forecasting.

---

## 6. Users and Roles

## 6.1 Fleet Manager

The fleet manager can:

- Sign in to the operations dashboard.
- View all bins, reports, tasks, trucks, routes and alerts.
- Review AI classifications.
- Change report category and priority.
- Create collection tasks.
- Link reports to existing tasks.
- Mark reports as duplicates.
- Generate routes.
- Assign routes to trucks.
- Re-optimise routes.
- Mark stops as completed.
- Resolve reports.
- View prototype maintenance alerts.

## 6.2 Resident

A resident can:

- Submit a report through WhatsApp.
- Submit a report through the public web app.
- Share a location pin.
- Enter a nearby landmark.
- Optionally attach one photo.
- Receive a report reference number.
- Track a report using the reference number.
- Receive a WhatsApp acknowledgement.
- Receive a WhatsApp resolution message.

Residents do not create accounts.

---

## 7. Approved Technology Stack

| Requirement | Technology |
|---|---|
| Web application | Next.js with TypeScript |
| UI styling | Tailwind CSS |
| UI components | shadcn/ui |
| Backend | Convex |
| Database | Convex |
| Real-time updates | Convex subscriptions |
| Webhooks | Convex HTTP actions |
| Map rendering | Leaflet |
| Map tiles | OpenStreetMap |
| Geocoding | Nominatim |
| AI triage | Gemini |
| AI fallback | Local keyword and rules engine |
| WhatsApp | Meta WhatsApp Cloud API test number |
| Hosting | Vercel Hobby |
| Route ordering | Custom priority-and-distance algorithm |

No separate Express server will be used.

---

## 8. High-Level Architecture

```text
Smart-bin device
→ Convex hardware HTTP endpoint
→ Sensor reading validation
→ Bin status update
→ Collection-task rules
→ Real-time dashboard update
```

```text
WhatsApp resident
→ Meta webhook
→ Convex WhatsApp HTTP endpoint
→ Guided conversation state
→ Gemini triage
→ Geocoding
→ Citizen report
→ Collection-task rules
→ Real-time dashboard update
```

```text
Public web report
→ Next.js form
→ Convex action
→ Gemini triage
→ Geocoding
→ Citizen report
→ Collection-task rules
→ Real-time dashboard update
```

```text
Pending collection tasks
→ Route-generation algorithm
→ Assigned truck
→ Active route
→ Simulated truck movement
→ Stop completion
→ Task and report resolution
```

---

## 9. MVP Demo Dataset

The system will include:

- 10 smart bins in Bariga.
- 1 real hardware-connected bin.
- 9 simulated bins.
- 3 simulated trucks.
- 6 preloaded citizen reports.
- 1 depot.
- 1 active route.
- 2 prototype maintenance alerts.
- 1 normal truck.
- 1 medium-risk truck.
- 1 high-risk truck.

The main demo will use one active truck.

---

# 10. Information Architecture

## 10.1 Fleet Manager Dashboard

The dashboard navigation will contain:

1. Overview
2. Map
3. Smart Bins
4. Citizen Reports
5. Collection Tasks
6. Routes
7. Fleet & Maintenance
8. Settings

## 10.2 Public App

The public app will contain:

1. Submit Report
2. Report Submitted
3. Track Report

---

# 11. Dashboard Page Requirements

## 11.1 Overview Page

### Purpose

Provide a quick operational summary.

### Summary cards

- Total monitored bins.
- Bins requiring collection.
- Critical bins.
- Open citizen reports.
- Pending collection tasks.
- Active trucks.
- Collections completed today.
- Trucks with maintenance alerts.

### Main sections

- Small operations map.
- Critical alerts.
- Recent activity.
- Collection progress.
- Active route summary.
- Prototype vehicle-health summary.

### Required actions

- Open full map.
- Open critical bins.
- Open citizen reports.
- Open active route.
- Open maintenance alerts.

### Acceptance criteria

- Summary cards use current Convex data.
- Critical alerts are ordered by severity and time.
- Recent events update without page refresh.
- Clicking a card opens the relevant filtered page.

---

## 11.2 Map Page

### Purpose

Provide one live operational view of bins, reports, trucks, tasks and routes.

### Top summary cards

- Total Bins.
- Critical Bins.
- Open Reports.
- Active Truck.
- Collections Today.

### Map layers

- Smart bins.
- Citizen reports.
- Trucks.
- Depot.
- Active route.
- Route stops.

### Marker colours

| Marker | Colour |
|---|---|
| Normal bin | Green |
| Approaching-full bin | Yellow |
| Collection-required bin | Red |
| Critical bin | Dark red with pulse |
| Citizen report | Purple |
| Active truck | Blue |
| Idle truck | Light blue |
| Depot | Blue home/depot icon |

### Map interactions

Selecting a marker opens a detail panel.

#### Selected bin detail

- Bin ID.
- Address.
- Fill percentage.
- Status.
- Last reading.
- Device status.
- Active task.
- Last collection.
- View full bin details.

#### Selected report detail

- Report reference.
- Category.
- Priority.
- Summary.
- Source.
- Location.
- Report time.
- Linked task.
- View full report details.

#### Selected truck detail

- Truck ID.
- Status.
- Assigned route.
- Current stop.
- Remaining stops.
- Maintenance risk.
- View truck details.

### Route panel

When an active route exists, display:

- Assigned truck.
- Number of stops.
- Estimated distance.
- Estimated duration.
- Current stop.
- Remaining stops.
- Completed stops.
- Re-optimise Route button.
- Mark Stop Completed button.

### Map filters

- All.
- Smart bins.
- Citizen reports.
- Trucks.
- Critical only.
- Active route only.

### Search

Search supports:

- Bin ID.
- Truck ID.
- Report reference.
- Landmark.
- Address.

### Acceptance criteria

- All configured bins appear at their stored coordinates.
- New bin readings update marker colour in real time.
- New citizen reports appear without page refresh.
- Selected items show the correct side panel.
- Active route stops are numbered.
- Re-optimisation requires fleet-manager confirmation.
- OpenStreetMap attribution is visible.

---

## 11.3 Smart Bins Page

### Purpose

Manage and monitor all smart bins.

### Table columns

- Bin ID.
- Name.
- Address.
- Fill percentage.
- Status.
- Device status.
- Last reading.
- Active task.
- Last collection.
- Source: real or simulated.

### Filters

- All.
- Normal.
- Approaching full.
- Collection required.
- Critical.
- Offline.
- Real hardware.
- Simulated.

### Bin detail page or drawer

- Bin ID.
- Device ID.
- Name and location.
- Coordinates.
- Current fill percentage.
- Current status.
- Device connectivity.
- Last reading.
- Fill-level history.
- Recent readings.
- Collection history.
- Active collection task.
- Related citizen reports.
- Source: real or simulated.

### Fleet-manager actions

- Create collection task.
- View on map.
- Mark device as inactive.
- Manually confirm emptying.
- Edit bin name and location.
- View unusual readings.

### Acceptance criteria

- Real and simulated bins are visibly distinguished.
- Reading history is shown chronologically.
- A bin can have only one active collection task.
- Offline status updates according to the five-minute rule.
- Manual emptying confirmation is recorded in history.

---

## 11.4 Citizen Reports Page

### Purpose

Review, triage and resolve citizen-submitted waste reports.

### Table columns

- Reference number.
- Category.
- Priority.
- Location.
- Source.
- Submission time.
- Status.
- AI status.
- Linked task.

### Filters

- All.
- New.
- Needs clarification.
- Under review.
- Scheduled.
- In progress.
- Resolved.
- Duplicate.
- By priority.
- By category.
- By source.

### Report detail

- Reference number.
- Original message.
- Optional photo.
- Submitted location pin.
- Typed landmark.
- Resolved coordinates.
- AI-generated summary.
- AI category.
- AI priority.
- AI collection recommendation.
- AI processing status.
- Related nearby reports.
- Linked bin.
- Linked collection task.
- Status history.
- Submission source.
- Submission time.
- Resolution time.

### Fleet-manager actions

- Confirm AI classification.
- Change category.
- Change priority.
- Change resolved coordinates.
- Request more information.
- Create collection task.
- Link to an existing task.
- Mark as duplicate.
- Reject irrelevant report.
- Mark as resolved.

### Acceptance criteria

- AI output is editable.
- The original resident message is preserved.
- A report with unclear location cannot create a task automatically.
- Duplicate suggestions do not merge reports automatically.
- Resolving a linked task resolves the report.
- Report status changes appear in the public tracker.

---

## 11.5 Collection Tasks Page

### Purpose

Manage all operational waste-collection tasks.

### Task sources

- Smart-bin threshold.
- Citizen report.
- Fleet-manager manual creation.

### Table columns

- Task ID.
- Source.
- Location.
- Coordinates.
- Priority.
- Reason.
- Status.
- Assigned truck.
- Route.
- Created time.
- Completion time.

### Filters

- Pending.
- Scheduled.
- Assigned.
- En route.
- Collected.
- Unable to complete.
- Cancelled.
- By priority.
- By source.

### Task detail

- Task ID.
- Source.
- Source reference.
- Bin or report details.
- Coordinates.
- Priority.
- Reason.
- Active route.
- Assigned truck.
- Status history.
- Created time.
- Scheduled time.
- Completion time.
- Related citizen reports.

### Fleet-manager actions

- Edit priority.
- Assign to route.
- Remove from route.
- Mark unable to complete.
- Cancel.
- Mark collected.
- View on map.

### Acceptance criteria

- Only pending tasks can be selected for a new route.
- A task cannot belong to more than one active route.
- Completing a task updates its linked bin or report.
- Cancelled tasks do not appear in route generation.
- Status history is preserved.

---

## 11.6 Routes Page

### Purpose

Generate and manage collection routes.

### Route builder

The manager selects:

- One available truck.
- Pending tasks.
- Maximum eight stops.

Critical tasks are included first.

### Route output

Display:

- Route ID.
- Assigned truck.
- Depot.
- Ordered stops.
- Number of stops.
- Estimated straight-line distance.
- Estimated duration.
- Priority composition.
- Simulated traffic penalty.
- Simulated road-condition penalty.

### Route actions

- Generate route.
- Review proposed order.
- Remove stop.
- Move stop manually.
- Assign route.
- Start route.
- Re-optimise route.
- Cancel route.
- Complete route.

### Active route view

- Route line.
- Numbered stops.
- Current truck location.
- Current stop.
- Next stop.
- Completed stops.
- Remaining stops.
- Progress percentage.
- Estimated distance.
- Estimated duration.

### Acceptance criteria

- A route has one truck.
- A route has at most eight stops.
- Critical tasks appear before lower-priority tasks unless distance rules require a manager-approved change.
- Active routes do not change automatically.
- Re-optimisation creates a new stop order only after confirmation.
- Completed stops remain visible in route history.

---

## 11.7 Fleet & Maintenance Page

### Purpose

Show truck availability, route assignment and prototype vehicle-health information.

### Truck table

- Truck ID.
- Driver name.
- Status.
- Current location.
- Assigned route.
- Remaining stops.
- Capacity indicator.
- Maintenance risk.
- Last service date.

### Truck statuses

- Available.
- Assigned.
- On route.
- At collection point.
- Returning.
- Maintenance.
- Offline.

### Truck detail

- Truck ID.
- Driver.
- Current status.
- Current route.
- Simulated location.
- Collection history.
- Mileage since service.
- Last service date.
- Battery status.
- Engine-health score.
- Maintenance risk.
- Maintenance alerts.

### Prototype maintenance labels

Every maintenance section must display:

> Prototype Vehicle Health Monitoring — based on simulated data.

### Acceptance criteria

- Simulated data is clearly labelled.
- One truck is normal.
- One truck is medium risk.
- One truck is high risk.
- A maintenance truck cannot be assigned to a route.
- Maintenance risk is visible from both table and detail views.

---

## 11.8 Settings Page

### Purpose

Allow configuration of demo rules.

### Configurable values

- Collection-required threshold.
- Critical threshold.
- Empty-confirmation threshold.
- Device-offline timeout.
- Duplicate-distance threshold.
- Maximum route stops.
- Depot coordinates.
- Simulation speed.
- Simulated traffic penalty.
- Simulated road-condition penalty.

### Default values

| Setting | Default |
|---|---|
| Approaching-full threshold | 60% |
| Collection-required threshold | 80% |
| Critical threshold | 95% |
| Empty-confirmation threshold | Below 30% |
| Device-offline timeout | 5 minutes |
| Duplicate-distance threshold | 100 metres |
| Maximum route stops | 8 |
| Hardware demo interval | 30 seconds |

### Acceptance criteria

- Only fleet managers can change settings.
- Changes are stored in Convex.
- Threshold changes affect future status calculations.
- Existing completed records are not rewritten.

---

# 12. Public App Requirements

## 12.1 Submit Report Page

### Fields

- Problem category.
- Description.
- Location method.
- Shared browser location.
- Typed landmark.
- Optional photo.
- Submit button.

### Supported categories

- Overflowing waste point.
- Illegal dumpsite.
- Missed collection.
- Drainage blockage caused by waste.
- Other waste issue.

### Location rules

At least one is required:

- Browser GPS coordinates.
- Clear typed landmark.

### Acceptance criteria

- The page is mobile responsive.
- Description is required.
- Location is required.
- One photo is optional.
- Submission creates a report reference.
- The original report is stored before AI processing.

### Phase 5 reporting boundary

Residents do not require authentication. Phase 5 stores the original report, browser coordinates or the exact typed landmark, and `aiStatus: pending`; it does not resolve landmarks, reverse geocode, call Gemini, prioritise reports, detect duplicates, or create tasks. Phase 6 owns Nominatim resolution and AI-assisted triage.

### Optional report photos

Optional report photos use Convex File Storage. Only JPEG, PNG and WebP are accepted, with a maximum size of 5 MiB. The application stores only the Convex storage ID. Public submitted and tracking views never include a photo, storage ID or file URL. Authorized direct URLs are controlled-MVP bearer URLs, not strict per-request authorization.

---

## 12.2 Report Submitted Page

### Display

- Success state.
- Report reference.
- Submitted time.
- Current status.
- Track Report button.

### Acceptance criteria

- Reference number is unique.
- The resident can copy the reference.
- The page does not expose private dashboard data.

---

## 12.3 Track Report Page

### Input

- Report reference number.

### Display

- Report category.
- Location summary.
- Current status.
- Submitted time.
- Last status update.

### Public statuses

- Received.
- Under review.
- Scheduled for collection.
- In progress.
- Resolved.
- More information required.

### Acceptance criteria

- Only public-safe information is displayed.
- Invalid references show a clear not-found state.
- Internal AI reasoning is never displayed.
- Internal fleet data is never displayed.

---

# 13. Smart-Bin Hardware Flow

## 13.1 Hardware Payload

The smart-bin device sends:

```json
{
  "deviceId": "device-001",
  "binId": "BG-001",
  "fillPercentage": 84,
  "recordedAt": "2026-07-16T11:30:00Z"
}
```

## 13.2 Hardware Endpoint

The prototype sends an HTTPS `POST` request directly to a Convex HTTP action. The endpoint is intentionally unauthenticated for the controlled MVP: no API key, secret or authentication header is required. It still validates the submitted payload, device, bin and device-to-bin relationship. This is not production secure; a production deployment would require device authentication and abuse protection.

## 13.3 Processing Rules

On receipt:

1. Validate required fields.
2. Confirm the device exists.
3. Confirm the device is assigned to the bin.
4. Store the reading.
5. Update the bin's current fill percentage.
6. Update the bin's last reading time.
7. Update device status to online.
8. Recalculate bin status.
9. Evaluate collection-task rules.
10. Publish the updated state to the dashboard.

A valid delayed reading is retained in history and updates device connectivity using the server receipt time. It does not replace the bin's current measurement or operational status.

## 13.4 Bin Status Rules

| Fill percentage | Status |
|---|---|
| 0–59% | Normal |
| 60–79% | Approaching full |
| 80–94% | Collection required |
| 95–100% | Critical |

## 13.5 Device Rules

- Hardware sends a reading every 30 seconds during the demo.
- A device is offline after five minutes without a reading.
- A reading outside 0–100 is rejected.
- A sudden unusual jump is stored and flagged.
- Repeated high readings do not create duplicate tasks.
- One bin may have only one active collection task.
- An exact repeat using the same device and recorded time is idempotent. A conflicting payload using that same key is rejected.

## 13.6 Collection Completion

```text
Manager marks task as collected
→ bin status becomes Awaiting confirmation
→ next reading below 30% confirms emptying
→ bin returns to Normal
```

The fleet manager may manually confirm emptying if the sensor is delayed. A bin remains in Awaiting confirmation until a reading below the empty-confirmation threshold is received or a fleet manager confirms emptying manually. Higher readings during this state do not replace the Awaiting confirmation status or create another task.

---

# 14. WhatsApp Reporting Flow

## 14.1 Supported Input

The WhatsApp flow accepts:

- Text message.
- Shared WhatsApp location.
- One optional photo.

## 14.2 Guided Conversation

```text
Resident starts conversation
→ bot asks for problem description
→ bot asks for location pin or landmark
→ bot asks for optional photo or SKIP
→ report is created
→ report reference is returned
```

If the first message already contains a clear problem and location, the system may skip unnecessary questions.

## 14.3 Conversation States

- Awaiting description.
- Awaiting location.
- Awaiting optional photo.
- Ready to submit.
- Submitted.
- Awaiting clarification.

## 14.4 Acknowledgement Message

```text
Thank you. Your waste report has been received.

Reference: WR-1042
Status: Received
```

## 14.5 Resolution Message

```text
Your waste report WR-1042 has been resolved.

Thank you for helping improve waste management in your community.
```

## 14.6 WhatsApp Acceptance Criteria

- Webhook verification works.
- Incoming message events are stored.
- Conversation state is preserved per WhatsApp user.
- A report is not created until location information exists.
- One reference is generated per submitted report.
- Resolution message is sent when the linked report is resolved.

---

# 15. Location and Geocoding Rules

## 15.1 Location Priority

Use location in this order:

1. Shared GPS coordinates.
2. Browser GPS coordinates.
3. Typed landmark resolved through Nominatim.
4. Clarification request.

## 15.2 Typed Landmark Flow

Phase 5 stores the resident's exact trimmed landmark without geocoding or inventing coordinates. In Phase 6, the system may send "Bariga Market, Lagos, Nigeria" to Nominatim, store returned coordinates and make a resolved report marker available on the map.

## 15.3 Vague Location Rule

Examples such as:

- Bariga.
- Lagos.
- Around my area.
- Near the road.

are not sufficient.

The system must ask for:

- A location pin.
- A nearby landmark.
- A street name.
- A bus stop.
- A market, school or recognised public place.

The system must not place a random marker.

## 15.4 Failed Geocoding

If no acceptable result is returned:

- Set report status to `Needs clarification`.
- Do not create a collection task.
- Ask the resident for a location pin or better landmark.
- Make the report visible to the fleet manager.

## 15.5 Geocoding Constraints

- Requests are throttled.
- Results are cached.
- Stored coordinates are used after resolution.
- OpenStreetMap attribution is displayed.

---

# 16. AI Triage Requirements

## 16.1 AI Responsibilities

Gemini will:

- Classify report category.
- Assign priority.
- Extract location text.
- Produce a short operational summary.
- Recommend whether collection is required.
- Indicate whether clarification is needed.

## 16.2 Required Structured Output

```json
{
  "category": "overflowing_waste",
  "priority": "high",
  "summary": "Overflowing waste is obstructing part of the road near Bariga Market.",
  "locationText": "Bariga Market",
  "requiresCollection": true,
  "needsClarification": false
}
```

## 16.3 Categories

- `overflowing_waste`
- `illegal_dumpsite`
- `missed_collection`
- `drainage_blockage`
- `other`

## 16.4 Priorities

### Low

Minor issue with no immediate public impact.

### Medium

Waste accumulation or missed collection without serious obstruction.

### High

Overflowing waste, clear road obstruction or significant public-health concern.

### Critical

Immediate safety or severe public-health risk, major road obstruction, dangerous dumping or blocked drainage during rainfall.

## 16.5 Rules-Based Fallback

If Gemini is unavailable, the local fallback will:

- Match keywords to categories.
- Detect urgency terms.
- Assign a conservative priority.
- Preserve the original report.
- Mark the report as fallback-classified.

Example keywords:

| Category | Example terms |
|---|---|
| Overflow | overflowing, full, spilling, packed |
| Illegal dumpsite | illegal dump, dumping, refuse heap |
| Missed collection | missed, not collected, truck did not come |
| Drainage blockage | blocked drainage, gutter, flood, water not passing |

## 16.6 AI Guardrails

- AI output is a recommendation.
- Fleet manager can edit all AI-derived values.
- Phone numbers are not sent to Gemini.
- Unnecessary personal information is not sent to Gemini.
- A vague location cannot be accepted only because AI extracted a place name.
- AI does not automatically merge duplicate reports.

---

# 17. Automatic Collection-Task Rules

## 17.1 Create Task Automatically

Create a task when:

- A smart bin reaches 80% or above.
- A high-priority report requires collection and has valid coordinates.
- A critical report requires collection and has valid coordinates.

## 17.2 Do Not Create Task Automatically

Do not create a task when:

- Location is unclear.
- Coordinates are missing.
- The report is low priority.
- The report is medium priority.
- The report concerns an illegal dumpsite requiring investigation.
- A matching active task already exists nearby.
- The report is marked duplicate.
- The report is rejected.

## 17.3 Duplicate Prevention

Before creating a task, check:

- Existing active task for the same bin.
- Existing active task within 100 metres.
- Similar task category.
- Unresolved status.

If a possible match exists:

- Link the report as a possible duplicate candidate.
- Show the match to the fleet manager.
- Do not automatically merge.
- Do not create a second task until reviewed.

---

# 18. Collection Task Statuses

Internal task statuses:

- Pending.
- Scheduled.
- Assigned.
- En route.
- Collected.
- Unable to complete.
- Cancelled.

Allowed transitions:

```text
Pending
→ Scheduled
→ Assigned
→ En route
→ Collected
```

Alternative transitions:

```text
Pending / Scheduled / Assigned / En route
→ Unable to complete
```

```text
Pending / Scheduled
→ Cancelled
```

Completed and cancelled tasks are immutable except for manager notes.

---

# 19. Citizen Report Statuses

Internal statuses:

- New.
- Needs clarification.
- Under review.
- Task created.
- Scheduled.
- In progress.
- Resolved.
- Duplicate.
- Rejected.

Public status mapping:

| Internal status | Public status |
|---|---|
| New | Received |
| Needs clarification | More information required |
| Under review | Under review |
| Task created | Scheduled for collection |
| Scheduled | Scheduled for collection |
| In progress | In progress |
| Resolved | Resolved |
| Duplicate | Under review |
| Rejected | Under review |

---

# 20. Route Optimisation Rules

## 20.1 Route Inputs

- One available truck.
- One depot.
- Pending tasks.
- Maximum eight stops.
- Task priority.
- Task coordinates.
- Simulated traffic penalty.
- Simulated road-condition penalty.

## 20.2 Route Ordering

The route algorithm will:

1. Start from the depot.
2. Select critical tasks first.
3. Select the nearest eligible critical task.
4. Continue until all critical tasks are placed.
5. Select high-priority tasks using nearest-neighbour ordering.
6. Add lower-priority tasks only if manually selected.
7. Apply simulated traffic and road-condition penalties.
8. Return an ordered stop list.

## 20.3 Distance

The MVP may use geographic distance between coordinates for ordering.

The interface must describe this as:

> AI-assisted route optimisation using urgency, fill level, distance and simulated traffic and road-condition penalties.

The product must not claim live Lagos traffic data.

## 20.4 Route Limits

- One active route in the main demo.
- One truck per route.
- Maximum eight stops.
- One task per active route.
- Maintenance trucks cannot be selected.
- Active routes do not change automatically.

## 20.5 Re-optimisation

When a new urgent task arrives:

1. Show a dashboard alert.
2. Show whether the task is near the active route.
3. Allow the manager to click `Re-optimise Route`.
4. Show the proposed new order.
5. Require confirmation.
6. Preserve completed stops.
7. Update only remaining stops.

---

# 21. Truck Tracking and Simulation

## 21.1 Truck Dataset

Three trucks:

- Truck 01: active and available for the main route.
- Truck 02: available with medium maintenance risk.
- Truck 03: maintenance with high risk.

## 21.2 Simulated Movement

When a route starts:

- Truck 01 moves between route stops.
- Location updates at a configured interval.
- Route progress updates.
- Current stop changes.
- Completed stops remain visible.
- Manager can pause simulation.
- Manager can mark a stop completed manually.

## 21.3 Collection Progress

Display:

- Current stop.
- Next stop.
- Completed stops.
- Remaining stops.
- Progress percentage.
- Estimated remaining duration.

No real driver-phone location is used.

---

# 22. Prototype Maintenance Alerts

## 22.1 Simulated Inputs

- Mileage since last service.
- Last service date.
- Battery status.
- Engine-health score.
- Reported fault.
- Next recommended service.

## 22.2 Risk Levels

- Normal.
- Medium.
- High.

## 22.3 Example Alerts

```text
Truck 02
Risk: Medium
Reason: Approaching service interval
Recommendation: Inspect after current operations
```

```text
Truck 03
Risk: High
Reason: Simulated battery anomaly and overdue service
Recommendation: Keep unavailable and schedule inspection
```

## 22.4 Rules

- High-risk truck status is `Maintenance`.
- Maintenance trucks cannot be assigned.
- All data must be marked as simulated.
- No claim of real predictive diagnostics may appear.

---

# 23. Notifications and Activity Feed

## 23.1 Dashboard Notifications

Create notifications for:

- Bin becomes critical.
- Bin reaches collection threshold.
- New critical citizen report.
- New high-priority citizen report.
- Device goes offline.
- Route requires re-optimisation.
- Maintenance risk becomes high.
- Task is unable to complete.

## 23.2 Activity Feed

Show:

- Sensor reading events.
- Task creation.
- Report submission.
- Report classification.
- Route creation.
- Route assignment.
- Stop completion.
- Report resolution.
- Device offline event.
- Maintenance alert.

## 23.3 Notification Rules

- Critical notifications remain unread until acknowledged.
- Activity events are immutable.
- No email or SMS is sent.

---

# 24. Core Data Entities

The PRD requires the following conceptual entities.

## 24.1 User

- ID.
- Name.
- Email.
- Role.
- Created time.

## 24.2 Device

- ID.
- Device identifier.
- Assigned bin ID.
- Status.
- Last seen.
- Source: real or simulated.

## 24.3 Bin

- ID.
- Display ID.
- Name.
- Address.
- Latitude.
- Longitude.
- Current fill percentage.
- Current status.
- Last reading time.
- Last collection time.
- Device ID.
- Source: real or simulated.

## 24.4 Sensor Reading

- ID.
- Device ID.
- Bin ID.
- Fill percentage.
- Recorded time.
- Received time.
- Unusual-reading flag.

## 24.5 Citizen Report

- ID.
- Reference number.
- Source.
- Original message.
- Category.
- Priority.
- Summary.
- Landmark text.
- Latitude.
- Longitude.
- Private Convex File Storage ID for an optional photo.
- Requires collection.
- Needs clarification.
- AI status.
- Report status.
- Linked task ID.
- Linked bin ID.
- Created time.
- Resolved time.

## 24.6 WhatsApp Conversation

- ID.
- WhatsApp user identifier.
- Current state.
- Draft description.
- Draft landmark.
- Draft latitude.
- Draft longitude.
- Draft photo reference.
- Last message time.

## 24.7 Collection Task

- ID.
- Display ID.
- Source type.
- Source ID.
- Latitude.
- Longitude.
- Priority.
- Reason.
- Status.
- Assigned truck ID.
- Route ID.
- Created time.
- Completion time.

## 24.8 Truck

- ID.
- Display ID.
- Driver name.
- Status.
- Latitude.
- Longitude.
- Assigned route ID.
- Capacity indicator.
- Maintenance risk.
- Source: simulated.

## 24.9 Route

- ID.
- Display ID.
- Truck ID.
- Depot latitude.
- Depot longitude.
- Status.
- Ordered stop IDs.
- Current stop index.
- Estimated distance.
- Estimated duration.
- Traffic penalty.
- Road-condition penalty.
- Created time.
- Started time.
- Completed time.

## 24.10 Route Stop

- ID.
- Route ID.
- Task ID.
- Sequence number.
- Status.
- Arrival time.
- Completion time.

## 24.11 Maintenance Alert

- ID.
- Truck ID.
- Risk.
- Reason.
- Recommendation.
- Simulated flag.
- Created time.
- Resolved time.

## 24.12 Notification

- ID.
- Type.
- Severity.
- Title.
- Description.
- Related entity type.
- Related entity ID.
- Read time.
- Created time.

## 24.13 Activity Event

- ID.
- Event type.
- Description.
- Related entity type.
- Related entity ID.
- Created time.

## 24.14 Settings

- Threshold values.
- Depot coordinates.
- Duplicate radius.
- Maximum route stops.
- Simulation speed.
- Penalty values.

---

# 25. API and Webhook Requirements

## 25.1 Hardware Webhook

### Method

`POST`

### Consumer

Smart-bin device.

### Required fields

- `deviceId`
- `binId`
- `fillPercentage`
- `recordedAt`

### Response behaviour

- Return success after validation and storage.
- Return a validation failure for invalid payload.
- Validate the submitted device, bin and device-to-bin relationship.
- Do not create duplicate tasks from repeated readings.
- The controlled MVP endpoint is intentionally unauthenticated; production device authentication and abuse protection are outside MVP scope.

---

## 25.2 WhatsApp Webhook

### Responsibilities

- Verify Meta webhook.
- Receive text messages.
- Receive shared location.
- Receive one photo.
- Maintain guided-conversation state.
- Create citizen report.
- Send acknowledgement.
- Send clarification request.
- Send resolution message.

---

## 25.3 Public Report Submission

### Responsibilities

- Validate fields.
- Store original report and either browser coordinates or the typed landmark.
- Store AI processing as pending for Phase 6.
- Create report reference.
- Return report-submitted state.

Phase 5 does not resolve location, call Nominatim or Gemini, or create tasks automatically.

---

# 26. Validation Rules

## 26.1 Sensor Reading

- `deviceId` required.
- `binId` required.
- `fillPercentage` must be between 0 and 100.
- `recordedAt` required.
- Device and bin relationship must match.

## 26.2 Citizen Report

- Description required.
- At least one location method required.
- One photo maximum.
- File type must be an accepted image type.
- Report category optional when submitted by WhatsApp.
- Coordinates must be valid when supplied.

## 26.3 Route

- Truck must be available.
- Truck cannot be under maintenance.
- At least one task required.
- Maximum eight tasks.
- All selected tasks must be pending.
- All tasks must have coordinates.

---

# 27. Loading, Empty and Error States

## 27.1 Loading States

Use clear skeleton or progress states for:

- Dashboard data.
- Map markers.
- Geocoding.
- AI classification.
- Route generation.
- Report submission.
- Image upload.

## 27.2 Empty States

Provide empty states for:

- No critical bins.
- No reports.
- No pending tasks.
- No active route.
- No notifications.
- No reading history.
- No maintenance alerts.

## 27.3 User-Facing Error States

Support realistic errors only:

- Report submission failed.
- Location permission denied.
- Landmark could not be found.
- AI triage unavailable.
- Route could not be generated.
- WhatsApp message could not be processed.
- Sensor payload invalid.
- Photo upload failed.

The report should remain stored when AI processing fails.

---

# 28. Security and Privacy Requirements

- Fleet dashboard requires authentication.
- Public residents do not access dashboard data.
- Phone numbers are not sent to Gemini.
- Only required report text is sent to Gemini.
- Public report tracking exposes only safe status data.
- The WhatsApp webhook validates its expected source. The physical smart-bin endpoint is intentionally unauthenticated for the controlled MVP and must not be presented as production secure.
- Uploaded photos use Convex File Storage and are not publicly browsable by default. Public queries never return photo storage IDs or URLs. Generated upload URLs are intentionally public for unauthenticated residents in the controlled MVP; production abuse prevention, rate limiting and orphaned-upload cleanup are outside scope.
- Environment secrets are not exposed to the browser.
- Simulated data is clearly labelled.
- Activity and status changes are auditable.

---

# 29. Accessibility and Responsive Behaviour

- Dashboard targets desktop and tablet.
- Public app targets mobile first.
- Status must not be communicated by colour alone.
- Buttons and form fields must have visible labels.
- Map markers must have text alternatives in associated lists.
- Keyboard navigation must work for non-map controls.
- Dialogs and drawers must trap focus correctly.
- All form errors must be readable and associated with fields.

---

# 30. Performance Expectations

For the MVP:

- Initial dashboard should load within a reasonable demo timeframe.
- Real-time sensor changes should appear within seconds.
- Route generation should complete quickly for eight stops.
- Map should handle the configured 10 bins, reports and three trucks smoothly.
- Repeated geocoding requests should use cached results.

---

# 31. Seed and Demo Controls

The dashboard must include protected demo controls or scripts for:

- Resetting the demo dataset.
- Simulating bin fill changes.
- Creating a critical citizen report.
- Starting truck movement.
- Pausing truck movement.
- Advancing to the next stop.
- Triggering a maintenance alert.
- Resetting the active route.

These controls are for demonstration only and must not appear in the public app.

---

# 32. Primary End-to-End Demo Scenario

```text
1. Fleet manager opens the operations map.

2. The map shows 10 bins, 3 trucks, citizen reports and one depot.

3. The real hardware bin starts at 45% and appears green.

4. Waste is placed in the physical bin.

5. The device sends an 87% reading to Convex.

6. The bin updates immediately and becomes red.

7. A high-priority collection task is created automatically.

8. A resident sends a WhatsApp report:
   "Waste is overflowing beside Bariga Market and blocking the road."

9. The bot requests a location pin or accepts the landmark.

10. Nominatim resolves Bariga Market to coordinates.

11. Gemini classifies the report as:
    category: overflowing waste
    priority: high
    requires collection: true

12. The report appears on the map.

13. A collection task is created.

14. The fleet manager opens pending tasks.

15. The manager selects Truck 01.

16. The manager generates a route containing:
    - the real smart bin
    - the WhatsApp report
    - two simulated full bins

17. The route appears with ordered stops.

18. The route is assigned and started.

19. Truck movement is simulated.

20. The manager marks stops completed.

21. Task and route progress update.

22. The resident report becomes resolved.

23. The resident receives a WhatsApp resolution message.

24. The fleet page displays one medium and one high prototype maintenance alert.
```

---

# 33. Overall MVP Acceptance Criteria

The software MVP is accepted when all of the following work:

- One real device can send valid fill-level data.
- A reading updates the correct bin.
- Bin status changes according to thresholds.
- A qualifying bin creates one active collection task.
- Meta WhatsApp test messages reach the system.
- Guided WhatsApp reporting works.
- Shared coordinates appear correctly on the map.
- A typed landmark can be geocoded.
- Vague locations trigger clarification.
- Public web reporting works.
- Gemini returns structured triage.
- Rules fallback works when Gemini is unavailable.
- High and critical qualifying reports create tasks.
- Duplicate task prevention works.
- The dashboard updates in real time.
- The map displays bins, reports, trucks, depot and active route.
- One route can be generated with up to eight stops.
- Route re-optimisation requires manager approval.
- Simulated truck movement updates route progress.
- Completing a smart-bin task waits for sensor confirmation or manual confirmation.
- Completing a report task resolves the report.
- The public tracker displays current report status.
- WhatsApp acknowledgement and resolution messages work.
- Prototype maintenance alerts are visible and labelled simulated.
- All software services remain within the approved ₦0 MVP approach.

---

# 34. Product Language Rules

Use these phrases in the interface and presentation:

- Smart Waste Management Platform.
- AI-assisted report triage.
- Demand-based collection scheduling.
- AI-assisted route optimisation.
- Prototype Vehicle Health Monitoring.
- Simulated traffic and road-condition penalties.
- Proof of concept.
- Bariga pilot.

Do not claim:

- Live Lagos traffic intelligence.
- Real predictive maintenance.
- Production LAWMA integration.
- City-wide deployment.
- Fully autonomous dispatch.
- Real vehicle telemetry.

---

# 35. Final Product Principle

Every feature must support this operational chain:

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

Features that do not support the approved MVP scope should not be added.
