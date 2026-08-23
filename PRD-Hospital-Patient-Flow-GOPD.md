# GOPD Patient Flow Management System — Product Requirements Document (PRD)

**Version**: 1.0  
**Date**: August 2026  
**Status**: Locked for 14-day MVP build  

---

## Executive Summary

A lightweight, offline-capable encounter-flow system for Nigerian public-hospital General Outpatient Departments (GOPDs). It replaces paper queue slips and verbal announcements with real-time queue visibility for patients and operational clarity for reception, verification, payment, and clinical staff.

The system is explicitly **not** a full Hospital Management Information System, electronic medical record, NHIA/HMO verification portal, or payment gateway. It is a queue and workflow coordinator that surfaces the operations currently managed by paper, manual tallies, and shouted names. It provides a foundation for future integration with hospital, NHIA, HMO, and pharmacy systems without pretending to replace them in the MVP.

---

## 1. Problem Statement

### Current state (Nigerian public GOPDs)

Public-hospital GOPDs commonly operate through:
- Paper folders and tally cards for queue management
- Verbal announcements of queue numbers
- Limited patient visibility into position or wait time
- Manual registration and re-registration for repeated visits
- Fragmented workflow across registration, verification (NHIA/HMO), payment (cash), and clinical areas
- No systematic recovery from power or network interruptions — lost records, duplicate registrations, or abandoned patients

Research on Nigerian outpatient departments documents:
- Manual, FCFS-based queue management with no real-time visibility
- Reported patient waits of 2–3 hours or more in some facilities
- Administrative delays before clinical consultation (registration, folder retrieval, verification, payment)
- High risk of data loss during outages

### Why this matters

Patients cannot plan their time. Staff cannot see the queue state at a glance. A 30-minute power blip can mean re-registering patients, duplicate queue entries, or simply abandoning records and starting over manually.

### Proposed solution

A shared operational queue that:
- Lets patients check in with minimal fields and immediately see their position and stage
- Gives staff a live queue view by stage and priority
- Works during network outages with automatic sync when connectivity returns
- Records every important action with timestamps and actor identity for auditability
- Gracefully handles conflicts (e.g., two staff members calling the same patient offline) without silent data loss

---

## 2. Product Scope

### In scope (MVP)

- **Patient check-in**: name, phone, optional ID, coverage type, urgency classification
- **Queue management**: real-time position, stage tracking, priority escalation for emergencies
- **Four encounter pathways**:
  - NHIA: Registration → Verification → Consultation → Pharmacy → Completed
  - HMO: Registration → Verification → Approval → Consultation → Completed
  - Cash: Registration → Payment → Consultation → Completed
  - Emergency/Urgent: Triage (by clinical staff) → Consultation → Completed
- **Staff workflow**: verification, approval, payment, triage, call-next, consultation, completion
- **Offline resilience**: check-in, status updates, and call-next actions work without network; sync automatically on reconnect
- **Audit trail**: every status change records actor, timestamp, device, and reason
- **Estimated wait time**: rolling-average calculation based on recent consultation duration and queue depth
- **Doctor break toggle**: staff can pause queue when clinician is unavailable

### Explicitly NOT in scope (v2 or integration roadmap)

- **No real external integrations**: NHIA eligibility checking, HMO authorization APIs, payment gateways
  - Verification, approval, and payment are manually toggled for MVP; recorded as `MANUAL_MVP` with staff identity
- **No multi-department routing**: single GOPD only; data model supports later extension
- **No full EMR**: no clinical notes, diagnosis, prescriptions, or laboratory results
- **No appointment booking**: walk-in and emergency only
- **No notifications**: no SMS, WhatsApp, push, or voice notifications
- **No authentication** (prototype only, see Security note below)
- **No analytics dashboard**: only live operations and basic end-of-day reconciliation
- **No automated clinical decision support**: all triage and priority escalation is manual staff decision

### Critical non-goal

