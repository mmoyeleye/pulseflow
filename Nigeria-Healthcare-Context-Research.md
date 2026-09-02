# Nigeria Healthcare Systems — Context & Research for pulseflow MVP

**Purpose**: Reference guide for realistic Nigerian GOPD workflows, NHIA/HMO operations, and regulatory requirements.  
**Audience**: Portfolio project, interviews, hospital discovery conversations.  
**Last updated**: August 2026

---

## 1. Nigerian Public-Hospital GOPD Workflows

### What a realistic GOPD flow looks like

From research on Nigerian public hospitals (Abuja, Lagos, Ibadan), a typical GOPD day includes:

1. **Patient arrival**: Walk-in only (no appointments in most public facilities)
2. **Registration/check-in**: Record name, phone, address; retrieve or create a patient folder
3. **Coverage classification**: Identify payment method (NHIA, HMO, cash, free treatment)
4. **Administrative processing**:
   - NHIA: Verify card/eligibility (often manual, no real-time API)
   - HMO: Verify enrollment, plan, and benefit coverage
   - Cash: Collect registration fee and estimate treatment cost
5. **Triage/vital signs** (if applicable): Some facilities do this before consultation; others after
6. **Queue assignment**: Issue a tally number (e.g., "You are number 23")
7. **Clinical consultation**: Nurse or doctor sees patient
8. **Disposition**:
   - Pharmacy (outpatient medication)
   - Referral (to specialty, imaging, lab)
   - Admission (inpatient)
   - Review appointment (follow-up)
   - Discharge (no further action)

### Key workflow variations

- **New vs. returning patients**: Returning patients may have existing folders; new patients need registration and folder creation
- **Manual records**: Many facilities still use paper folders alongside any digital system
- **No real-time verification**: NHIA and HMO verification is often manual (staff calls a phone number or checks a printed list)
- **Queue discipline**: FCFS (first-come, first-served) for routine; emergency cases may skip to the front
- **Rush hours**: Morning (7–10 AM) is typically busiest; afternoon quieter
- **Staffing variability**: One clinician, one nurse, and one receptionist is common; larger facilities may have more

### Challenges documented in research

- **Wait times**: 2–3 hours or more common in busy public facilities
- **Lost records**: Paper folders can be misplaced; digital records lost during power outages
- **Duplicate registrations**: Patient registered twice if data was lost, leading to billing errors
- **No visibility**: Patients do not know their position or expected wait; staff cannot see the queue at a glance
- **Administrative delays**: Verification and payment steps often bottleneck consultation

---

## 2. NHIA (National Health Insurance Authority)

### What NHIA is

NHIA is Nigeria's national health-insurance framework. It operates as a universal health-coverage scheme with:

- State Health Insurance Schemes (SHISs) at state level
- Healthcare providers (public and private hospitals)
- HMOs (Health Maintenance Organizations) as intermediaries
- Multiple benefit packages and programmes

### How NHIA enrollment works

1. Citizens enroll at their state's SHIS office or through an HMO
2. Each enrollee receives a unique **NHIA card** (physical or digital)
3. The card specifies:
   - Enrollee name and ID
   - Primary health center (PHC) or facility of choice
   - Benefit package (essential health services, primary care, specialist referral)
   - Expiry date (usually annual)

### How NHIA verification works (in practice)

**In theory**: Hospital calls NHIA's verification hotline or logs into a portal to confirm eligibility in real-time.

**In practice** (especially in public hospitals):

- Staff looks up the NHIA card number in a printed list or handbook
- Staff calls a phone number to verify (slow, unreliable)
- Staff assumes the card is valid if it looks genuine (risky)
- No real-time API integration due to connectivity, system unavailability, or lack of IT infrastructure

**For your MVP**: Treat verification as a **manual staff action** with fields:

```
verificationMode: "MANUAL_MVP"
verificationStatus: PENDING | VERIFIED | FAILED
verificationReference: "<NHIA_CARD_NUMBER>"
verifiedBy: "<STAFF_NAME>"
verifiedAt: "<TIMESTAMP>"
verificationNotes: "<REASON_IF_FAILED>"
```

Do not pretend to call an NHIA API; be explicit that you are modeling the manual process.

### Benefit packages and coverage

NHIA offers multiple benefit packages depending on enrollment programme:

- **Essential Health Services**: Basic primary care, maternal health, child health
- **Senior Citizen Programme**: Free healthcare for ages 65+
- **Vulnerable Group Programme**: Care for pregnant women, children under 5
- **Formal Sector Workers**: Through employer contributions

Services may be **excluded** based on package:

