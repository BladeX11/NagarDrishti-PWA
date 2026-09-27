# Product Requirements Document

## Product Name
**NagarDrishti** — the citizen-facing product. **CivicLens** is the research framing and paper name.

## Version
MVP v0.1. Target build window: 12 weeks. This document describes a demonstrable student-project MVP, not a production municipal system.

## Problem Statement
Civic grievance systems fail through a trust-collapse loop: filing is difficult, action is invisible, “resolved” status lacks proof, citizens disengage, and low reporting is mistaken for low need. NagarDrishti addresses three linked failures: access (complex forms and language barriers), visibility (private complaint silos), and accountability (unverified closure and no comparable service data).

The project must remain useful without municipal partnership or municipal data. The officer workflow is a controlled/mock console; any live backend connection is future work through an adapter.

## Product Vision
Provide a mobile-first public lens on neighbourhood civic issues: a resident can report an issue in about 20 seconds, discover and support an existing nearby report, see a privacy-preserving public status trail, and participate in verification after a claimed fix. The product turns complaint records into ward and department accountability signals without naming or scoring individual officers.

## Goals
| Goal | MVP interpretation |
|---|---|
| Lower reporting friction | Camera-first photo, optional text/voice, map pin, language choice, AI suggestions that remain editable. |
| Avoid duplicate reports | Suggest likely nearby matches and let the reporter support one instead of submitting a new complaint. |
| Make action visible | Public map, status timeline, age, responsible department, supporter count, and redacted before media. |
| Make closure accountable | Require proof-of-fix for a claim; prompt affected citizens to verify; reopen after two or more nearby “not fixed” votes. |
| Surface systemic performance | Ward and department scorecards, SLA-breach wall, forgotten-issues ranking, explainable anomaly flags. |
| Demonstrate applied AI rigor | Evaluate M1–M7 against transparent baselines and clearly label synthetic/self-collected data. |

## Non-Goals
- Treasury auditing, forensic financial claims, or tax-spend tracking. Phase 2 may explore budget-to-grievance linkage only.
- Naming, ranking, or publicly scoring individual municipal officers.
- Dependency on CPGRAMS, PMC, or another live municipal backend.
- Diagnosis-style, legally binding, or enforcement claims.
- Native iOS development. MVP is a responsive PWA installable from the browser at `/citizen`; a native Android wrapper is future work.
- Automated final rejection, closure, or punitive action by an AI model.

## Target Users
| User | Need | MVP access |
|---|---|---|
| Citizen reporter | File quickly in Marathi, Hindi, or English; follow their report. | Responsive PWA citizen portal at `/citizen`. |
| Nearby citizen/supporter | Confirm an existing issue and answer whether a claimed fix worked. | Responsive PWA citizen portal at `/citizen`. |
| Public visitor | See aggregated problems and accountability signals without exposing people. | Open map, redacted detail, scorecards, breach wall. |
| Mock municipal officer | Triage, assign, update status, and upload proof in a demo workflow. | Role-gated officer console. |
| Project administrator/moderator | Moderate abuse, merge duplicates, inspect audit history, recompute snapshots. | Role-gated admin console. |
| Research evaluator | Inspect model outputs, versioning, and experimental metrics. | Admin/export access in a controlled demo. |

## Primary Use Cases
1. A resident photographs a pothole, pins its approximate location, accepts or corrects AI classification, and submits a complaint.
2. The app finds an open garbage/waste report nearby; the resident taps **Support this issue** rather than creating a duplicate.
3. An officer triages an open item, assigns it, progresses it, and uploads an after-photo as a claimed resolution.
4. Original reporters and supporters receive a fix-verification prompt; two or more nearby “not fixed” votes reopen the item.
5. A public visitor reviews ward scorecards, SLA breaches, recurring categories, and forgotten issues without seeing precise homes or identities.
6. An administrator reviews spam/abuse reports, merges duplicates with a canonical complaint, and retains an append-only event record.