"No authentication/login for staff" is acceptable **only as a prototype limitation**. A real deployment must:
- Authenticate all staff
- Restrict actions by role (receptionist, verification staff, clinician, supervisor)
- Log who performed every status change
- Prevent unauthorized staff from marking patients verified, paid, or completed

For the portfolio MVP, label this explicitly as "prototype assumes trusted environment" so interviewers understand you know the security gap.

---

## 3. Target Users & Their Needs

| User | Primary need | MVP access | Notes |
|---|---|---|---|
| **Patient** | Understand current progress and waiting time | View own encounter via private code/link | No authentication; private tracking only |
| **Reception staff** | Register new patients quickly | Create encounter, select coverage/urgency, view queue | May toggle offline; create queue numbers |
| **Verification staff** | Process NHIA/HMO administrative steps | Mark verification started/completed/failed, add reference numbers | Manual toggles in MVP; no external API calls |
| **Cashier** | Record cash payment and registration | Mark registration and payment stages, record amount/receipt | Track payment status and method |
| **Clinical staff** | Manage consultation flow and triage | Triage urgency, call next, start/complete consultation, record disposition | May work offline |
| **Pharmacist/Handoff** | Confirm patient disposition | View completed consultations, confirm pharmacy/referral/admission handoff | Read-only or handoff confirmation |
| **Supervisor** | Monitor operations and resolve exceptions | View sync status, resolve conflicts, reopen/cancel encounters, audit trail | Access to all audit data and error states |
| **System operator** | Ensure reliability and data recovery | Monitor device sync status, manage backups, restore data | Not in MVP UI; documented in operations guide |

---

## 4. Product Principles

1. **Safety first**: Emergency escalation is a clinical decision, not a checkbox. Triage staff confirms urgency; system enforces the priority.
2. **Queue visibility, not clinical care**: This system manages flow and status; it does not provide clinical diagnosis or decision support.
3. **Manual steps must be explicit**: "Mark verified" is not the same as "verified by NHIA." Every manual step is recorded with actor, timestamp, and notes.
4. **Offline does not mean unlimited trust**: Offline actions are recorded and timestamped; conflicts are surfaced for resolution, never silently overwritten.
5. **Minimum necessary data**: Collect only name, phone, optional ID, coverage type, and urgency. Do not collect diagnosis, clinical notes, or sensitive identifiers unless operationally required.
6. **Auditability over convenience**: Every status transition records who, when, where (device), and optionally why. This enables recovery from errors.
7. **Graceful degradation**: If the patient display fails or network goes down, staff must still be able to operate with a local queue and printable queue numbers.

---

## 5. Data Model & State Machine

### Core Entities

**Patient** (lightweight, reusable across encounters)
- `patientId` (UUID)
- `displayName`
- `phone`
- `optionalNationalOrHospitalId`
- `dateOfBirth` (only if operationally necessary)
- `createdAt`, `updatedAt`

**Encounter** (one per visit, immutable patient info + mutable workflow)
- `encounterId` (UUID)
- `patientId` (reference to Patient)
- `facilityId`, `departmentId` (GOPD)
- `encounterDate`
- `coverageType`: `NHIA | HMO | CASH | UNKNOWN`
- `urgency`: `ROUTINE | URGENT | EMERGENCY`
- `pathwayTemplate`: immutable copy of the stages selected at check-in
  - e.g., `[REGISTRATION, VERIFICATION, CONSULTATION, COMPLETED]`
- `currentStage`: current step in the pathway
- `status`: encounter-level status (see below)
- `queuePriority`: 0 (emergency) | 1 (routine)
- `queueSequence`: timestamp or counter for FIFO within priority
- `createdAt`, `updatedAt`
- `version`: optimistic lock counter, increments on every update

**Stage** (progress through each pathway step)
- `stageId` (UUID)
- `encounterId` (reference)
- `stageType`: `REGISTRATION | VERIFICATION | APPROVAL | PAYMENT | TRIAGE | CONSULTATION | COMPLETED`
- `status`: `PENDING | IN_PROGRESS | COMPLETED | BLOCKED | SKIPPED | CANCELLED`
- `startedAt`, `completedAt`
- `completedBy` (actor role or device ID)
- `referenceNumber` (e.g., NHIA verification ref, payment receipt)
- `notes` (reason for block, skip, or cancellation)

