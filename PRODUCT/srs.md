# Software Requirements Specification
## NagarDrishti MVP — IEEE-830-flavoured specification

## 1. Introduction
### 1.1 Purpose
This specification defines testable requirements for NagarDrishti, a mobile-first civic grievance transparency prototype. It is the engineering baseline for the citizen PWA, public transparency views, mock officer console, administration tools, AI modules M1–M7, and supporting API/data services. Requirements use “shall” for mandatory MVP behaviour and “may” for optional implementation choices.

### 1.2 Scope
NagarDrishti enables photo-first reporting of eight civic issue categories, duplicate-aware support, a public privacy-preserving issue map, a controlled officer status/proof workflow, citizen verification of claimed fixes, scorecards, SLA visibility, and a tamper-evident event history. It does not integrate with a live municipal system, score individual officers, make legal/diagnostic decisions, audit treasury expenditure, or provide a native iOS application.

### 1.3 Definitions and Acronyms
| Term | Meaning |
|---|---|
| PWA | Progressive Web App, the mobile-first client. |
| OTP | One-time password used for citizen authentication in the MVP. |
| JWT | Signed JSON Web Token carrying user identity and role claims. |
| SLA | Configured target time for acknowledgement/progress/resolution; demo policy, not a legal guarantee. |
| H3 cell | Hexagonal spatial index used for coarse public location representation. |
| PostGIS | PostgreSQL geospatial extension used for points, ward polygons, and proximity queries. |
| M1–M7 | AI modules defined in Section 3.1 and `ai-module-specs.md`. |
| Canonical complaint | The surviving record after duplicate merge; merged records retain history. |
| Proof of fix | Officer-provided after-media supporting a `claimed_resolved` status. |
| Verified fixed | Final status reached only through the verification workflow, not officer assertion alone. |

### 1.4 References
- `project-brief.md` — authoritative project concept, scope, terminology, and AI module list.
- `prd.md` — product requirements and MVP sequencing.
- `system-architecture.md`, `data-model-schema.md`, `api-spec.md`, `ai-module-specs.md`, `ui-ux-screens.md` — controlled design companions in this pack.

## 2. Overall Description
### 2.1 Product Perspective
The product is a standalone demonstrator that can run with public, synthetic, and self-collected data. It consists of a PWA/public web client, REST API, relational/geospatial store, object storage, asynchronous AI worker, scheduled analytics, mock officer console, and admin console. A municipal adapter seam exists but no external backend is required.

### 2.2 Product Functions
| Function group | Summary |
|---|---|
| Identity and consent | OTP-style citizen access; role claims; explicit location/media consent. |
| Complaint intake | Photo/text/optional voice, approximate location, AI suggestions, editable category/department/urgency. |
| Issue discovery | Nearby active issues, one-tap support, public map and redacted details. |
| Case workflow | Triage, assignment, lifecycle transitions, immutable event chain. |
| Proof and verification | Proof upload, M5 authenticity signals, eligible verification voting, auto-reopen threshold. |
| Analytics | SLA breach feed, forgotten ranking, ward/department scorecard snapshots, M6 flags. |
| Safety/governance | Abuse reports, moderation, audit log, exports with privacy redaction. |

### 2.3 User Classes and Characteristics
| Class | Characteristics | Privileges |
|---|---|---|
| Public visitor | Unauthenticated, may be low-bandwidth/mobile. | Read only redacted public data and exports. |
| Citizen | OTP-authenticated reporter/supporter; may have low digital literacy. | Create own complaints, upload own media, support, vote when eligible, view own detail. |
| Officer | Mock role for controlled demonstration. | View queue, assign within allowed scope, status updates, proof upload. |
| Admin | Trusted project operator. | Moderate, merge duplicates, configure seed policy, recompute snapshots, inspect audit logs. |
| Worker/service account | Non-human execution identity. | Write prediction/snapshot records; no interactive UI access. |

### 2.4 Operating Environment
- Latest two major versions of Chromium-based mobile browsers and Firefox where service-worker capabilities exist.
- Responsive web layout from 320 CSS px width upward; desktop supported for officer/admin work.
- FastAPI/Python service, PostgreSQL with PostGIS, Redis-compatible queue/cache, S3-compatible object storage, Docker Compose development environment.
- Network may be intermittent; client must permit draft preservation and retry.
- AI inference runs locally/Colab-exported weights or a small hosted Python service; absence of GPU must not block manual workflow.