## User Stories
| ID | Story | Acceptance intent |
|---|---|---|
| US-01 | As a citizen, I want to report using a photo and short optional description so I do not need to know a department. | Submit with photo, consent, location, and editable AI suggestions. |
| US-02 | As a citizen, I want voice input in my chosen language so literacy and typing are not blockers. | M7 is optional/stretch; manual text remains available. |
| US-03 | As a citizen, I want to join an issue near me so public demand is not split across duplicates. | Show distance, category, age, and support action before new submission. |
| US-04 | As a citizen, I want to see a timeline and proof so a “resolved” label has meaning. | Public detail shows redacted history and claimed-fix media when allowed. |
| US-05 | As a nearby resident, I want to vote on a claimed fix so false closure can be challenged. | One verification vote per eligible user per proof; reopen rule is automatic. |
| US-06 | As an officer, I want an urgency-sorted queue so I can act on the most harmful work first. | Queue supports department/ward/status filters and explains urgency. |
| US-07 | As an admin, I want to merge duplicate reports without losing their history. | Canonical complaint retains supporter counts and immutable merge events. |
| US-08 | As a public visitor, I want ward and department scorecards so service patterns are visible. | Published snapshots include method/version and no individual officer data. |

## Proposed Solution

NagarDrishti consists of a citizen PWA, a public transparency layer, a mock officer console, and a FastAPI/PostgreSQL backend. The intake flow collects a photo, optional text or voice, and consented location. M1–M4 propose category, department, urgency, and duplicates asynchronously; the citizen can always correct suggestions. The system creates a complaint in `open`, maintains an immutable status-event chain, and publishes a coarsened public location.

An officer moves a complaint through the explicit lifecycle, attaches proof to claim resolution, and cannot set `verified_fixed` directly. M5 checks the evidence and produces a risk flag, not a final verdict. Eligible reporters/supporters vote. Two or more nearby “not fixed” votes move the complaint to `reopened`; sufficient positive verification can lead to `verified_fixed` through the verified workflow. M6 builds periodic ward/department snapshots and flags explainable spikes, backlog risk, and possible service gaps for human review.

## Scope for MVP
### In scope
- Marathi/Hindi/English UI labels and free-text intake; typed text fully supported.
- OTP-style demo authentication, citizen/officer/admin roles, JWT sessions.
- Eight categories: `pothole/road`, `garbage/waste`, `drainage/sewage`, `water supply`, `streetlight/electrical`, `stray animals`, `encroachment`, `other`.
- Photo-first complaint creation, approximate location, status timeline, nearby support, media upload.
- AI suggestions M1–M6; M7 voice intake only if time permits.
- Public map/detail with location and identity redaction, scorecards, breach wall, forgotten feed.
- Officer triage/assignment/status/proof flow and admin moderation/merge/snapshot controls.
- Seeded, synthetic, self-collected, and clearly marked demo data.

### Out of scope for MVP
- Live municipal ticket creation or webhook synchronization.
- Payments, grievance appeals, legal notices, officer performance rankings, and budget analysis.
- Guaranteed notification delivery; in-app prompts and a demo notification channel are sufficient.
- Automated action based solely on AI confidence.

## Functional Requirements
### 1. Identity and consent
1.1 The system shall issue OTP challenges for a verified mobile number or development-mode test identity.
1.2 The citizen shall accept consent language before first location/media submission.
1.3 The system shall enforce roles `citizen`, `officer`, and `admin`; public visitors need no account.

### 2. Citizen intake and M1/M2/M3/M7 assistance
2.1 The citizen shall create a complaint with a category, approximate location, and either a photo or a text description; photo is the recommended camera-first path.
2.2 The client shall show editable AI suggestions for category, department, urgency, and duplicate candidates.
2.3 Text input shall preserve original language and source; M7 transcript shall be marked as machine-generated and editable.
2.4 The system shall accept only the eight defined categories and route each to a configured department.

### 3. Nearby support and M4 clustering
3.1 The system shall query active nearby complaints using a coarsened proximity radius and show likely duplicate candidates before final submission.
3.2 A citizen shall be able to support an eligible complaint once; supporting does not expose identity publicly.
3.3 Admins may merge a duplicate into a canonical complaint with a recorded reason and reversible audit record.

### 4. Workflow, proof, and M5 verification
4.1 Each status change shall create an append-only, hash-chained status event.
4.2 Officers shall assign a complaint before progress work and provide a reason for `rejected` or `duplicate_merged`.
4.3 A claimed resolution shall have at least one proof-of-fix media record.
4.4 Eligible users shall vote fixed/not fixed/unsure; two or more nearby `not_fixed` votes shall reopen a `claimed_resolved` complaint.
4.5 M5 shall flag suspicious proof but shall not automatically decide the outcome.