**Encounter Status** (high-level workflow state)
```
CHECKED_IN           → Patient registered, awaiting administrative processing
IN_ADMIN_PROCESSING  → Verification, approval, or payment in progress
READY_FOR_CLINICAL   → All admin steps complete, waiting for triage/consultation
CALLED               → Called to consultation room, not yet started
IN_CONSULTATION      → With clinician
AWAITING_HANDOFF     → Completed but awaiting pharmacy/referral/admission
COMPLETED            → Encounter closed (treated or discharged)
CANCELLED            → Patient cancelled or staff cancelled
NO_SHOW              → Called but patient did not arrive
ERROR_REVIEW         → Sync conflict or data inconsistency, needs supervisor review
ON_HOLD              → Temporarily paused (e.g., patient fetching ID), history preserved
```

**Queue Event** (append-only log for offline sync)
- `eventId` (UUID)
- `encounterId` (reference)
- `eventType`: `EncounterCreated | VerificationStarted | VerificationCompleted | ApprovalRecorded | PaymentRecorded | TriageRecorded | PatientCalled | ConsultationStarted | ConsultationCompleted | EncounterCancelled | EncounterNoShow | | PriorityChanged | PutOnHold`
- `actorRole`: `RECEPTIONIST | VERIFICATION_STAFF | PAYMENT_STAFF | TRIAGE_STAFF | CLINICIAN | SUPERVISOR`
- `actorDeviceId` (which tablet/kiosk/phone)
- `createdAtDevice` (when recorded locally)
- `receivedAtServer` (when synced; null until sync)
- `clientSequence` (order on the device)
- `baseVersion` (which encounter version this event is based on)
- `payload` (event-specific data, e.g., `{ "stageType": "VERIFICATION", "verificationReference": "NHIA-12345", "notes": "ID verified" }`)
- `idempotencyKey` (UUID, client-generated; same key on retry = same result)
- `syncStatus`: `PENDING | SYNCED | CONFLICT | FAILED`

**Audit Event** (every privileged action)
- `auditId` (UUID)
- `actorRole`, `actorDeviceId`
- `action` (e.g., "MARK_VERIFIED", "CANCEL_ENCOUNTER", "REOPEN_ENCOUNTER")
- `resourceId` (encounter or patient ID)
- `beforeState` (JSON snapshot)
- `afterState` (JSON snapshot)
- `reason` (optional, e.g., "Duplicate patient found")
- `timestamp`
- `syncedAt` (when the audit event was persisted on server)

---

## 6. Patient Pathways in Detail

### NHIA Pathway
```
CHECKED_IN
→ REGISTRATION (staff records basic info, assigns tally)
→ VERIFICATION (staff confirms NHIA card/eligibility; manual step in MVP)
→ CONSULTATION (clinician sees patient)
→ PHARMACY (handoff to pharmacy or discharge)
→ COMPLETED
```

MVP approach:
- "Registration" is the check-in itself
- "Verification" is a manual `MARK_VERIFIED` action by verification staff, recording the reference/notes
- No actual NHIA API call in MVP; field: `verificationMode: "MANUAL_MVP"`

### HMO Pathway
```
CHECKED_IN
→ REGISTRATION
→ VERIFICATION (confirm HMO card/membership)
→ APPROVAL (confirm service is covered for this enrollee/plan; may require pre-authorization)
→ CONSULTATION
→ COMPLETED
```

MVP approach:
- Verification and approval are separate manual steps
- Staff records HMO name, member ID, verification reference, approval code, and any exclusions in notes
- Fields: `verificationMode: "MANUAL_MVP"`, `approvalMode: "MANUAL_MVP"`, `approvalReference`, `approvalNotes`

