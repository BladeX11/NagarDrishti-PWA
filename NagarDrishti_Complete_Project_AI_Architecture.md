NagarDrishti Complete Project Plan

__Dashboard, PWA, backend, AI architecture, novelty, evaluation, and delivery blueprint__

Project: NagarDrishti / CivicLens

Purpose: Define the complete working prototype and research programme before implementation\.

Audience: Product team, engineering team, AI team, evaluators, and conference paper collaborators\.

## Executive direction

Build a trustworthy civic issue lifecycle rather than a collection of disconnected AI demos\. The first working milestone must connect the citizen PWA to the officer dashboard through a real backend contract\. AI is then added as asynchronous, explainable assistance with manual fallbacks and measurable baselines\.

## Core system loop

Report \-> Privacy transform \-> Classify and route \-> Detect possible duplicate \-> Officer action \-> Proof of fix \-> Citizen verification \-> Verified or reopened

## Research framing

The defensible research contribution is a privacy\-preserving, duplicate\-aware, citizen\-verified civic issue workflow with an auditable status ledger\. The project should not claim live municipal deployment, autonomous governance, or guaranteed fraud detection\.

# 1 Product definition

NagarDrishti is a mobile\-first public civic platform\. A resident can report a neighbourhood issue with low friction, discover and support an existing nearby report, follow a public status trail, and challenge a claimed fix\. A mock officer console demonstrates triage, assignment, status management, and evidence submission\. Public scorecards show system\-level patterns without exposing identities or exact locations\.

## User roles

__Role__

__Need__

__Surface__

Citizen reporter

Create and track a report\.

Citizen PWA

Nearby supporter

Support or verify an issue\.

Citizen PWA

Public visitor

Inspect neighbourhood\-level patterns\.

Public dashboard

Mock officer

Triage, assign, update, and prove action\.

Officer dashboard

Admin or researcher

Review data, models, and audit events\.

Research dashboard

## Approved taxonomy

Stored categories must remain stable across the UI, API, database, dataset, and paper: pothole/road, garbage/waste, drainage/sewage, water supply, streetlight/electrical, stray animals, encroachment, and other\.

## Issue lifecycle

Open \-> Triaged \-> Assigned \-> In progress \-> Claimed resolved \-> Verified fixed  
                                           \\\-> Reopened

## Non\-goals

- Live PMC, CPGRAMS, or government backend integration
- Public ranking of individual officers
- AI\-only closure or rejection decisions
- Legal or enforcement claims
- Native iOS implementation in the MVP
- Unreviewed release of exact addresses, names, phone numbers, or raw media

# 2 Whole system architecture

Citizen PWA and public dashboard  
             |  
             v  
       FastAPI API layer  
             |  
   \+\-\-\-\-\-\-\-\-\-\+\-\-\-\-\-\-\-\-\-\+\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\+  
   |                   |                |  
PostgreSQL/PostGIS  Redis/RQ      Object storage  
   |                   |                |  
Issue and event     AI jobs       Before/after media  
records             and retries   and redacted derivatives

## Repository architecture