### 2.5 Design and Implementation Constraints
- 12-week student build, four-person team, near-zero budget.
- No confirmed municipal partnership, private municipal data, or live backend API.
- Public data must not disclose direct identifiers, exact doorstep coordinates, EXIF, private notes, or original private media URLs.
- Only eight issue categories are supported in MVP.
- Lifecycle values are exactly: `open`, `triaged`, `assigned`, `in_progress`, `claimed_resolved`, `verified_fixed`, `reopened`, `rejected`, `duplicate_merged`.
- M7 voice intake is stretch; the product shall remain usable without it.

### 2.6 Assumptions and Dependencies
| Assumption/dependency | Consequence if unavailable | Required fallback |
|---|---|---|
| OTP provider/demo mechanism | Cannot use normal phone verification. | Development test identity with clearly non-production marking. |
| Object storage | Media uploads unavailable. | Local development storage only; report still permitted with text/location where configuration allows. |
| Map tiles | Map view degraded. | List view plus cached base-map shell and H3 label. |
| Redis/worker | AI jobs delayed. | Synchronous lightweight baseline in development or manual fields. |
| GPS/EXIF | Location/proof confidence reduced. | Manual pin and “metadata unavailable” warning; no false verification claim. |
| Labelled data | Model quality uncertain. | Baselines, held-out small evaluation set, explicit limitation. |

## 3. Specific Requirements
### 3.1 Functional Requirements
The traceability hint identifies the principal module or AI module; one requirement may have secondary dependencies.

| ID | Requirement | Verification | Traceability hint |
|---|---|---|---|
| FR-01 | The system shall create a citizen account only after a valid OTP verification or an explicitly configured development-mode test verification. | API integration test: invalid OTP rejected; valid OTP returns session. | Auth / Citizen PWA |
| FR-02 | The system shall issue JWT access tokens containing immutable user ID, role, issued-at, expiry, and token identifier claims. | Decode test token and validate protected route. | Auth / API |
| FR-03 | The system shall require consent acceptance before accepting a citizen media upload or device-derived location. | UI/API test denies submission absent consent. | Consent / Citizen PWA |
| FR-04 | The system shall accept only roles `citizen`, `officer`, and `admin` and deny a role-protected action to another role. | Authorization matrix test. | Auth / API |
| FR-05 | The system shall allow a citizen to create a complaint with one valid category, an approximate location, and at least one of photo or description. | Create request test and database assertion. | Intake / Citizen PWA |
| FR-06 | The system shall restrict complaint category values to `pothole/road`, `garbage/waste`, `drainage/sewage`, `water supply`, `streetlight/electrical`, `stray animals`, `encroachment`, and `other`. | Parameterized invalid-category API tests. | Intake / taxonomy |
| FR-07 | The system shall set a newly submitted complaint to `open` and create its initial hash-chained status event in the same transaction. | Transaction test verifies status and event. | Workflow / Audit |
| FR-08 | The system shall store private original media separately from a public derivative and shall not place original media URLs in public responses. | Storage/public API inspection test. | Media / Privacy |
| FR-09 | The system shall enqueue M1, M2, M3, and M4 analysis after complaint creation when applicable input exists, without blocking successful creation. | Queue mock test and latency assertion. | AI orchestration / M1–M4 |
| FR-10 | The system shall show editable AI category, department, and urgency suggestions with model version, confidence, and brief explanation when predictions are available. | UI/API fixture test. | Intake / M1–M3 |
| FR-11 | The system shall retain user-confirmed category separately from AI predictions. | Database and correction test. | Intake / M1/M2 |
| FR-12 | The system shall return active nearby complaint candidates using geospatial proximity and exclude precise coordinates from citizen/public response unless owner-authorized. | Proximity and redaction tests. | Discovery / M4 / PostGIS |
| FR-13 | The system shall allow a citizen to support an eligible complaint at most once. | Unique constraint/API duplicate test. | Support / M4 |
| FR-14 | The system shall prevent support of a complaint in `rejected`, `duplicate_merged`, or `verified_fixed` state. | State matrix test. | Support / Workflow |
| FR-15 | The system shall append one status event for every lifecycle transition with actor, timestamp, old/new status, reason, `prev_hash`, and `event_hash`. | Hash-chain verification test. | Workflow / Audit |
| FR-16 | The system shall allow only defined lifecycle transitions in the transition matrix. | Parameterized forbidden-transition tests. | Workflow |
| FR-17 | The system shall require officer role for assignment, officer status updates, and proof-of-fix uploads. | Authorization tests. | Officer console |
| FR-18 | The system shall require a non-empty reason for `rejected` and `duplicate_merged` transitions. | API validation test. | Workflow / Moderation |
| FR-19 | The system shall require at least one active proof-of-fix media record before accepting `claimed_resolved`. | Attempted transition test. | Proof / M5 |
| FR-20 | The system shall run M5 analysis for each proof-of-fix submission and record a versioned result without automatically setting `verified_fixed`. | Worker fixture and status test. | Proof / M5 |
| FR-21 | The system shall allow one verification vote per eligible citizen per proof-of-fix record. | Unique-vote test. | Verification |
| FR-22 | The system shall automatically transition `claimed_resolved` to `reopened` when two or more eligible nearby verification votes are `not_fixed`. | End-to-end threshold test. | Verification / Workflow |
| FR-23 | The system shall expose a public complaint detail response that contains coarse location, public timeline fields, and redacted media references only. | Contract redaction test. | Public transparency |
| FR-24 | The system shall expose a public issue map as GeoJSON containing only permitted status, category, department, age, supporter count, and coarsened geometry fields. | Schema and privacy test. | Public map |
| FR-25 | The system shall calculate and persist ward and department scorecard snapshots with a calculation timestamp, source window, method version, and metrics payload. | Scheduled-job and persistence test. | Analytics / M6 |
| FR-26 | The system shall list active complaints that exceed their applicable SLA in an SLA breach feed. | Fixture with policy/time boundary test. | Analytics / SLA |
| FR-27 | The system shall rank forgotten issues from documented harm, age, and supporter inputs and expose component values to admins. | Deterministic ranking fixture test. | Analytics / M6 |
| FR-28 | The system shall accept authenticated abuse reports and allow an admin to record moderation state and reason. | Submit/moderate integration test. | Moderation |
| FR-29 | The system shall allow an admin to merge a duplicate complaint into a canonical complaint while preserving both histories and creating audit/status events. | Merge transaction test. | Moderation / M4 |
| FR-30 | The system shall generate CSV and JSON open-data exports without direct identifiers, precise location, EXIF, private notes, or original media URLs. | Export field allow-list test. | Open data / Privacy |
| FR-31 | The system shall store M1–M7 prediction records with module name, model name/version, confidence, explanation, input reference, and output payload. | Persistence schema test. | AI governance / M1–M7 |
| FR-32 | The system shall maintain an audit record for admin actions, security-relevant actions, and external-adapter attempts. | Audit fixture test. | Audit / Integration |
| FR-33 | The system shall offer typed manual intake when voice service, image model, or network inference is unavailable. | Disable-worker UI test. | Resilience / M1–M7 |
| FR-34 | The system shall support English, Hindi, and Marathi interface string bundles with a visible fallback to English for an untranslated string. | Locale switching test. | Localization / PWA |

