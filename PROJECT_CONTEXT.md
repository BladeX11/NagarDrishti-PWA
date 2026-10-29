# NagarDrishti — Complete Project Context & Architectural Blueprint

## 1. Executive Summary

NagarDrishti is an accountability-centric civic issue reporting, triage, and resolution platform. Unlike conventional grievance portals (e.g., CPGRAMS, Swachhata) that function as passive complaint drop-boxes, NagarDrishti is architected to be actively adversarial to bureaucratic inertia, fraudulent ticket closures, and systemic service inequity across socioeconomic wards.

The system combines:
1. An installable, offline-first citizen Progressive Web App (PWA).
2. A desktop-optimized municipal officer and triage dashboard.
3. A public transparency portal featuring live spatial maps and department scorecards.
4. A research and audit workspace with reproducible AI benchmarks and human annotation workflows.

---

## 2. Core Architectural Pillars

### 2.1 Forced Transparency Engine (FTE)
- **Cryptographic Hash-Chain Ledger:** Every status transition (Open -> Triaged -> Assigned -> In Progress -> Claimed Resolved -> Verified Fixed) generates an immutable entry in the `status_events` table. Each event cryptographically chains `prev_hash` to `event_hash` (SHA-256), creating a tamper-evident audit trail.
- **Inaction Amplification:** Issues exceeding Service Level Agreement (SLA) deadlines without valid officer intervention automatically escalate in visibility, populating the public SLA Breach Wall and decaying department transparency scores.
- **Transparency Accountability Score (TAS):** Computed metrics assessing resolution speed, citizen verification confirmation rates, reopen frequencies, and SLA compliance per department and ward.

### 2.2 Adversarial Proof Detection
Guards against fraudulent resolution claims through automated detection rules (`adversarialService.ts`):
- **Photo Reuse:** Computes perceptual image hashes (pHash/dHash) to flag identical resolution photos reused across distinct issues.
- **Temporal Impossibility:** Flags issues marked "Resolved" within minutes of assignment where physical repairs would realistically require hours or days.
- **GPS Mismatch:** Validates the distance between the issue coordinates and the officer resolution upload location against an acceptable threshold.
- **Bulk Closure Anomaly:** Detects statistical spikes where a single officer closes anomalous numbers of tickets in rapid succession.

### 2.3 Socioeconomic Ward Equity
Monitors whether municipal responsiveness correlates with ward affluence:
- Compares median resolution times, citizen confirmation rates, and pending ticket age across slum/low-income, middle-class, and affluent zones.
- Surfaces actionable disparity metrics in `equityService.ts` to identify underserved communities.

### 2.4 Cross-Category Cascade Detection
Detects interrelated municipal failures sharing an underlying root cause (`cascadeService.ts`):
- Uses spatio-temporal clustering (Haversine distance and temporal proximity) across different issue categories (e.g., water supply leaks leading to road damage and sewage overflows).
- Implements spatial proximity deduplication: updates existing active cluster alerts rather than inserting duplicate alerts on repeated periodic scans.

### 2.5 Explainable AI & Human Abstention
- Predicts category (8 approved taxonomies) and urgency priority (1 to 4) using multilingual text normalization (English, Hindi, Marathi).
- Employs calibrated confidence scoring (Platt scaling / temperature scaling) and Expected Calibration Error (ECE) measurement.
- **Abstention Gate:** When prediction confidence falls below reliability thresholds or cases present high risk, the AI explicitly abstains and routes the ticket to manual human officer review.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Leaflet / React-Leaflet |
| **PWA Layer** | Service Worker (`client/public/sw.js`), Web App Manifest, IndexedDB offline submission queue (`offlineQueue.ts`) |
| **Backend** | Node.js, Express, TypeScript, Drizzle ORM |
| **Database & Cache** | PostgreSQL (relational schema, PostGIS-ready coordinate columns), Redis |
| **Storage & Push** | Dual-mode Object Storage (AWS S3 client with local disk fallback in development), Web Push VAPID (`web-push`) |
| **Deployment** | Docker (`Dockerfile`, `docker-compose.prod.yml`), Caddy reverse proxy (`Caddyfile`) |

---

## 4. Repository Structure (`NagarDrishti-app`)