NagarDrishti\-PWA/  
|\-\- frontend/       React, TypeScript, routes, components  
|\-\- backend/        FastAPI, schemas, services, repositories  
|\-\- ml/             datasets, training, inference, evaluation  
|\-\- database/       migrations and seed data  
|\-\- data/           manifests and synthetic fixtures  
|\-\- experiments/    runs, metrics, ablations  
|\-\- tests/          unit, API, integration, end\-to\-end  
|\-\- docs/           model cards, runbook, paper assets  
\`\-\- docker\-compose\.yml

## Technology decisions

__Layer__

__Choice__

__Design reason__

Frontend

React, TypeScript, Vite

Shared role\-based UI and fast iteration\.

Maps

Leaflet

Markers, coarse cells, and simple spatial interaction\.

Backend

FastAPI, Pydantic, SQLAlchemy

Typed contracts and Python ML compatibility\.

Data

PostgreSQL and PostGIS

Relational lifecycle plus spatial search\.

Async work

Redis and RQ or thin worker

Inference and media checks do not block reports\.

Storage

Local filesystem or MinIO

Portable, zero\-budget prototype storage\.

PWA

Service worker and IndexedDB

Installability, offline shell, and draft sync\.

## Design principle

The dashboard, API, database, and AI services must share typed contracts\. Seeded mock data is acceptable for an early screen prototype, but the first stable milestone must use the backend as the source of truth\.

# 3 Frontend dashboards

The frontend should be one responsive application with role\-based routes and shared components\. Citizens should experience a calm, mobile\-first reporting flow\. Officers should get a dense but readable operations console\. Public visitors should see useful neighbourhood signals without private data\.

## Shared components

- Issue card
- Status badge
- Activity timeline
- Map marker and coarse cell
- Filter controls
- Media upload and preview
- Privacy notice
- Loading, empty, offline, and error states
- Confirmation dialog
- Accessible form controls

## Citizen PWA

- Home with nearby issues and a prominent Report issue action
- Map with open, in\-progress, claimed, and reopened states
- Camera capture with file\-picker fallback
- Description and language selection
- Editable category suggestion
- Approximate location preview before submission
- Nearby duplicate suggestions
- Support existing issue action
- My reports and public timelines
- Verification prompt after a claimed fix
- Notification and settings screens

## Officer dashboard

__Surface__

__Required behaviour__

Overview

Open queue, SLA breaches, in\-progress work, claims awaiting verification, reopened issues, ward workload\.

Queue

Filter by ward, department, category, status, priority, age, and duplicate warning\.

Issue detail

Description, media, coarse map, similar issues, AI suggestions, assignment, status controls, timeline\.

Proof review

After\-photo, resolution note, plausibility flags, claim state, and verification state\.

Activity timeline

Append\-only view of report, assignment, progress, proof, votes, and reopen events\.

## Public transparency dashboard

- Public map with privacy\-coarsened issue areas
- Ward, category, and status filters
- Open, in\-progress, resolved, and reopened counts
- SLA breach wall
- Forgotten issue ranking
- Median resolution time
- Reopen rate
- Ward and department scorecards
- No exact address, personal identity, or individual officer ranking

## Research dashboard

- Model predictions and confidence
- Duplicate suggestions and review outcomes
- Proof\-of\-fix flags
- Reopened events
- Audit ledger verification
- Dataset and model versions
- Experiment metrics and error slices

# 4 Backend and data architecture

## Core entities

users, roles, wards, departments, issues, issue\_media, issue\_supporters, issue\_duplicates, issue\_status\_events, issue\_verification\_votes, sla\_policies, model\_predictions, scorecard\_snapshots, audit\_events

## API groups

POST /auth/login       GET /me  
POST /issues           GET /issues           GET /issues/\{id\}  
PATCH /issues/\{id\}     POST /issues/\{id\}/support  
GET /issues/\{id\}/duplicates  
POST /issues/\{id\}/assign  
POST /issues/\{id\}/status  
POST /issues/\{id\}/proof  
POST /issues/\{id\}/verification  
GET /issues/\{id\}/timeline  
GET /map   GET /scorecards   GET /sla\-breaches   GET /forgotten\-issues

## Issue record

__Field group__

__Contents__

Identity

Issue ID, public reference, created and updated timestamps\.

Content

Description, language, category, and media references\.

Workflow

Status, department, assignment, priority, and SLA state\.

Location

Restricted location, public coarse cell, and ward\.

Evidence

Before media, after media, proof state, and privacy review state\.

Research

Model version, prediction records, source type, and confidence\.

## Backend rules

- Validate every status transition server\-side\.
- Do not allow officer evidence to create Verified fixed directly\.
- Tie each vote to an eligible user, issue, and proof version\.
- Return explicit 400, 401, 403, 404, 409, 422, and 500 responses\.
- Use structured logs without raw photos, voice text, tokens, exact coordinates, or contact data\.
- Keep route handlers thin; put business logic in services\.

## Privacy service

Store private evidence and location references separately from public representations\. Public responses should use deterministic coarse cells or snapped locations and should apply minimum aggregation thresholds when a small number of reports could reveal a household\.

Private location: restricted storage  
Public location: coarse cell or privacy\-reviewed snapped point  
Public media: redacted derivative only  
Public response: no name, phone, exact coordinates, or raw upload URL

## Tamper\-evident event ledger

Every status change creates an event containing issue, previous status, new status, actor, timestamp, reason, previous event hash, and current event hash\. The public timeline and audit verifier consume this event stream rather than trusting one mutable status field\.

# 5 PWA architecture

The application must be installable and useful during weak connectivity\. A PWA is successful only when it reports its state honestly: saved, pending sync, failed, or successfully submitted\.

## PWA capabilities

- Application manifest and service worker
- Installable on Android and desktop
- Offline application shell
- Cached last\-known public issue data
- IndexedDB drafts
- Retry queue for pending submissions
- Camera and file\-picker fallbacks
- Geolocation and manual pin fallbacks
- Safe\-area and touch\-target support
- Responsive officer dashboard
- Keyboard and screen\-reader accessibility

## Offline state machine

Online \-> submit \-> server confirmation \-> issue ID  
Offline \-> save draft \-> IndexedDB \-> Pending sync  
Online again \-> retry \-> confirmation \-> issue ID  
Failure \-> retain draft \-> show retry action \-> never claim success

## PWA data rules

- Use a query cache for server state\.
- Use IndexedDB for offline drafts and retry metadata\.
- Cache static assets and safe public data only\.
- Never cache private media, tokens, or sensitive locations publicly\.
- Show a visible sync state when a report has not reached the server\.

# 6 AI architecture overview

AI is an assistance layer, not an autonomous authority\. Each model produces a versioned prediction, confidence, explanation, and fallback state\. Citizens and officers can correct suggestions, and irreversible workflow decisions remain governed by backend rules and human verification\.

Report created  
      |  
      v  
Job created in Redis/RQ  
      |  
      \+\-\- M1 category classification  
      \+\-\- M2 department routing  
      \+\-\- M3 duplicate candidate retrieval  
      \+\-\- M4 priority and urgency ranking  
      \+\-\- M5 image severity classification  
      \+\-\- M6 proof\-of\-fix plausibility  
      \+\-\- M7 scorecard analytics  
      |  
      v  
Versioned predictions and explanations  
      |  
      v  
Citizen or officer review  
      |  
      v  
Accepted, corrected, or marked uncertain

## Inference principles

- Run heavy inference asynchronously so report creation remains responsive\.
- Store model version, data version, confidence, timestamp, and input reference for every prediction\.
- Use deterministic rules as fallbacks for missing or low\-confidence model output\.
- Expose explanations that are understandable to a non\-technical officer\.
- Never fabricate a category, urgency, proof result, or closure decision\.
- Log corrections as useful evaluation labels rather than hiding them\.

# 7 AI module architecture

## M1 Category classification

M1 suggests one of the eight approved categories from text, language, and optional image features\. The mandatory baseline is keyword matching followed by TF\-IDF with a linear classifier\. A multilingual candidate such as MuRIL or IndicBERT should be selected only after a controlled comparison\.

Input: text, language, optional image features  
Output: category, confidence, top alternatives, model version, explanation  
Fallback: citizen category picker  
Metrics: macro\-F1, per\-category F1, per\-language F1, confusion matrix

## M2 Department routing

M2 maps category and contextual information to a responsible department\. It should show a reason such as category match, ward policy, or historical routing pattern\. The officer can override the suggestion and the override becomes an evaluation signal\.

Input: category, description, ward, policy table  
Output: department, confidence, reason, alternatives  
Fallback: deterministic category\-to\-department mapping  
Metrics: top\-1 accuracy, top\-3 accuracy, human agreement, correction rate

## M3 Duplicate detection and clustering

M3 should reduce fragmented demand without silently merging unrelated reports\. Candidate retrieval uses PostGIS distance and a time window\. Ranking combines spatial distance, category match, text similarity, and image similarity\. The user sees reasons and confirms support or merge actions\.

__Stage__

__Method__

__Output__

Candidate retrieval

PostGIS distance, ward, time window, open status\.

Small set of nearby candidates\.

Text similarity

TF\-IDF baseline, multilingual embeddings candidate\.

Description similarity score\.

Image similarity

Perceptual hash or embedding similarity\.

Visual similarity score\.

Decision

Explainable weighted score or calibrated classifier\.

Duplicate confidence and reasons\.

Human action

Support, ignore, or admin\-confirm merge\.

Reversible relationship event\.

Input: location, time, category, text, optional image  
Output: possible duplicate, confidence, reasons, candidate IDs  
Fallback: distance and category rule  
Metrics: pairwise precision, recall, F1, false merge rate, cluster purity

## M4 Priority and urgency ranking

M4 ranks work rather than making a final decision\. A hybrid approach is recommended: transparent rules form the baseline, then a ranking model can be compared against officer labels\. The interface should explain every high\-priority recommendation\.

Input: safety category, issue age, supporters, severity, SLA state, ward context  
Output: priority band, score, explanation  
Fallback: deterministic SLA and safety rules  
Metrics: ranking quality, human agreement, officer correction rate

## M5 Image severity

M5 provides a low, medium, or high severity suggestion for issues where visual evidence is relevant\. Start with a lightweight MobileNet or EfficientNet classifier and do not claim object detection unless annotation quality supports it\.

Input: consent\-cleared issue image  
Output: severity, confidence, quality flag  
Fallback: manual severity selection  
Metrics: precision, recall, macro\-F1, calibration error

## M6 Proof\-of\-fix plausibility

M6 checks whether a claimed fix has plausible evidence\. It should identify weak evidence, reused images, stale media, wrong\-location media, and mismatched categories\. It must produce a review flag rather than a legal or fraud conclusion\.

Input: before media, after media, issue location, proof metadata  
Output: plausible, needs review, or suspicious; reasons and confidence  
Fallback: manual officer and citizen review  
Metrics: adversarial precision, recall, reused\-image detection, wrong\-location detection

## M7 Analytics

M7 is primarily deterministic analytics rather than a deep learning model\. It computes ward and department snapshots from the event ledger and publishes the method and snapshot version with every scorecard\.

Outputs: median resolution time, SLA compliance, reopen rate, verification agreement, workload, forgotten issues

# 8 AI data and training architecture

## Dataset design

Use a documented mixture of synthetic records, permitted public proxy data, and consent\-cleared self\-collected examples\. Synthetic data must remain visibly labelled in manifests, model cards, tables, and the application\. Do not publish faces, plates, exact private locations, raw contact data, or unreviewed images\.

- Eight approved issue categories\.
- English, Hindi, and Marathi slices where language claims are made\.
- Immutable dataset release folders and manifests\.
- Source type, licence or consent, collection date, privacy review state, hash, and split\.
- Group split by physical issue to prevent leakage\.
- Separate train, validation, and held\-out test records\.

## Training pipeline

Raw approved data \-> privacy review \-> manifest validation \-> label normalization \-> group split \-> feature and image transforms \-> train \-> validate \-> held\-out test \-> error analysis \-> model card \-> registry

## Model registry

Every candidate model should have a registry entry with model ID, module, run ID, git SHA, data version, architecture, seed, split, primary metric, artifact path, card path, owner, and status\. Status values should be candidate, approved, deprecated, or rejected\.

## Experiment record

Record the command, commit SHA, package version, data manifest hash, split definition, seed, hardware, duration, parameters, metrics, per\-slice results, error examples, artifact path, owner, and known limitation\. Failed runs should also be recorded to reduce duplicated effort and selective reporting\.

## Model card requirements

- Purpose and intended users
- Training data and source types
- Language and category coverage
- Baseline comparison
- Held\-out metrics and error slices
- Threshold and calibration
- Privacy and ethical risks
- Known limitations
- Human override and rollback path

# 9 AI serving and reliability

__Concern__

__Required behaviour__

Latency

Report creation must not wait for heavy image or language inference\.

Failure

Show pending or uncertain state and preserve manual editing\.

Low confidence

Do not silently guess; show alternatives or request manual input\.

Versioning

Store model and data versions with every prediction\.

Reproducibility

Use fixed seeds, versioned transforms, and deterministic fixtures where possible\.

Rollback

Keep the baseline available as a safe fallback\.

Privacy

Do not log raw images, exact locations, voice text, or contact data\.

## Human\-in\-the\-loop controls

- Citizen can change category and ignore duplicate suggestions\.
- Officer can correct department and priority\.
- Admin can review suspected duplicates and proof flags\.
- Citizen verification is required before Verified fixed\.
- The system records overrides for future evaluation\.
- No model can directly reject or permanently close an issue\.

# 10 Dashboards and AI interaction

__Role__

__AI shown__

__Human action__

Citizen

Category suggestion, duplicate candidates, confidence, privacy preview\.

Edit category, support issue, create new report, consent to submit\.

Officer

Priority explanation, department suggestion, similar issues, proof flags\.

Accept, correct, assign, request more evidence, update status\.

Public

Aggregated categories, issue density, SLA and resolution indicators\.

Filter and inspect public evidence without private data\.

Researcher

All versioned predictions, errors, overrides, and experiments\.

Review labels, compare models, audit data and ledger\.

# 11 Novelty and paper contribution

The novelty should be stated as an integrated, measurable accountability architecture rather than as an unsupported claim of a completely new model\. NagarDrishti connects privacy\-preserving mapping, duplicate\-aware support, explainable prioritisation, evidence\-backed resolution claims, citizen verification, and auditable reopening in one workflow\.

## Proposed contribution statement

NagarDrishti introduces a privacy\-preserving civic issue lifecycle that combines geospatial duplicate\-aware reporting, explainable prioritisation, proof\-of\-fix plausibility checks, and citizen\-driven reopening within an auditable status ledger\.

## Research questions

1. Does combined spatial, text, category, and image similarity outperform distance\-only and text\-only duplicate baselines?
2. Can proof\-of\-fix checks identify reused, stale, or wrong\-location evidence?
3. Does privacy coarsening preserve neighbourhood\-level usefulness while reducing location exposure?
4. Does citizen verification identify questionable closure claims?
5. Does explainable AI assistance reduce officer triage effort without removing human control?

## Claims to avoid

- Real municipal deployment
- Guaranteed fraud detection
- Universal language support
- Fully autonomous civic governance
- Proven reduction in corruption
- Production\-grade reliability without production evidence

# 12 Evaluation plan

## Baseline and ablation matrix

__Area__

__Baselines__

__Ablations__

Category

Keyword rules; TF\-IDF plus linear classifier\.

Language, category, and image slices\.

Duplicates

Distance\-only; text\-only; category\-only\.

Remove spatial, text, image, or category signals\.

Priority

Manual SLA and safety rules\.

Remove supporters, age, SLA, or safety inputs\.

Proof

Rule\-only checks\.

Remove location, time, reuse, or visual consistency checks\.

Workflow

No verification or no privacy coarsening comparison\.

Compare trust, usefulness, and failure cases\.

## Metrics

- Prediction: macro\-F1, precision, recall, calibration, pairwise F1, false merge rate\.
- Workflow: report completion time, task completion, verification rate, reopen rate\.
- System: API latency, map load time, inference queue time, failure recovery\.
- PWA: install success, offline draft success, sync success, mobile defects\.
- Usability: System Usability Scale, perceived trust, perceived privacy, perceived transparency\.

## Usability study

A structured study with about 15 to 30 participants can evaluate the workflow without claiming population\-level generalisation\. Participants should report a simulated issue, find and support a nearby duplicate, inspect a claimed fix, and vote on whether it was resolved\.

## Paper structure

- Abstract
- Introduction
- Problem and background
- System architecture
- Privacy\-preserving mapping
- Duplicate\-aware reporting
- Proof\-of\-fix verification
- AI modules
- Experimental setup
- Results and ablations
- Usability study
- Ethics and limitations
- Conclusion

# 13 Implementation roadmap

__Stage__

__Work__

__Exit criterion__

1 Product freeze

Roles, taxonomy, lifecycle, privacy rules, API contracts, demo script\.

No unresolved contradictions in core scope\.

2 Dashboard foundation

Citizen PWA, officer shell, public shell, shared components and routing\.

All key screens navigate with proper states\.

3 Vertical slice

Citizen report, backend persistence, officer queue, status update, public timeline\.

Report\-to\-update flow works end to end\.

4 Public transparency

Map, filters, scorecards, SLA wall, redaction\.

Public visitor can inspect issues safely\.

5 Duplicate workflow

Candidate retrieval, similarity, support, confirmation, merge history\.

Suggestions are measurable and reversible\.

6 Verification

Proof upload, citizen votes, reopen rule, public history\.

Claimed fixes cannot bypass verification\.

7 AI baselines

M1 to M7, registry, model cards, inference jobs, fallbacks\.

Every module has evidence and limitations\.

8 Hardening

Tests, accessibility, offline behaviour, security, seed scripts, docs\.

Clean checkout runs demo and tests\.

9 Paper package

Ablations, usability study, figures, tables, limitations\.

All claims trace to reproducible evidence\.

## First working milestone

Citizen opens installed PWA \-> submits photo and location \-> backend saves issue \-> officer sees queue \-> officer updates status \-> citizen sees timeline

## Definition of done

- Fresh install works on a supported mobile browser\.
- PWA is installable and has a working offline shell\.
- Online reporting and offline drafts work honestly\.
- Officer dashboard receives the same issue from the backend\.
- Backend enforces status transitions and role permissions\.
- Public locations and media are privacy reviewed\.
- Proof\-of\-fix cannot directly create Verified fixed\.
- Citizen verification can verify or reopen an issue\.
- AI failures produce manual fallback rather than fabricated output\.
- Migrations and seed data work from a clean checkout\.
- Core API, privacy, status, and verification tests pass\.
- AI metrics include baselines, held\-out tests, and error analysis\.
- Synthetic and consent\-cleared data are labelled honestly\.
- The demo and paper numbers are reproducible from named scripts or runs\.

## Final recommendation

Build the citizen and officer dashboards as one connected vertical slice before advanced AI\. Then add the public dashboard, duplicate workflow, proof\-of\-fix verification, and model modules in that order\. This sequence protects the research contribution: every AI prediction will connect to a real workflow, a human decision, an auditable event, and an evaluable outcome\.

