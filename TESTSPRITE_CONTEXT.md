# TestSprite Application Context: NagarDrishti Platform

## 1. Project Overview & Test Environment
- **Project Name:** NagarDrishti (CivicLens)
- **Description:** Accountability-centric civic grievance platform with an offline-first Citizen PWA, Municipal Officer Triage Dashboard, Public Transparency Portal, and cryptographic audit ledger.
- **Frontend URL:** http://localhost:3000
- **Backend API Base URL:** http://localhost:5000/api
- **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, Express, PostgreSQL, Drizzle ORM.
- **Authentication Mode:** Development/Demo mode supported.
  - Citizen Demo: Pre-seeded in localStorage with `demo_role: 'citizen'`, or request header `x-demo-role: citizen`.
  - Officer Demo: Header `x-demo-role: officer` or role selector on `/officer`.
  - Admin/Triage Demo: Header `x-demo-role: triage_lead`.

---

## 2. User Roles & Access Hierarchy
1. **Citizen:** Reports civic issues with photos and GPS coordinates, tracks submitted reports, supports nearby duplicate complaints, and votes to verify or dispute claimed resolutions.
2. **Municipal Officer:** Reviews triage queues, accepts assignments, transitions tickets through progress stages, logs work notes, and uploads proof-of-work evidence for resolution.
3. **Public Visitor:** Explores public maps, reviews privacy-redacted complaint timelines, and inspects ward scorecards and SLA breach walls without logging in.
4. **Researcher / Admin:** Inspects AI categorization calibration, cross-category cascade clusters, and cryptographic hash-chain audit ledgers.

---

## 3. Application Route Map
- `/` — Landing hero page routing users to Citizen, Officer, or Transparency portals.
- `/citizen` — Citizen home dashboard showing active reports and quick actions.
- `/citizen/explore` — Interactive map of reported neighborhood issues with category filters.
- `/citizen/report` — Multi-step report wizard (Category, Description, Photo upload, Location pin).
- `/citizen/my-reports` — Personal issue history with filterable status tabs.
- `/citizen/issue/:id` — Issue detail page displaying cryptographic timeline and support count.
- `/citizen/issue/:id/verify` — Resolution verification voting (Fixed, Not Fixed, Unsure).
- `/citizen/settings` — Preferences, language selection (English, Hindi, Marathi), and offline sync.
- `/officer` — Officer overview dashboard with triage KPI cards.
- `/officer/queue` — Triage queue table to filter, claim, and assign reported issues.
- `/officer/issue/:id` — Officer issue workbench to update status and submit proof of resolution.
- `/transparency` — Public civic issue map with coarsened coordinates (privacy redaction).
- `/transparency/scorecards` — Ward and departmental accountability scorecards.
- `/transparency/sla-breaches` — Public SLA breach wall highlighting overdue tickets.
- `/transparency/forgotten` — Long-pending unresolved complaints escalated by inaction rules.
- `/research` — Model benchmarks, calibration metrics, and annotation workbench.

---

## 4. Key End-to-End User Workflows for Automated Testing

### Flow 1: Citizen Issue Reporting
1. Navigate to `/citizen/report`.
2. Select category (e.g., Potholes / Road Damage, Garbage / Waste, Streetlight).
3. Enter title and detailed description.
4. Attach photo evidence (file upload).
5. Set location coordinates (defaults to current pin).
6. Verify duplicate detection modal: system checks for existing nearby issues. Citizen can choose "Support Existing" or "Continue Filing".
7. Submit report: confirm redirect to `/citizen/issue/:id` with assigned public reference (e.g. `ND-101`).

### Flow 2: Duplicate Issue Discovery & Community Support
1. Navigate to `/citizen/explore` or `/citizen`.
2. Locate an existing nearby issue card.
3. Click "Support" button.
4. Expectation: Support count increments optimistically by 1, toast notification displays confirmation, and button reflects supported state.

### Flow 3: Officer Triage and Assignment
1. Navigate to `/officer/queue`.
2. Filter open complaints by Department or Ward.
3. Open an issue with status `Open`.
4. Update status to `Triaged` and assign to an officer.
5. Transition status to `In Progress` with an estimated SLA completion date.
6. Verify status change reflected on issue timeline.

### Flow 4: Claimed Resolution & Proof Submission
1. In `/officer/issue/:id`, set status to `Claimed Resolved`.
2. Enter work summary notes and attach resolution proof photo.
3. Submit update: status transitions to `Claimed Resolved`.
4. System triggers citizen verification window.

### Flow 5: Citizen Resolution Verification Voting
1. Navigate to `/citizen/issue/:id/verify`.
2. Review before and after photographic evidence.
3. Cast vote:
   - "Fixed" increments verified count.
   - "Not Fixed" logs dispute; reaching dispute threshold reopens issue to `In Progress`.
   - "Unsure" records neutral feedback.
4. Confirm vote tally updates reactively without page crashes.

### Flow 6: Public Transparency & Privacy Verification
1. Navigate to `/transparency`.
2. Verify map renders civic issue clusters.
3. Open any issue card: verify exact citizen name and exact GPS coordinates are coarsened/redacted for privacy.
4. Navigate to `/transparency/scorecards`: verify department resolution rates and reopen frequencies display properly.

---

## 5. Critical Edge Cases & Test Assertions
- **Empty Description Validation:** `/citizen/report` must block submission when description is empty.
- **Offline Sync:** When network is disabled, submitting a report queues it in IndexedDB and updates UI with pending sync indicator.
- **Verification Vote API Null Safety:** Voting on issue must handle JSON response safely without throwing `Unexpected end of JSON input`.
- **Demo User UUID Mapping:** Ensure API calls pass valid UUID or `x-demo-role` headers so PostgreSQL FK checks succeed.
- **Audit Ledger Integrity:** Every status update must link `prev_hash` to `event_hash` (SHA-256).
