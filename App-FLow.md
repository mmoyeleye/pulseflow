# App Flow
## Hospital Patient Flow Management System

### Patient Journey

1. **Arrival & Check-in**
   - Patient arrives at GOPD
   - Receptionist opens check-in form
   - Patient enters: name, phone, insurance type
   - System generates unique patient ID
   - Patient receives queue number

2. **Queue Management**
   - Patient can check status anytime via patient ID
   - Shows: current stage, queue position, estimated wait time
   - Queue refreshes every 5 seconds

3. **Clinical Processing**
   - Staff sees queue dashboard (real-time)
   - For CASH: Registration → Payment → Consultation
   - For NHIA/HMO: Verification → Approval → Consultation
   - For EMERGENCY: Triage → Consultation (priority)

4. **Completion**
   - Doctor marks consultation complete
   - Patient record updated
   - Next patient automatically moved to top of queue

### Staff Workflow

1. **Reception Staff**
   - Click "Check In"
   - Enter patient details
   - Select insurance type and urgency
   - System assigns queue number
   - Displays to patient

2. **Verification/Payment Staff**
   - View patients in VERIFICATION or PAYMENT stage
   - Mark as verified/paid with reference number
   - Patient moves to next stage

3. **Clinical Staff**
   - View CONSULTATION-ready queue
   - Click "Call Next Patient"
   - Patient status updates to CALLED
   - Start consultation
   - Mark complete when done

4. **Emergency Escalation**
   - Receptionist flags as EMERGENCY
   - Triage staff confirms
   - Emergency patient jumps queue
   - Prioritized for immediate consultation

### Offline Capability

1. **When Network is Down**
   - All actions (check-in, status updates) recorded locally
   - App shows "offline mode" indicator
   - Queue shows "last synced at" timestamp

2. **When Network Returns**
   - All pending actions auto-sync
   - Conflicts flagged for supervisor review
   - No data is lost

### State Transitions
CHECKED_IN
↓
[Insurance-specific stages]
↓
CALLED
↓
IN_CONSULTATION
↓
COMPLETED


Alternative states: ON_HOLD, NO_SHOW, CANCELLED, ERROR_REVIEW