```text
NagarDrishti-app/
├── nagardrishti-frontend/
│   ├── client/
│   │   ├── public/
│   │   │   ├── icons/                 # PWA icons (192px, 512px, SVG)
│   │   │   ├── manifest.json          # Web App Manifest
│   │   │   └── sw.js                  # Service worker (app shell caching & push handler)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── auth/              # AuthGate (OTP & demo login)
│   │       │   └── shared/            # IssueCard, MapView, MetricCard, Primitives
│   │       ├── data/                  # Seed datasets & live data fallbacks
│   │       ├── hooks/                 # useIsMobile, custom hooks
│   │       ├── layouts/               # Citizen, Officer, Public, Research layouts
│   │       ├── lib/                   # API client bindings
│   │       ├── pages/
│   │       │   ├── citizen/           # Report flow, Explore, My Reports, CitizenIssueDetail
│   │       │   ├── officer/           # Triage queue, Officer overview, Proof review
│   │       │   ├── research/          # Annotation workspace, Live evaluation metrics
│   │       │   └── transparency/      # Public map, Scorecards, SLA breach wall
│   │       ├── pwa/                   # IndexedDB drafts & offline upload queue
│   │       └── types/                 # Frontend TypeScript contracts
│   ├── server/
│   │   ├── ai/                        # Categorization, confidence calibration, graph builder
│   │   ├── db/                        # Drizzle schema, migrations, seed data, clear scripts
│   │   ├── evaluation/                # Deterministic benchmark runner, annotation service
│   │   ├── middleware/                # Session auth, role verification, request logging
│   │   ├── routes/                    # issues, auth, officer, transparency, research, notifications
│   │   └── services/                  # issueService, objectStorage, notificationService, etc.
│   ├── deploy/                        # Production Caddyfile & runbooks
│   └── docs/                          # Runbooks, reproducibility contracts, team task breakdown
├── plans/                             # Master architecture plans and session logs
├── MISTAKES.md                        # Lessons learned and solved failure modes
└── PROJECT_CONTEXT.md                 # This project context document
```

---

## 5. Summary of Recent GitHub Updates (`f1d3b80`)

The latest commits pulled into `main` (`4bf7b02`, `fa09b62`, `f1d3b80`) introduced:

1. **PWA Offline Resilience:**
   - IndexedDB store (`nagardrishti-pwa`) managing report drafts (`drafts`) and pending submissions (`submission-queue`).
   - Service worker cache strategies and push event handlers deep-linking into specific reports.
2. **Production Authentication Gate:**
   - `AuthGate.tsx` supporting email/SMS OTP verification with rate limits and session cookie enforcement.
   - Preserved development role switching when `import.meta.env.DEV` is active.
3. **Issue Graph Edge Construction:**
   - `server/ai/graph.ts` linking duplicate and related issues into connected components using Haversine distance (< 1500m), text Jaccard similarity, and temporal decay.
4. **Deterministic Evaluation & Annotation Workspace:**
   - `server/evaluation/runner.ts` providing macro-F1, ECE, Brier score, and selective-risk metrics against frozen benchmarks.
   - `AnnotationWorkspace.tsx` and `EvaluationMetrics.tsx` for multi-annotator blind labeling and agreement tracking.
5. **Storage & Notification Services:**
   - `objectStorage.ts` providing seamless S3 upload capabilities with private-by-default access.
   - `notificationService.ts` dispatching VAPID push updates on status changes.
6. **Production Deployment Suite:**
   - `Dockerfile`, `docker-compose.prod.yml`, and `Caddyfile` for automated HTTPS and reverse proxying.

---

## 6. Local Feature Branch: `feature/phase-5-cascade-equity`

The local work committed on `feature/phase-5-cascade-equity` contains:
- **`cascadeService.ts` & spatial deduplication:** Cluster detection and Haversine update logic to prevent duplicate database rows.
- **`equityService.ts`:** Statistical distribution of resolution times and confirmation rates across socioeconomic ward types.
- **MapView cascade overlay:** Zone rendering on Leaflet maps with diagnostic issue counts.
- **Unit test suite:** Comprehensive tests in `tests/cascadeService.test.ts`, `tests/equityService.test.ts`, and `tests/adversarialService.test.ts`.

---

## 7. Database Entity Schema Summary

- **`issues`:** Core complaint entity (title, description, category, publicRef, location coordinates, status, SLA deadline, proofState).
- **`status_events`:** Hash-chain ledger tracking all status changes with previous and current cryptographic hashes.
- **`adversarial_flags`:** Audit records flagged by heuristic rules (PHOTO_REUSE, TEMPORAL, GPS_MISMATCH, BULK_CLOSURE).
- **`cascade_alerts`:** Spatio-temporal clusters representing interconnected infrastructure failures.
- **`issue_graph_edges`:** Semantic and spatial relationships between issue pairs.
- **`model_predictions`:** Record of AI module predictions, calibrated confidence, and human overrides.
- **`push_subscriptions`:** User endpoints and VAPID keys for browser push notifications.
- **`evaluation_annotations`:** Human ground-truth labels for research benchmarking.

---

## 8. Operating Principles & Next Steps

1. **Data Integrity:** Never overwrite existing model predictions or status events; always append new events or overrides.
2. **Verification First:** Tickets remain in `Claimed Resolved` until confirmed by citizen vote or automated proof verification passes.
3. **Integration Plan:** Rebase or merge `feature/phase-5-cascade-equity` into `main` to unify the Phase 5 cascade/equity services with the newly pulled PWA dashboard infrastructure.
