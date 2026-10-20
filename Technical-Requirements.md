# Technical Requirements Document
## Hospital Patient Flow Management System (GOPD)

**Version:** 1.0  
**Date:** October 2026  
**Project:** Hospital Queue MVP  

---

## 1. System Overview

A digital queue and patient flow management system for Nigerian public hospitals (GOPD). Digitizes patient check-in, queue management, and clinical workflow tracking with offline capability and zero-cost AWS infrastructure.

## 2. Technical Stack

**Frontend:**
- React 18 with Vite
- JavaScript ES6+
- CSS3 (responsive design)
- Fetch API for HTTP communication
- Deployed on CloudFront + S3

**Backend:**
- Node.js 18.x (AWS Lambda)
- DynamoDB (single-table design)
- API Gateway (REST)
- CloudWatch Logs

**Infrastructure:**
- AWS (us-east-1)
- Serverless Application Model (SAM)
- Pay-per-request pricing
- **Estimated cost: $0/month (free tier)**

## 3. Core Lambda Functions

| Function | Endpoint | Purpose |
|----------|----------|---------|
| CheckIn | POST /checkin | Register patient, generate patient ID |
| GetQueue | GET /queue/{dept} | Retrieve waiting patients |
| GetPatient | GET /patients/{id} | Retrieve patient status |
| CallNext | POST /queue/{dept}/call-next | Mark next patient as called |
| UpdateStatus | PATCH /patients/{id}/status | Progress patient through pathway |
| SyncEvents | POST /sync/events | Handle offline sync events |

## 4. Data Models

**Patient Encounter:**
- patientId (unique)
- name, phone, ID number
- coverageType (CASH, NHIA, HMO, EMERGENCY)
- currentStage (pathway-dependent)
- status (CHECKED_IN, CALLED, COMPLETED)
- queueNumber
- version (for optimistic concurrency)
- createdAt, lastUpdatedAt

**DynamoDB Tables:**
1. EncountersTable — patient encounters
2. EventsTable — offline sync events
3. AuditEventsTable — all state changes

## 5. Patient Pathways

- **CASH:** REGISTRATION → PAYMENT → CONSULTATION → COMPLETED
- **NHIA:** VERIFICATION → CONSULTATION → PHARMACY → COMPLETED
- **HMO:** VERIFICATION → APPROVAL → CONSULTATION → COMPLETED
- **EMERGENCY:** TRIAGE → CONSULTATION → COMPLETED (priority queue)

## 6. API Specifications

### Check-in
POST /checkin
- Request: { name, phone, patientType }
- Response: { patientId, status, message }

### Get Queue
GET /queue/GOPD
- Response: { queueLength, queue: [...] }

### Get Patient Status
GET /patients/{patientId}
- Response: { name, position, estimatedWaitMinutes, status }

### Call Next
POST /queue/GOPD/call-next
- Response: { calledPatient: {...} }

### Update Status
PATCH /patients/{patientId}/status
- Request: { expectedVersion }
- Response: { previousStage, currentStage, version }

## 7. Non-Functional Requirements

- **Performance:** <500ms API response (p95)
- **Scalability:** 200+ patients/day, 50+ concurrent users
- **Availability:** 99.5% uptime (AWS SLA)
- **Data durability:** 99.999999999% (DynamoDB)
- **Response times:** Queue load <1s, patient lookup <200ms
- **Offline capability:** 30+ minutes without network

## 8. Security

- CORS enabled for localhost (dev) and CloudFront (prod)
- HTTPS enforced on all endpoints
- No authentication in MVP (labeled as prototype-only)
- Data encryption at rest (DynamoDB default)
- Audit trails for all status changes

## 9. Compliance

- **NDPA 2023:** Data minimization, purpose limitation, breach notification (72h)
- **National Health Act:** Confidentiality, no unauthorized disclosure
- **Data retention:** 90 days for encounters, 365 days for audit

## 10. Success Criteria

- [✓] All 6 Lambda functions deployed and responding
- [✓] React frontend loads <2s
- [✓] Queue updates within 5s of patient check-in
- [✓] 100% patient data persists in DynamoDB
- [✓] CORS working from localhost to API
- [✓] All endpoints tested with real data
- [✓] Clean Git history with clear commits