### Cash Pathway
```
CHECKED_IN
→ REGISTRATION
→ PAYMENT (amount due, method, receipt)
→ CONSULTATION
→ COMPLETED
```

MVP approach:
- Registration is the check-in
- Payment is a manually recorded transaction (not a real payment gateway)
- Record: amount due, amount paid, method (cash/card/bank transfer), receipt number, cashier identity, timestamp
- Field: `paymentStatus: PENDING | PAID | PARTIAL | REFUNDED`

### Emergency/Urgent Pathway
```
CHECKED_IN (immediate escalation flag set by reception)
→ TRIAGE (clinician or senior nurse assesses urgency within 5–10 minutes)
→ CONSULTATION (escalated if truly urgent; normal queue if routine after triage)
→ COMPLETED
```

MVP approach:
- Reception staff can flag as URGENT/EMERGENCY at check-in, but it is *not* automatically high-priority
- Triage staff confirms urgency and assigns `queuePriority: 0` (emergency) or downgrades to `queuePriority: 1` (routine)
- Emergency patients skip the administrative (verification/payment) queues; triage happens first
- Every emergency escalation records the triager's name, time, and clinical justification

---

## 7. Queue Logic

### Queue visibility

The live queue contains all encounters in these states, ordered by priority, then FIFO:
```
Status: CHECKED_IN, READY_FOR_CLINICAL, CALLED, IN_CONSULTATION
Ordered by:
  1. queuePriority (0 = emergency, 1 = routine)
  2. queueSequence (check-in time) within the same priority
```

### Who appears in which queue?

- **Administrative queue** (NHIA/HMO verification, cash payment, registration):
  - Show only patients in those specific stages
  - Filter by coverage type
  - Example: "Cash patients awaiting payment"

- **Clinical queue** (triage, consultation):
  - Show only patients with status `READY_FOR_CLINICAL` or `IN_ADMIN_PROCESSING` but whose currentStage is `TRIAGE` or `CONSULTATION`
  - Prioritize by urgency (emergency first)
  - Example: "Awaiting triage" or "Awaiting consultation"

- **Patient's private view**:
  - Shows only their own encounter
  - Current stage, status, position in the relevant queue, estimated wait
  - Last synchronized timestamp
  - "Offline" warning if not synced in >5 minutes

### Estimated wait calculation

```
Estimated wait (minutes) =
  (number of eligible patients ahead in the same queue) 
  × (rolling-average recent consultation duration)
  / (number of active clinicians or consultation rooms)
```

Inputs:
- Recent completed consultation durations (last 1–2 hours; median or 75th percentile)
- Number of patients ahead in the same eligible queue (filtered by stage/urgency)
- Active clinicians (doctor-available toggle; if off, wait time is "indefinite" or "on hold")

Display:
- Show as a range, e.g., "approximately 30–50 minutes"
- Add a disclaimer: "This is an estimate based on current queue depth and recent consultation times."
- Update every 30 seconds if the queue changes
- Pause the countdown if the doctor is on break

---

## 8. Offline-First Design

### What should work offline

✅ **Check-in**: Create a new encounter locally, assign a temporary queue number, show confirmation  
✅ **View local queue snapshot**: Show the last synchronized queue state  
✅ **Call next patient**: Mark a patient as "called" using the local snapshot  
✅ **Update status**: Mark a patient as verified, paid, triaged, completed, or no-show  
✅ **Emergency escalation**: Flag a patient as urgent locally  
✅ **Hold, cancel, reopen**: Record these actions locally  

All offline actions are timestamped, queued in IndexedDB, and synced to the server when network returns.

### What must be handled carefully

- **Two devices call the same patient while offline**
  - Resolution: Both sync their events; server applies both events but only one succeeds in changing status
  - The second device's sync result includes a conflict code; the device refreshes its queue from the server
  - No silent overwrite; the supervisor sees both events in the audit log

- **Two reception devices issue conflicting queue numbers while offline**
  - Each device has a unique session/device ID
  - Server resolves by encounter creation time and device sequence
  - No true "duplicate queue number"; renumber is deferred to end-of-day reconciliation