### 3.2 Performance Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-01 | Under a local fixture load of 20 concurrent users, a non-media authenticated API response shall have p95 server time at or below 800 ms. | Load test report. |
| NFR-02 | A complaint create request shall return a complaint ID without waiting for non-essential AI inference; p95 server time target is at or below 1.5 s excluding client upload time. | Queue-mocked load test. |
| NFR-03 | Nearby query over 10,000 seeded complaints shall return the first 50 candidates within 1.5 s on the demo deployment. | Indexed PostGIS benchmark. |
| NFR-04 | A public map query shall paginate or tile/filter results and shall not return unbounded complaint media payloads. | Contract/performance test. |
| NFR-05 | Scorecard recomputation shall execute asynchronously and publish an atomic completed snapshot rather than partial public results. | Job-state integration test. |

### 3.3 Security Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-06 | The system shall use TLS in deployed environments and shall mark secure cookies/tokens appropriately in production configuration. | Deployment configuration inspection. |
| NFR-07 | The system shall hash OTP secrets/tokens at rest, apply expiry, and rate-limit challenge and verification attempts. | Security test with expired/repeated token. |
| NFR-08 | The system shall authorize every protected API endpoint server-side using JWT role/user claims, not client UI state. | Direct API authorization tests. |
| NFR-09 | The system shall validate media MIME type, file size, and extension; it shall reject executable content. | Upload security test. |
| NFR-10 | The system shall use signed, short-lived private-media access URLs or an equivalent authenticated proxy. | URL expiry/access test. |
| NFR-11 | The system shall hash-chain status events and provide an integrity-check routine that detects a modified event. | Tamper simulation test. |
| NFR-12 | The system shall log security-relevant failed authorization and moderation actions without logging raw OTPs or access tokens. | Log review test. |

