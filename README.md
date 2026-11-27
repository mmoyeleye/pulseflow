# GOPD Patient Flow

A lightweight, offline-capable queue system for Nigerian public-hospital General Outpatient Departments (GOPD) — built to replace paper queue slips and shouted names with a shared, priority-ordered view that patients, reception and clinical staff all see in real time.

> **Status:** working MVP, tested at 200 check-ins/day. Not yet authenticated — see [Security & Known Limitations](#security--known-limitations) before using this with real patient data.

---

## The problem

Public-hospital GOPDs in Nigeria commonly run on paper folders and tally numbers, with no shared view of who is waiting, no reliable way for an emergency case to be seen out of turn, and no recovery path when the network or power drops mid-shift. Patients routinely wait 2–3 hours with no visibility into their position. This project replaces the paper queue with a digital one — without pretending to be a full hospital information system.

## What it does

- **Patients** check in once with a name and phone number, get a permanent card number, and can look up their live queue position and estimated wait from any browser.
- **Reception** registers a patient in under a minute, with validation against duplicate same-day check-ins and malformed phone numbers.
- **Clinical staff** see one shared, priority-ordered queue — emergency patients are always shown ahead of routine ones — and call the next patient or mark a consultation complete with a single tap. A version-checked conditional update means two staff members can never call or complete the same patient twice.
- **The whole app works offline.** It installs as a Progressive Web App; a dropped connection queues a Call Next or Mark Completed action locally and syncs it automatically the moment the connection returns, with no action lost and no re-entry needed.

## Architecture

```
React PWA  →  API Gateway (REST)  →  5 Lambda functions (Node.js 18)  →  DynamoDB (single table + GSI1)
   │
   └── Service worker (cached app shell) + IndexedDB (offline action queue + sync engine)
```

- **Frontend:** React 18 + Vite, installable as a PWA (Workbox via `vite-plugin-pwa`), shared queue state via Context + `useReducer`, polling paused on hidden tabs.
- **API:** Amazon API Gateway (REST), CORS-enabled, stage-throttled (50 req/s overall, 10 req/s on check-in).
- **Compute:** Five Node.js 18 Lambda functions — `check-in`, `get-queue`, `get-patient`, `call-next`, `update-status` — each with an IAM role scoped to only the DynamoDB actions it performs.
- **Data:** A single DynamoDB table (`hospital-queue-encounters-dev`) holding patient profiles, daily encounters and a per-day queue counter, with a GSI sorting the live queue by priority then check-in time. On-demand billing — no capacity to provision or outgrow.

Full diagram and every endpoint's request/response shape: [`docs/GOPD-Architecture-and-API-Reference.docx`](docs/GOPD-Architecture-and-API-Reference.docx).

## Tech stack

| Layer                  | Choice                                                   |
| ---------------------- | -------------------------------------------------------- |
| Frontend               | React 18, Vite, vite-plugin-pwa, idb (IndexedDB wrapper) |
| API                    | Amazon API Gateway (REST)                                |
| Compute                | AWS Lambda, Node.js 18.x                                 |
| Data                   | Amazon DynamoDB (single-table design, on-demand)         |
| Infrastructure as Code | AWS SAM                                                  |

## Getting started

Prerequisites: an AWS account, AWS CLI v2, AWS SAM CLI, Node.js 18.x.

```bash
# 1. Deploy the backend
sam build -t template-api-only.yaml
sam deploy --template-file .aws-sam/build/template.yaml \
  --stack-name pulseflow-mvp --region us-west-2 \
  --capabilities CAPABILITY_IAM --resolve-s3 --confirm-changeset

# 2. Configure and run the frontend
cd frontend
npm install
echo "VITE_API_URL=<APIEndpoint from the deploy output>" > .env.local
npm run dev
```

Full step-by-step instructions, plus a troubleshooting section for every deployment error actually hit while building this (missing GSI, CORS, stale API URLs, `uuid` ESM issues, throttling) are in [`docs/GOPD-Deployment-Guide.docx`](docs/GOPD-Deployment-Guide.docx).

To test the offline/PWA behaviour specifically, use a production build (`npm run build && npm run preview`) — the service worker is inactive under `npm run dev`.

## Project structure

```
backend/lambdas/
  checkin/          # POST /checkin
  get-queue/        # GET /queue/{dept}
  get-patient/      # GET /patients/{id}
  call-next/        # POST /queue/{dept}/call-next
  update-status/    # PATCH /patients/{id}/status
frontend/
  src/components/   # CheckInForm, StaffDashboard, PatientStatus, PatientCard, Nav
  src/context/      # QueueContext — shared queue state + polling
  src/offline/      # IndexedDB action queue + sync engine
  src/services/     # api.js — thin fetch wrapper
template-api-only.yaml   # AWS SAM template
docs/                     # Architecture, API reference, deployment guide, user manual, demo script, final report
```

## API summary

| Method & path                  | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `POST /checkin`                | Register a patient; returns a card number and queue number       |
| `GET /queue/{dept}`            | The live, priority-ordered waiting list                          |
| `GET /patients/{id}`           | A single patient's current status and queue position             |
| `POST /queue/{dept}/call-next` | Call the next eligible patient (conditional update, race-safe)   |
| `PATCH /patients/{id}/status`  | Mark a called patient's consultation completed (version-checked) |

Full request/response shapes and error codes: [`docs/GOPD-Architecture-and-API-Reference.docx`](docs/GOPD-Architecture-and-API-Reference.docx).

## Testing

A 200-check-in load test (10 concurrent requests) passed in full: 200/200 registrations succeeded, all 33 emergency patients in the run were ordered ahead of routine patients, queue positions numbered correctly across a 601-patient queue, and duplicate/invalid-input checks returned the expected `409`/`400`. Median latency 646 ms, p95 in the 2.1–2.8 s range. Full results and the defect log from testing: [`docs/Day9-Test-Report.docx`](docs/Day9-Test-Report.docx).

There is no automated unit or integration test suite yet — testing to date has been a combination of the load-test script (`loadtest.mjs`) and manual end-to-end verification, including a simulated offline/reconnect flow.

## Security & known limitations

This is a working prototype, not a production system. Before it touches real patient data:

- **No authentication.** The API accepts requests from any origin with no login — acceptable for a local, trusted-network prototype only.
- **Offline check-in isn't queued.** Only _Call Next_ and _Mark Completed_ are offline-capable; registering a new patient still requires a live connection.
- **Emergency priority is self-selected**, not confirmed by a clinician at triage — a receptionist's selection goes straight to top-of-queue.
- **Date handling uses UTC**, so visits between midnight and 1am Lagos time can fall on the "wrong" day.
- **Status lookup only searches today's visits**, and there's no lookup by card number yet.
- **Patient details aren't masked** on the staff dashboard — name and phone number are shown together on the same card.
- No role-based access, no audit trail, no supervisor/conflict-resolution tooling, and no automated test suite.

The full, longer list — including what the original research PRD called for versus what the 14-day build actually shipped — is in [`docs/GOPD-Final-Project-Report.docx`](docs/GOPD-Final-Project-Report.docx).

## Documentation

| Document                                                                      | Covers                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Architecture & API Reference](docs/GOPD-Architecture-and-API-Reference.docx) | System diagram, every endpoint, every status/error code                       |
| [Deployment Guide](docs/GOPD-Deployment-Guide.docx)                           | Build/deploy steps and real troubleshooting for every error hit along the way |
| [User Manual](docs/GOPD-User-Manual.docx)                                     | How-to for reception, clinical staff, and patients                            
| [Day 9 Test Report](docs/Day9-Test-Report.docx)                               | Load test results and the defect log from testing                             |
| [Final Project Report](docs/GOPD-Final-Project-Report.docx)                   | The 14-day build journey, test summary, and known-limitations table           |

## Author

**Muntasir Oyeleye**
[GitHub](https://github.com/mmoyeleye) · [LinkedIn](https://www.linkedin.com/in/muntasir-oyeleye)