- Specialist services (may require referral + pre-approval)
- Imaging or laboratory (may be limited or excluded)
- Pharmacy charges (may be co-payment)
- Elective procedures

Your system should record:

```
coveragePackage: "<PACKAGE_NAME>"
benefitStatus: COVERED | EXCLUDED | REQUIRES_APPROVAL | PARTIAL_COVERAGE
copaymentAmount: "<AMOUNT_IF_APPLICABLE>"
```

### Co-payments and restrictions

Some NHIA programmes include co-payments (patient pays a small amount; NHIA covers the rest). Your system should track:

- Whether co-payment is required
- Amount due
- Whether payment has been collected

---

## 3. HMO (Health Maintenance Organization)

### What HMOs are

HMOs are private health insurance intermediaries. They:

- Negotiate contracts with hospitals and clinics
- Enroll employees and individuals under various plans
- Process benefit verification and pre-authorization
- Handle claims submission and payment to hospitals

Common HMOs in Nigeria:

- ALIKO Dangote
- Hygeia
- NSIA
- Medbury
- Leadway Pensure

### How HMO enrollment and verification work

1. **Enrollment**: Employee or individual enrolled under an HMO plan (e.g., "ALIKO Health Plus 500K")
2. **Plan characteristics**:
   - Covered services (e.g., primary care, specialist referral, hospital admission)
   - Annual limit (e.g., ₦500,000)
   - Co-payment or co-insurance (e.g., patient pays 10%, HMO covers 90%)
   - Primary care provider (PCP) or gateway facility
3. **Verification**: Hospital calls HMO helpline or logs in to verify:
   - Is the member/enrollee registered?
   - Is the plan active?
   - Has the annual limit been exhausted?
   - Is this service covered?

### HMO verification in practice

Like NHIA, HMO verification is often **manual**:

- Staff calls the HMO's customer service line
- Waits on hold (unreliable, slow)
- Manually records the approval code
- No real-time system integration in many public hospitals

**For your MVP**:

```
hmoName: "<HMO_NAME>"
memberNumber: "<MEMBER_ID>"
planName: "<PLAN_NAME>"
verificationStatus: PENDING | VERIFIED | FAILED
approvalStatus: PENDING | APPROVED | UNAPPROVED | LIMIT_EXHAUSTED
approvalReference: "<APPROVAL_CODE>"
approvalExpiryDate: "<DATE>"
approvalNotes: "<SERVICE_COVERED_OR_EXCLUSIONS>"
verifiedBy: "<STAFF_NAME>"
verifiedAt: "<TIMESTAMP>"
```

### Common HMO issues

- **Pre-authorization required**: Some procedures need HMO approval before treatment; verify before consultation
- **Service exclusions**: Patient may be covered for primary care but not admission; clarify before commitment
- **Limit exhaustion**: Annual cap may be reached mid-year; patient becomes liable for remaining costs
- **Delayed claims**: Hospital must submit claims correctly; payment delays are common

---

## 4. Cash Patients

### How cash payment works in Nigerian hospitals

1. Patient is not NHIA or HMO-covered
2. Patient pays directly to hospital for:
   - Registration fee (usually small, ₦100–500)
   - Consultation fee (₦500–2,000 depending on facility and clinician)
   - Procedures, imaging, drugs (additional, variable)
3. Payment may be **before** consultation (most public hospitals) or **after** (some private hospitals)

### Cash workflow in GOPD

**Before consultation** (most common in public hospitals):

```
Check-in → Registration fee collected → Verification (if NHIA/HMO) → Payment for consultation → Consultation → Pharmacy/discharge
```

**After consultation** (less common):

```
Check-in → Consultation → Billing and payment → Pharmacy/discharge
```

Your MVP should support the **before-consultation model** since that's more common in public facilities.

### Cash payment fields for your system

```
paymentStatus: PENDING | PARTIAL | PAID | REFUNDED
amountDue: "<AMOUNT>"
amountPaid: "<AMOUNT>"
paymentMethod: CASH | CARD | BANK_TRANSFER | MOBILE_MONEY
receiptNumber: "<RECEIPT_ID>"
paymentDate: "<TIMESTAMP>"
cashierName: "<STAFF_NAME>"
refundStatus: NONE | PENDING | COMPLETED
refundReason: "<REASON_IF_APPLICABLE>"
```

Do not skip receipt tracking; it's essential for hospital accounting and patient dispute resolution.

---

## 5. Emergency Care

### How emergency is handled in Nigerian GOPDs

Emergency cases are typically identified by:

- **Appearance**: Patient is visibly unwell, bleeding, unconscious, or in distress
- **Chief complaint**: Life-threatening symptoms (chest pain, difficulty breathing, severe trauma)
- **Staff escalation**: Reception staff flags as urgent; clinical staff confirms via triage

### Emergency escalation pathway

```
Arrival
→ Reception staff flags as URGENT/EMERGENCY (not automatic)
→ Immediate triage by nurse or clinician
→ Clinical staff confirms urgency or downgrades to routine
→ If EMERGENCY: skip administrative queues, proceed to treatment area
→ If ROUTINE after triage: join normal consultation queue
```

### Key principle

**Emergency is a clinical decision, not a patient choice.** A patient may claim urgency, but triage staff determines whether true emergency exists.

Your system should:

1. Allow reception staff to flag urgency at check-in
2. Require clinical staff to **confirm** via triage (within 5–10 minutes)
3. Only move patient to emergency priority after clinical confirmation
4. Record who triaged, when, and what urgency category was assigned
5. Prevent administrative delays (verification, payment) from blocking emergency patients

### Emergency fields in your data model

```
urgency: ROUTINE | URGENT | EMERGENCY
triageConfirmed: true | false
triageBy: "<CLINICIAN_NAME>"
triageAt: "<TIMESTAMP>"
triageCategory: "<CATEGORY_IF_APPLICABLE>"
triageNotes: "<CLINICAL_REASON>"
```

---

## 6. NDPA 2023 (Nigeria Data Protection Act)

### Key points for healthcare

The **Nigeria Data Protection Act 2023** replaced the earlier NDPR and established the **Nigeria Data Protection Commission (NDPC)** as the regulator.

For healthcare systems, it requires:

1. **Legal basis for processing health data**: Must have explicit consent or a legal/regulatory purpose
2. **Purpose limitation**: Data collected for queue management cannot be repurposed for other uses without new consent
3. **Data minimization**: Collect only what you need (name, phone, coverage type — not diagnosis, medical history, or NIN unless legally required)
4. **Transparency**: Patients must know what data is collected and how it is used
5. **Access rights**: Patients can request to see their data
6. **Right to deletion**: Patients can request deletion after a defined retention period
7. **Breach notification**: Hospital must notify NDPC and affected patients within 72 hours of a data breach
8. **Data processing agreements**: If you store data with a cloud provider, you need a written DPA

### Practical implications for your system

- **Consent form**: At check-in, obtain patient's explicit consent to collect and process their queue data
- **Privacy notice**: Display a notice explaining what data is collected and retained
- **Retention policy**: Define how long data is kept (e.g., 90 days for active queue, 1 year for archive, then delete)
- **Encryption**: Encrypt patient data in transit (HTTPS) and at rest (DynamoDB encryption)
- **Access control**: Only authorized staff can view patient data; log all access
- **Audit trail**: Maintain audit logs for 1–2 years in case of dispute or investigation
- **Breach response**: Document what you'll do if data is leaked (notify NDPC, affected patients, preserve evidence)

### What NOT to store

Do not store:

- **National Identification Number (NIN)** unless the hospital requires it for other operational reasons (not for queue management alone)
- **Clinical diagnosis or medical history**
- **Prescription or medication information**
- **Allergy or genetic information**
- **HIV/AIDS status or any sensitive health category** (unless the patient's pathway depends on it, e.g., antenatal care)

---

## 7. National Health Act (Confidentiality)

The **National Health Act** (enacted ~2014, ongoing implementation) contains confidentiality obligations:

- Healthcare providers must keep patient information confidential
- Unauthorized disclosure can result in criminal charges
- Patients have a right to access their own health information
- Hospital staff are bound by confidentiality even after leaving employment

### Practical implications

- Train all staff on confidentiality rules
- Do not display full patient names and phone numbers on public-facing queue screens
- Use queue numbers or private codes for patient tracking
- Restrict audit log access to authorized personnel (supervisor, IT, compliance)
- Do not print or email patient lists with sensitive details

---

## 8. Realistic 200-patients-per-day load

### Typical GOPD caseload

A single GOPD in a public hospital might see:

- **Morning (7 AM–12 PM)**: 80–120 patients
- **Afternoon (1 PM–5 PM)**: 40–60 patients
- **Total**: 120–180 patients/day

200/day is a bit high for one clinician; more realistic for a GOPD with 2–3 doctors or multiple departments pooled.

### Staffing for 200/day

- **Reception/registration**: 1–2 staff (takes ~3–5 min per patient)
- **Verification/payment**: 1–2 staff (takes ~5–10 min per patient, depending on coverage type)
- **Triage/vital signs**: 1 nurse (takes ~5 min per patient)
- **Consultation**: 2–3 clinicians (takes 10–20 min per patient depending on case complexity)
- **Pharmacy/handoff**: 1–2 staff

### Queue depth at any given time

If 200 patients check in over an 8-hour day (25/hour) and average consultation time is 15 min:

- At peak (morning), might have 40–60 patients in queue
- In afternoon, might have 20–30 in queue

Your system should handle 100–200 concurrent active encounters comfortably.

---

## 9. Connectivity & Power in Nigerian hospitals

### Power

- **Primary source**: National grid (often unstable, especially outside major cities)
- **Backup**: Generator (common in public hospitals, but fuel costs high)
- **Outage duration**: Can be 30 min to several hours

**Your offline resilience is critical.**

### Network

- **Primary**: Hospital WiFi or mobile data (where available)
- **Mobile networks**: MTN, Airtel, Globacom coverage varies by location
- **Latency**: Mobile networks may have 200–500 ms latency; WiFi often better but not guaranteed
- **Bandwidth**: Rarely a bottleneck for a queue system; outages or dropouts are more common

**Your system must assume intermittent connectivity.**

### Device hardware

- **Tablets**: Common for staff dashboards; often 2–3 year old devices with battery degradation
- **Phones**: Staff may use personal phones; older models with limited storage
- **Kiosk**: A patient-facing check-in kiosk might be a single shared device

**IndexedDB storage limits are real; assume 50 MB per device as a safe maximum.**

---

## 10. Discovery checklist (before real deployment)

When you start working with an actual hospital, ask:

- [ ] What is the current queue management process? (paper, tally, verbal?)
- [ ] How many patients per day? Peak hours?
- [ ] How many staff? Which roles?
- [ ] What % are NHIA, HMO, cash? Do patients sometimes have multiple coverages?
- [ ] How is emergency handled now? Who decides?
- [ ] What are the top 3 operational pain points?
- [ ] Do you have WiFi? Backup power?
- [ ] What devices do staff use? (tablets, phones, laptops?)
- [ ] Do you use any digital system now? (EMR, billing, pharmacy?)
- [ ] What is your data backup process?
- [ ] Do you have compliance/IT staff who can review security?
- [ ] What is the patient demographic? (age, literacy, smartphone ownership?)
- [ ] Are there patients who cannot read/write?
- [ ] Do you have a pharmacy? Lab? Radiology? Do they need visibility into the queue?

These answers will shape your MVP and help you talk credibly about real-world constraints in interviews.

---

## 11. Interview framing

When you discuss this project, you can reference:

> "I researched Nigerian public-hospital GOPD workflows, NHIA and HMO verification (which are often manual, not API-integrated), and cash payment processes. I also factored in NDPA 2023 privacy requirements and the likelihood of power/network outages in public facilities. That's why I designed the system for offline-first operation, modeled administrative verification as manual staff actions rather than fake external integrations, and included a full audit trail."

This shows you've done your homework and understand the real constraints.

---

## References

1. **Nigerian GOPD workflows**:
   - Queuing analysis and patient flow research: [OUTPATIENT QUEUING MODEL](https://ijseas.com/volume2/v4i2/ijseas20160404.pdf)
   - [QUEUING ANALYSIS OF PATIENT FLOW IN OUTPATIENT DEPARTMENT](https://lafiascijournals.org.ng/index.php/fjst/article/download/780/516/)

2. **NHIA**:
   - Official website: https://www.nhia.gov.ng/
   - Operational guidelines: https://www.nhia.gov.ng/operational-guideline/
   - Billing and claims process: https://www.naijahealth.ng/blog/nhia-billing-claims-process-nigerian-hospitals

3. **HMO**:
   - HMO accreditation and procedures: https://www.nhia.gov.ng/download/stepwise-procedure-for-hmos-accreditation/
   - HMO billing guide: https://dawahq.com/blog/hmo-billing-guide-nigeria

4. **NDPA 2023**:
   - Compliance for healthcare: https://dawahq.com/blog/ndpa-compliance-healthcare
   - NDPR vs NDPA changes: https://www.naijahealth.ng/blog/ndpr-vs-ndpa-nigerian-hospitals-2023-changes

5. **National Health Act**:
   - Patient confidentiality obligations: https://thehealthlawnetworkui.wordpress.com/2026/08/16/patient-data-confidentiality-in-nigeria-ndpa-hospital-culture-and-the-future-of-records/

6. **Public health policy**:
   - Federal Ministry of Health: https://health.gov.ng/public-health-policies/

---

**Last reviewed**: August 2026  
**Next update**: Before real hospital deployment