### 3.4 Usability and Accessibility Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-13 | The primary reporting path shall be usable on a 320 px-wide viewport without horizontal scrolling. | Browser visual test. |
| NFR-14 | Interactive controls shall have a target size of at least 44 by 44 CSS px where space permits. | UI inspection test. |
| NFR-15 | Text and meaningful icons shall meet a contrast target of 4.5:1 for normal text; status shall not rely on colour alone. | Accessibility audit. |
| NFR-16 | Every status shall use plain-language labels and distinguish `claimed_resolved` from `verified_fixed`. | Content/UI review. |
| NFR-17 | Camera/report/verify screens shall provide icon-plus-text affordances and optional voice input where M7 is enabled. | Usability walkthrough. |
| NFR-18 | Keyboard focus order, labels, and screen-reader accessible names shall be present for web controls. | Automated/manual accessibility test. |

### 3.5 Reliability Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-19 | Complaint creation, initial event, and media metadata linkage shall be atomic or recoverable through a visible failed-upload state. | Failure injection test. |
| NFR-20 | AI job processing shall be idempotent using a deterministic job/input key; retry shall not create duplicate predictions. | Retry test. |
| NFR-21 | A failed AI job shall record failure state and leave manual workflow available. | Worker failure test. |
| NFR-22 | The client shall save an unsent complaint draft locally after media selection and offer retry when connectivity returns. | Offline browser test. |
| NFR-23 | Database backups/exports for demo data shall be performed before release demonstrations, and restore instructions shall be tested once. | Restore drill checklist. |

### 3.6 Maintainability Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-24 | API routes shall be versioned under `/api/v1` and documented with request/response schemas. | OpenAPI/contract review. |
| NFR-25 | Business status-transition logic shall be centralized in one service/module and covered by transition tests. | Code review and test suite. |
| NFR-26 | Each AI prediction shall include model/version metadata and configuration/threshold reference. | Prediction record test. |
| NFR-27 | M1–M7 shall be independently disableable through configuration without schema changes. | Feature-flag test. |
| NFR-28 | Schema changes shall use ordered migrations and seed data shall be separately versioned. | Fresh-install test. |

### 3.7 Portability Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-29 | Local development shall start documented services using Docker Compose or equivalent scripted commands. | Clean-machine setup test. |
| NFR-30 | The application shall run with PostgreSQL/PostGIS and S3-compatible storage rather than a vendor-exclusive database/storage API. | Configuration test. |
| NFR-31 | The citizen client shall be installable as a PWA where browser support permits and shall degrade to responsive web where it does not. | Install/degradation test. |

### 3.8 Legal, Privacy, and Compliance Requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-32 | The system shall display collection purpose and consent before collecting citizen location/media and provide a privacy notice route. | UI/API review. |
| NFR-33 | Public endpoints shall use a documented allow-list of fields and return no phone number, user name, exact point, EXIF, private note, or private media URL. | Automated redaction tests. |
| NFR-34 | The system shall not present AI outputs as legal determinations, municipal commitments, or verified factual conclusions without human/workflow basis. | Copy/content review. |
| NFR-35 | The demo shall label synthetic and simulated records as such in research/admin contexts. | Seed data/UI review. |
| NFR-36 | The system shall provide an admin-controlled retention/deletion process for demo user content subject to preserving minimal tamper-evident audit metadata where appropriate. | Admin procedure test. |

## 4. Requirement Traceability Summary
| Product area | Primary requirements |
|---|---|
| Auth, consent, privacy | FR-01–04, FR-08, FR-23–24, FR-30, NFR-06–12, NFR-32–36 |
| Citizen intake and M1–M3/M7 | FR-05–11, FR-31, FR-33–34, NFR-01–02, NFR-13–18, NFR-20–21, NFR-26–27 |
| Discovery and M4 | FR-12–14, FR-29, NFR-03–04 |
| Workflow/proof/M5 | FR-15–22, NFR-19, NFR-25 |
| Analytics/M6 | FR-25–27, NFR-05 |
| Administration/integration | FR-28–32, NFR-24, NFR-28–30 |

## 5. Acceptance Baseline
The MVP is acceptable for course demonstration when: a citizen can complete a report and see it publicly redacted; an officer can take it from `open` to `claimed_resolved` with proof; two valid nearby negative votes reopen it; public map and scorecard queries respect redaction; the status chain detects tampering; and M1–M6 outputs can be recorded, inspected, and gracefully bypassed. M7 and any real municipal adapter invocation are not acceptance blockers.
