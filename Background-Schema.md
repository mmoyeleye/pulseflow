# Background Schema
## Hospital Patient Flow Management System

---

## DynamoDB Single-Table Design

### Primary Key Structure

**Partition Key (PK):** DEPT#GOPD#DATE#{date}
**Sort Key (SK):** PATIENT#{patientId}

This allows querying all patients for a department on a given date.

---

## Core Entities

### Encounter (Main Entity)

{
PK: “DEPT#GOPD#DATE#2026-10-12”,
SK: “PATIENT#pat-1728750000”,

// Identifiers
patientId: “pat-1728750000”,
encounterId: (same as patientId),

// Demographics
displayName: “Chioma Okafor”,
phone: “08012345678”,
idNumber: null,

// Insurance & Urgency
coverageType: “CASH” | “NHIA” | “HMO” | “EMERGENCY”,
urgency: “ROUTINE” | “URGENT” | “EMERGENCY”,

// Pathway
pathwayTemplate: [“REGISTRATION”, “PAYMENT”, “CONSULTATION”, “COMPLETED”],
currentStage: “REGISTRATION”,

// Status & Queue
status: “CHECKED_IN” | “CALLED” | “IN_CONSULTATION” | “COMPLETED”,
queueNumber: 5,
queuePriority: 0 (emergency) | 1 (routine),
queueSequence: “2026-10-12T14:32:00Z”,
position: 3,

// Versioning (optimistic concurrency)
version: 1,

// Metadata
createdAt: “2026-10-12T14:32:00Z”,
lastUpdatedAt: “2026-10-12T14:35:00Z”,
lastUpdatedBy: “RECEPTION”,

// GSI for queue queries
GSI1PK: “DEPT#GOPD#DATE#2026-10-12#QUEUE”,
GSI1SK: “1#2026-10-12T14:32:00Z”
}


### Events Table (Offline Sync)

{
eventId: “evt-uuid-123”,
encounterId: “pat-1728750000”,
eventType: “EncounterCreated” | “StageStarted” | “PatientCalled” | “ConsultationCompleted”,

actorRole: “RECEPTION” | “VERIFICATION” | “CASHIER” | “CLINICAL”,
actorDeviceId: “device-abc123”,

createdAtDevice: “2026-10-12T14:32:00Z”,
receivedAtServer: “2026-10-12T14:32:05Z”,

idempotencyKey: “dev-abc123-seq-001”,
baseVersion: 0,

payload: {
previousStage: null,
newStage: “REGISTRATION”,
reference: null
},

syncStatus: “PENDING” | “SYNCED” | “CONFLICT” | “FAILED”
}


### Audit Events Table

{
auditId: “audit-uuid-456”,
encounterId: “pat-1728750000”,

actor: “RECEPTION”,
action: “CHECK_IN” | “STAGE_COMPLETED” | “STATUS_CHANGED”,
timestamp: “2026-10-12T14:32:00Z”,

before: { stage: null },
after: { stage: “REGISTRATION” },
reason: null,

device: “device-abc123”
}


---

## Indexes

### Global Secondary Index 1 (GSI1) - Queue Queries

**Purpose:** Query waiting patients ordered by priority then FIFO

- **GSI1PK:** DEPT#GOPD#DATE#2026-10-12#QUEUE
- **GSI1SK:** {queuePriority}#{queueSequence}

Ordering: Priority 0 (emergency) first, then by timestamp (FIFO)

---

## Stage Definitions by Coverage Type

### CASH Patient
1. **REGISTRATION** — Demographic capture
2. **PAYMENT** — Cash collected, receipt issued
3. **CONSULTATION** — Clinical interaction
4. **COMPLETED** — Discharge or referral

### NHIA Patient
1. **VERIFICATION** — NHIA eligibility confirmed (manual MVP)
2. **CONSULTATION** — Clinical interaction
3. **PHARMACY** — Handoff (no dispensing in MVP)
4. **COMPLETED** — Discharge

### HMO Patient
1. **VERIFICATION** — HMO card verified (manual MVP)
2. **APPROVAL** — HMO approval obtained (manual MVP)
3. **CONSULTATION** — Clinical interaction
4. **COMPLETED** — Discharge or referral

### EMERGENCY Patient
1. **TRIAGE** — Clinical staff assess urgency
2. **CONSULTATION** — Clinical interaction (prioritized)
3. **COMPLETED** — Discharge or admission

---

## Field Mappings

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| patientId | String (UUID) | pat-1728750000 | Unique, immutable |
| displayName | String | Chioma Okafor | For privacy, no full display |
| phone | String | 08012345678 | Masked in staff views |
| coverageType | Enum | CASH, NHIA, HMO, EMERGENCY | Immutable per encounter |
| urgency | Enum | ROUTINE, URGENT, EMERGENCY | Can change after triage |
| currentStage | String | REGISTRATION | Depends on pathway |
| status | Enum | CHECKED_IN, CALLED, ... | Master status |
| queueNumber | Integer | 5 | Unique per day |
| version | Integer | 1 | For optimistic locking |
| createdAt | ISO8601 | 2026-10-12T14:32:00Z | Server timestamp |

---

## Query Patterns

### Get today's queue for GOPD

Query: PK = “DEPT#GOPD#DATE#2026-10-12”
Result: All patients for that day


### Get waiting queue (priority-ordered)

Query: GSI1PK = “DEPT#GOPD#DATE#2026-10-12#QUEUE”
Order: By GSI1SK (0 first, then timestamp)
Result: Emergency patients first, then FIFO


### Get one patient

Query: PK = “DEPT#GOPD#DATE#2026-10-12” AND SK = “PATIENT#pat-123”
Result: Single encounter


---

## Offline Sync Strategy

- **Events are immutable append-only**
- **Idempotency keys prevent duplicate application**
- **Version number enables conflict detection**
- **Supervisor resolves conflicts explicitly (not silent overwrite)**