- **A patient is completed on one device while another device still shows them waiting**
  - Sync conflict is resolved by encounter version: whichever device has the higher version wins
  - The lower-version device's next sync request receives the conflict response + current state
  - Device automatically refreshes

- **Emergency priority changes after a device goes offline**
  - Device's local queue snapshot becomes stale
  - When reconnected, the device fetches a fresh queue snapshot from the server
  - A patient previously routine may now appear as high-priority; the UI updates

- **Local IndexedDB storage is cleared (device reset, storage quota exceeded)**
  - Unsynced events are lost
  - Next sync request starts fresh with the server's latest state
  - Any unsynced offline actions are irrecoverable; this is a documented risk for offline-only devices

### Event-based sync (not last-write-wins)

Instead of syncing only the latest row, the system uses **append-only events**:

1. Every user action (check-in, mark verified, call next, complete) creates an event in the local outbox.
2. Events are assigned an `idempotencyKey` (UUID generated client-side) so retrying does not create duplicates.
3. On sync, all pending events are sent to the server in order.
4. The server applies each event atomically:
   - If the event's `baseVersion` matches the current encounter version, apply it and bump version
   - If not, record it as a conflict and include both the event and the current state in the sync response
5. The device receives a sync response that lists which events succeeded, which conflicted, and what the current state is.
6. The device updates its local IndexedDB with the results and refreshes the UI.

Example flow:
```
Device 1 (offline):
  Event 1: VerificationCompleted (baseVersion=1)
  Event 2: ConsultationStarted (baseVersion=2)
  → Local state: Encounter at version 2 (imagined)

Device 2 (online):
  API: PATCH /patients/123/status { newStage: "CONSULTATION", expectedVersion: 1 }
  → Server: Version now 3

Device 1 (reconnects):
  Sync: [Event 1 (idempotency=uuid1), Event 2 (idempotency=uuid2)]
  Server: Event 1 baseVersion=1 matches current 1? No, current is 3.
  → Event 1: CONFLICT (already applied by Device 2's API call)
  → Event 2: CONFLICT (baseVersion 2, but current is 3)
  → Response: { events: [{ id: uuid1, status: "CONFLICT", reason: "baseVersion mismatch" }], currentState: {..., version: 3} }

Device 1 UI:
  Shows: "Your queued actions were superseded. Here is the current state:"
  → Offers supervisor review or clear the queue
```

This approach is safer than "last-write-wins" because:
- Conflicts are **visible**, not silent
- The audit log shows both the offline action and why it was rejected
- Supervisors can review and manually intervene if needed

---

## 9. Power Outage & Recovery

### Browser-level resilience

- **Service worker**: Caches application shell (HTML, CSS, JS, fonts) so the app loads even without network
- **IndexedDB**: Persists all unsynced events, the last queue snapshot, and local encounter state
- **Offline indicator**: Shows "Last synced at 14:32" and "Pending events: 3"
- **Write-before-display**: Every user action is written to IndexedDB before the UI updates, so a browser crash mid-action does not lose the action

### Device-level resilience

- **Browser restart**: IndexedDB is persistent; the app re-opens to the last synced state
- **Device restart**: Same as browser restart (OS caches IndexedDB)
- **Power loss**: Same (IndexedDB on disk is durable)

### Server-level resilience

- **DynamoDB**: Durably stores every encounter and event; automatic backups
- **API Gateway + Lambda**: Stateless; requests are idempotent so retries are safe
- **Service worker sync API**: If the server is unreachable, the device queues events and retries on a background schedule (even if the browser tab is closed)

### Recovery testing (required)

During development, simulate:
1. Browser tab refresh mid-action
2. Device restart (e.g., laptop sleep → wake)
3. Hard power loss (unplug device)
4. Network loss (airplane mode on/off)
5. Server becomes unavailable for 10 minutes, then returns
6. Two devices offline for 30 minutes, both send events on reconnect