### 5. Transparency and M6 analytics
5.1 Public views shall show active issues, age, category, department, coarse location, supporter count, and redacted status history.
5.2 The system shall generate ward and department snapshots on a scheduled run and on explicit admin recomputation.
5.3 The breach wall shall list active complaints past their applicable SLA without exposing personal data.
5.4 The forgotten feed shall rank open/reopened issues by documented harm, age, and supporters; it shall label the ranking as a prioritization aid.

### 6. Moderation, audit, and exports
6.1 Any authenticated user shall report abusive or unsafe content.
6.2 Admin decisions shall be logged with actor, timestamp, target, and reason.
6.3 Open-data exports shall omit direct identifiers, precise coordinates, EXIF, unredacted media URLs, and private notes.

## Data Inputs
| Input | Source | Required | Handling |
|---|---|---:|---|
| Complaint photo | Citizen camera/gallery | Recommended | Object storage; EXIF extracted then public copies stripped/redacted. |
| Description | Typed text | Optional with photo | Preserve original; pass to M1/M3/M4 with consent. |
| Voice note | Citizen microphone | Stretch | Transcribe through M7; retain only with explicit consent. |
| Location | Map pin/device location | Required at coarse precision | Store secure exact point where consented; publish H3/street-segment representation. |
| Category correction | Citizen | Optional | Training feedback candidate; not immediate model truth. |
| Officer proof photo | Officer console | Required for claim | M5 evidence analysis plus manual review. |
| Votes/support | Authenticated participants | Optional | Rate limited and anomaly monitored. |
| Policies/wards | Team-configured seed data | Required | Version-controlled/reference tables. |

## Core Outputs
- A trackable complaint ID and immutable status timeline.
- Category, department, urgency, duplicate candidates, and confidence/explanation labels.
- Privacy-preserving public issue map and redacted complaint detail.
- Proof-of-fix evidence and verification outcome.
- Ward/department scorecard snapshots, SLA breach feed, and forgotten-issues ranking.
- Research-ready exports of de-identified records, predictions, and evaluation annotations.

## Key Product Differentiators
| Differentiator | Why it matters | MVP boundary |
|---|---|---|
| Public support rather than isolated tickets | Makes collective impact visible without identity exposure. | One support per user; not social networking. |
| Proof-of-fix plus citizen verification | Separates claimed resolution from verified fixed. | Evidence flags assist humans; no automated legal conclusion. |
| Privacy-preserving public map | Gives visibility while avoiding exact doorstep disclosure. | H3/street-segment coarsening and redaction. |
| Explainable, modular AI | Enables study and graceful fallback. | Suggestions are editable and confidence-aware. |
| Department/ward scorecards | Shows system patterns while avoiding officer-level defamation risk. | Snapshot metrics, not personnel scoring. |

## Suggested MVP Architecture
React PWA -> FastAPI REST API -> PostgreSQL/PostGIS plus object storage. Redis and a worker process run asynchronous inference. Python ML modules emit versioned `ai_predictions`. A scheduled job computes scorecard snapshots. Leaflet/OpenStreetMap render maps. Docker Compose provides reproducible local deployment; free-tier hosting is suitable for a limited demonstration. The complete detailed design is in `system-architecture.md`.

## UX Requirements
- The primary report flow targets 20 seconds after consent: capture/select photo, confirm approximate pin, review suggestions, submit.
- Design mobile-first with large touch targets, high contrast, text plus category icons, and one-handed primary actions near the bottom.
- Present English strings with Hindi and Marathi localization placeholders from day one; do not claim automatic translation quality.
- Never make an AI label look final. Use “Suggested category” and show confidence only where it aids correction.
- Always distinguish `claimed_resolved` from `verified_fixed` in wording and colour.
- Offer plain-language errors, retry/save-draft behaviour for weak networks, and a clear privacy explanation before location sharing.

## Success Metrics
Metrics are targets for evaluation, not claims of achieved performance.
| Area | Target / measurement |
|---|---|
| Filing usability | Median observed time-to-file at or below 20 seconds for a prepared photo in a 15–20 participant study. |
| M1 | Macro-F1 reported by category and language; compare multilingual model with English-only baseline. |
| M2 | Precision/recall and mAP where detection annotations exist; classify-only metrics otherwise. |
| M3 | Top-k urgency agreement and Spearman correlation against human ranking. |
| M4 | Pairwise duplicate precision, recall, F1, and cluster purity. |
| M5 | Precision/recall for suspicious/fake-fix detection on constructed adversarial evidence. |
| Workflow | Simulated median days-open, SLA compliance, and reopen rate; clearly label simulation. |
| Trust | Post-task willingness-to-reuse and comprehension of claimed vs verified status. |

## Technical Feasibility
The stack matches team skills: Python/FastAPI, JavaScript/React or plain web UI, SQL/PostGIS, Docker, Colab, GitHub, Firebase/Render-class free tiers. Begin with a deterministic rule baseline for routing and urgency, then add small/hosted models as time permits. The main constraints are labelled data, image storage, GPU availability, OTP costs, and the absence of a municipal partner. Use seed data and a demo auth provider; do not represent the prototype as a live government service.

## MVP Milestones
| Weeks | Deliverable | Exit criterion |
|---|---|---|
| 1–2 | Schema, mock data, PWA shell, design tokens | Create and list seeded complaints locally. |
| 3–4 | Intake, media storage, auth demo, public map | End-to-end photo report with coarse public map point. |
| 5–6 | Workflow, support, events, officer console | Assignment, status timeline, proof upload, audit chain pass tests. |
| 7–8 | M1–M4 baselines and UI suggestions | Versioned prediction records and offline evaluation notebook/results. |
| 9 | M5, verification votes, reopen rule | Fake-fix demo and two-negative-vote reopen test. |
| 10 | M6 scorecards, breach wall, forgotten feed | Reproducible snapshots from fixture data. |
| 11 | Accessibility, weak-network, moderation, export | Usability walkthrough and redaction test. |
| 12 | Evaluation, demo script, paper artifacts | Frozen test set, metrics table, recorded demo path. |

## Risks
| Risk | Effect | Owner attention |
|---|---|---|
| No municipal data/partnership | Cannot validate real deployment claims. | Build demonstrator with transparent proxy/synthetic/self-collected data. |
| Insufficient labelled multilingual data | Weak M1/M2 evaluation. | Curate a small held-out set and document provenance. |
| Model inference latency/cost | Intake feels slow. | Async jobs, lightweight baseline, editable manual fallback. |
| Misuse or personal-data exposure | Trust and safety harm. | Coarsening, redaction, consent, moderation, limited retention. |
| Fake votes/proof | Distorted workflow. | OTP account, rate limits, eligibility rules, audit records, M5 flags. |
| Scope overload | Incomplete demo. | Treat M7 and live integrations as stretch/future work. |

## Mitigations
- Use generated/seeded records only as clearly labelled demonstrations; never present them as municipal evidence.
- Make all AI modules independently switchable and retain deterministic/manual fallback paths.
- Limit initial geography to selected Pune wards/campus area and configure ward boundaries from seed data.
- Store originals privately, publish derivatives only after stripping metadata and coarsening location.
- Test status transitions, public redaction, hash-chain integrity, duplicate merge, and reopen threshold as non-negotiable core paths.
- Freeze a small evaluation set before final tuning to avoid reporting only training performance.

## Patentability Notes
The project should not assume patentability. A possible future novelty review could examine the combination of privacy-preserving geospatial grievance clustering, proof-of-fix authenticity signals, and crowd verification tied to status transitions. Before any disclosure decision, the team should record prior-art searches, distinguish implementation details from claims, and obtain institutional/legal guidance. The MVP should prioritize reproducible research and ethical deployment over patent assertions.

## Open Questions
1. What consent and retention wording will the team use for self-collected images and voice?
2. What selected wards/campus boundaries can be safely included in the demo seed data?
3. What exact proximity and eligibility thresholds are appropriate for “nearby” support and verification?
4. Which department mapping and SLA policy values will be marked as demo assumptions?
5. Will M7 be built, or documented as a stretch integration with typed fallback?
6. How will OTP be demonstrated at zero budget without collecting unnecessary phone numbers?
7. What human rubric defines urgency and proof-of-fix labels for the held-out evaluation set?

## Recommended First Build
Build the thin vertical slice before training advanced models:
1. PostgreSQL/PostGIS schema, ward/category/SLA seed data, and role-gated mock auth.
2. Citizen PWA: capture photo, choose category, place coarse pin, submit, and see a timeline.
3. Public redacted map/detail plus complaint supporter action.
4. Officer queue: assign, progress, upload proof, move to `claimed_resolved`.
5. Verification prompt and deterministic two-nearby-negative-vote reopen rule.
6. Hash-chain events and a basic scorecard snapshot.
7. Add M1–M5 suggestions behind feature flags, then M6; build M7 only if the core workflow is stable.