Success criteria:
- No data loss: every acknowledged event is either synced or in the error queue
- No duplicates: retrying an event with the same idempotency key does not create two results
- Conflicts are surfaced: if two offline devices race, the second sees a conflict response, not a silent overwrite

---

## 10. Security & Privacy

### Legal context (Nigeria)

- **Nigeria Data Protection Act 2023 (NDPA)**: Replaced the earlier NDPR. Establishes the Nigeria Data Protection Commission as the regulator. Health information is sensitive personal data requiring explicit consent, purpose limitation, data minimization, and breach notification.
- **National Health Act**: Contains confidentiality obligations around patient information. Unauthorized disclosure can be criminal.
- **Hospital confidentiality culture**: Many Nigerian hospitals operate under strict patient privacy policies; verify with facility leadership before any rollout.

### MVP security posture (prototype-only)

⚠️ **This MVP has NO authentication or role-based access control.** It assumes a **trusted environment** (e.g., a local hospital network with physical access control).

For a real deployment, you must add:
- Staff authentication (username/password or SMS/USSD for low-bandwidth areas)
- Role-based access control (receptionist, verification staff, clinician, supervisor)
- Session expiry and logout
- Device identification and session binding (so one staff member cannot use another's device)

### Data minimization

Collect only:
- `patientName`, `phone`, `optionalNationalOrHospitalId`
- `coverageType`, `urgency`
- Status transitions and actor identity
- Encounter date/time and queue position

Do NOT store:
- Diagnosis or clinical notes
- Prescriptions or medication history
- Allergy or chronic condition history
- National Identification Number (unless legally required)
- Unencrypted medical history

### Privacy in the patient interface

- Patient view shows only their own encounter (private link/code)
- Staff queue displays do NOT show full names and phone numbers together
- Public waiting-room screens (if any) show only queue numbers, not patient names
- Audit logs are restricted to supervisors and system operators

### Audit trail

Every status change records:
- Who (actor role, device ID; in a real system, staff login)
- When (ISO timestamp)
- Where (device ID / location)
- What (action, before-state, after-state)
- Why (reason/notes, if applicable)

Audit logs are append-only and immutable; supervisors use them to investigate disputes or errors.

### Deployment checklist (not MVP, but document it)

- [ ] Deploy backend on HTTPS only (TLS 1.2+)
- [ ] Encrypt DynamoDB at rest
- [ ] Use least-privilege IAM roles for Lambda functions
- [ ] Enable VPC endpoints for DynamoDB (if not public-internet-facing)
- [ ] Implement staff authentication before production rollout
- [ ] Implement role-based access control (RBAC)
- [ ] Set data retention policy (e.g., delete encounters after 90 days; archive after 1 year)
- [ ] Document breach-response procedure
- [ ] Perform security review with hospital IT/compliance
- [ ] Test backup and restore procedures
- [ ] Train staff on password hygiene and incident reporting

---

## 11. Success Metrics

### Operational

- ✅ At least 95% of check-ins produce a patient-visible queue reference within 5 seconds
- ✅ Staff can complete check-in in <30 seconds after patient provides required info
- ✅ Staff can call the next eligible patient in one primary action (e.g., one tap on a button)
- ✅ Queue correctly separates patients by stage (e.g., no verified patients in the "awaiting verification" view)
- ✅ The queue remains usable offline for at least 30 minutes on a tested device (create new encounters, call next, mark status)

### Synchronization

- ✅ 100% of unsynced offline events are either synchronized exactly once or appear in a supervisor error queue
- ✅ Device reconnect syncs pending events within 30 seconds over WiFi or 4G
- ✅ Duplicate event application rate is zero in automated retry tests
- ✅ Conflicts are surfaced to the supervisor, not silently overwritten

### Capacity

- ✅ Supports at least 200 check-ins per day
- ✅ Supports at least 5 concurrent staff devices (tablets/phones)
- ✅ Performs acceptably with ≥500 active or historical encounters in the test dataset
- ✅ No manual database edits required during normal operation

### Safety

- ✅ Emergency escalation is always possible even if payment/verification is incomplete
- ✅ No patient phone number is displayed on a public queue screen (if any)
- ✅ Every privileged status change has an actor, timestamp, and optional reason in the audit log
- ✅ Offline actions are timestamped and tagged with the device that created them

### Interview narrative

You can describe this system as:

> "I designed this as an offline-first encounter workflow, not just a simple FIFO queue. Each encounter has a coverage type, clinical urgency, current stage, and an append-only event log. I deliberately modeled NHIA verification, HMO approval, and cash payment as manual staff-toggled steps in the MVP instead of pretending to integrate with external systems. Emergency escalation is triage-controlled by clinical staff, not automatic. For offline resilience, I used event-based sync with idempotent keys and explicit conflict surfacing — so reconnecting devices don't silently corrupt the queue. The whole system runs on DynamoDB and Lambda, so it's inherently scalable and cheap for a public hospital with 200 patients per day."

That narrative demonstrates:
- Product judgment (honest about what is and isn't built)
- Nigerian healthcare context (NHIA, HMO, cash workflows)
- State-machine and data-modeling thinking
- Offline-first architecture and conflict resolution
- Privacy and audit awareness
- Serverless and cost-consciousness

---

## 12. User Stories (Complete List)

### Patient (Encounter view)

1. As a patient, I want to check in with my name and phone number, so that registration is quick and I can get a queue reference.
2. As a patient, I want to receive a queue number or private tracking code, so that I can identify my encounter without exposing my details publicly.
3. As a patient, I want to see my current stage (e.g., "awaiting verification," "awaiting consultation"), so that I understand where I am in the workflow.
4. As a patient, I want to see my approximate queue position (e.g., "5 patients ahead"), so that I can plan my time.
5. As a patient, I want the position and wait time estimate to update automatically as the queue changes, so that the info reflects current conditions.
6. As a patient, I want a clear "offline" or "stale data" warning if my status cannot be synced, so that I do not rely on outdated info.
7. As a patient, I want my information kept private, so that other patients cannot see my phone number or health details.

### Reception staff

8. As reception staff, I want to check in a patient with minimal fields (name, phone, optional ID, coverage type, urgency), so that rush-hour registration does not create a bottleneck.
9. As reception staff, I want to search for an existing patient or encounter, so that I do not accidentally create duplicates.
10. As reception staff, I want to select coverage type (NHIA, HMO, Cash) and urgency (routine, urgent, emergency), so that the correct workflow pathway is applied.
11. As reception staff, I want check-in to work even if the network briefly drops, so that patients can still be registered during an outage.
12. As reception staff, I want to correct obvious demographic errors (e.g., typo in name) with an audit trail, so that data quality is maintained.
13. As reception staff, I want to print or display a queue number, so that patients who do not have a smartphone have a usable reference.
14. As reception staff, I want to see the full current queue, so that I can answer patient questions about wait times or position.

### Verification and billing staff

15. As verification staff (NHIA/HMO), I want to mark a patient's verification as started, completed, failed, or pending, so that unresolved cases remain visible in the queue.
16. As verification staff, I want to record a reference number or reason for failure (e.g., "ID expired," "not in system"), so that manual decisions can be reviewed.
17. As authorized staff, I want to record HMO approval status and approval reference number, so that the consultation queue does not admit an unapproved case.
18. As cashier staff, I want to record payment status, amount due, amount paid, method, receipt number, and my identity, so that "paid" is not an unexplained toggle.
19. As staff, I want to place a patient on hold without losing their history, so that exceptions do not appear as missing records.
20. As staff, I want to record a reason for cancelling or reopening an encounter, so that the audit trail explains the action.

### Clinical staff

21. As clinical staff, I want to see only patients eligible for my service queue (e.g., "awaiting triage," "awaiting consultation"), so that administrative holds are not mixed with ready patients.
22. As clinical staff, I want to call the next eligible patient with one action, so that consultation flow remains fast.
23. As clinical staff, I want to mark a patient as in consultation and completed, so that the queue updates for everyone behind them.
24. As clinical staff, I want to triage an urgent or emergency patient (confirm urgency or downgrade to routine), so that priority is based on clinical assessment rather than self-selection.
25. As clinical staff, I want to record a disposition (pharmacy, referral, admission, review, or discharged), so that the next handoff is clear.
26. As clinical staff, I want offline actions (e.g., "call next," "mark completed") to sync automatically when network returns, so that connectivity problems do not interrupt the workflow.

### Supervisor

27. As a supervisor, I want to see which devices are offline and which have pending unsynced events, so that I know whether the live queue is complete.
28. As a supervisor, I want to see sync conflicts explicitly (e.g., two devices called the same patient), so that I can resolve them manually.
29. As a supervisor, I want to reopen or cancel an encounter with a reason, so that corrections are auditable.
30. As a supervisor, I want an end-of-day reconciliation view (missing, duplicated, or abandoned encounters), so that data integrity is verified.
31. As a supervisor, I want to access the full audit trail, so that I can investigate disputes or errors.
32. As a system operator, I want queue data to survive browser refresh, device restart, power loss, and network recovery, so that the system is operationally dependable.

---

## 13. Revised 14-Day Build Plan (High Level)

- **Days 1–2**: Lock PRD, design data model and DynamoDB schema, define state machine
- **Days 3–4**: API endpoints (check-in, get queue, get patient status, call next, update status)
- **Days 5–6**: Backend implementation (Lambda functions + DynamoDB operations)
- **Days 7–8**: React app, queue dashboard, patient view, staff forms
- **Days 9–10**: Offline sync engine (IndexedDB, service worker, event queue, retry logic)
- **Days 11–12**: Integration testing, conflict resolution, end-to-end flows, edge cases
- **Days 13–14**: Documentation (architecture, API spec, deployment guide, user manual), demo video script

---

## 14. Key Interview Talking Points

1. **Offline-first architecture**: Not a nice-to-have, but essential for public hospitals with unreliable power/network. Event-based sync prevents silent data loss.
2. **Encounter-centric model**: Unlike a simple FIFO queue, this system models the full patient journey (registration → verification/approval/payment → consultation → completion), making it extensible to other departments or workflows.
3. **Conflict-free sync**: Idempotent events + version checking mean two staff devices can work offline and reconnect without corrupting the queue.
4. **Privacy and audit**: Every action is logged with actor, timestamp, and reason. Supports the audit requirements of Nigerian health data law (NDPA 2023).
5. **Honest scope**: Verification, approval, and payment are **manual toggles in the MVP**, not fake integrations. This is clearer than pretending to call a real NHIA API and failing silently.
6. **Serverless + DynamoDB**: Cost-efficient for a public hospital; scales from 10 to 10,000 patients/day without manual DB tuning.

---

## References

- Nigerian public-hospital GOPD workflows: [OUTPATIENT QUEUING MODEL DEVELOPMENT FOR ...](https://ijseas.com/volume2/v2i4/ijseas20160404.pdf)
- NHIA operational guidelines and benefits: [NHIA Official](https://www.nhia.gov.ng/operational-guideline/)
- HMO accreditation and billing: [STEPWISE PROCEDURE FOR HMOs ACCREDITATION](https://www.nhia.gov.ng/download/stepwise-procedure-for-hmos-accreditation/)
- Nigeria Data Protection Act 2023: [NDPA 2023 Compliance](https://dawahq.com/blog/ndpa-compliance-healthcare)
- National Health Act (patient confidentiality): [Patient Data Confidentiality in Nigeria](https://thehealthlawnetworkui.wordpress.com/2026/08/16/patient-data-confidentiality-in-nigeria-ndpa-hospital-culture-and-the-future-of-records/)

---

**PRD Status**: ✅ Locked for 14-day MVP build  
**Next step**: Day 4 — Offline Sync Strategy detailed specification
