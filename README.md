# NagarDrishti

> **An accountability-centric civic issue platform where the architecture itself is adversarial to corruption — not just another complaint box with a dashboard.**

---

## The Problem

Existing civic platforms (CPGRAMS, Swachhata, IChangeMyCity) fail at the same point: **after filing**. Complaints go in, tickets get "disposed," but nothing verifiably changes. Citizens stop reporting because nothing happens. The municipal body sees fewer complaints and assumes things are fine. This is the trust-collapse loop.

## What NagarDrishti Does Differently

NagarDrishti attacks the post-filing gap with a **Forced Transparency Engine (FTE)** — four interlocking mechanisms that make hiding data harder than being transparent:

| Mechanism | What it does |
|---|---|
| **Hash-Chain Audit Ledger** | Every status change is cryptographically committed. History cannot be rewritten without detection. |
| **Inaction Amplification** | Unresolved issues auto-escalate through visibility tiers (T0→T4), making inaction progressively more public and costly. |
| **Adversarial Proof Detection** | Catches fake resolutions: photo reuse across issues, impossible resolution times, GPS mismatches, bulk suspicious closures. |
| **Transparency Accountability Score (TAS)** | Departments are scored on HOW they behave (evidence rate, verification response, flag rate) — not just resolution counts. |

Plus three novel analysis modules that no existing civic platform implements:

- **Ward Equity Analysis (N1)** — measures whether poor wards get slower service than rich wards for the same issue type
- **Cross-Category Cascade Detection (N4)** — detects when spatially clustered complaints of different types share an infrastructure root cause
- **Trust-Weighted Priority Scoring (N2)** — dynamic urgency based on supporter growth, seasonal relevance, and reporter credibility

---

## System Architecture

```
Citizen PWA          Public Dashboard         Officer Console        Research Dashboard
    |                      |                       |                       |
    +----------------------+---+-------------------+-----------------------+
                               |
                        Express API (TypeScript)
                               |
          +----------+---------+---------+------------------+
          |          |         |         |                  |
     PostgreSQL   Redis    Object    Forced             AI Modules
     (Drizzle)    Queue    Storage   Transparency       M1-M7 + N1-N4
                                     Engine (FTE)
```

### Repository Structure

```
NagarDrishti-app/
├── plans/                        # Master plan and sub-documents
│   ├── MASTER_PLAN.md            # Executive overview + contribution statement
│   ├── 01-system-architecture.md # Tech stack, DB schema, API contracts
│   ├── 02-forced-transparency-engine.md  # FTE design (4 mechanisms)
│   ├── 03-novelty-features.md    # N1-N6 novel features with algorithms
│   ├── 04-ai-modules.md          # M1-M7 + novel AI, training plans
│   ├── 05-implementation-roadmap.md  # 8-phase build plan (tracked)
│   ├── 06-evaluation-and-paper.md    # Research questions, metrics, paper
│   └── progress/SESSION_LOG.md   # Per-session progress tracking
│
├── nagardrishti-frontend/        # Main full-stack app
│   ├── client/src/               # React + TypeScript frontend
│   │   ├── pages/citizen/        # Citizen dashboard
│   │   ├── pages/officer/        # Officer console
│   │   ├── pages/transparency/   # Public transparency dashboard
│   │   └── pages/research/       # Research dashboard
│   └── server/                   # Express backend
│       ├── routes/               # API route handlers
│       ├── services/             # Business logic (issue, workflow, audit, etc.)
│       ├── ai/                   # AI orchestrator, queue, rules
│       └── db/                   # Drizzle schema, migrations, seed
│
├── pwa/                          # Standalone citizen PWA (Vite + React)
├── PRODUCT/                      # PRD, SRS, API spec, data model, system arch
├── TEAM/                         # Team docs, conventions, risk register
├── AGENTS.md                     # AI agent rules for session continuity
├── MISTAKES.md                   # Mistake log and lessons learned
└── README.md
```

---

## Issue Lifecycle

```
Open → Triaged → Assigned → In Progress → Claimed Resolved → Verified Fixed
                                                   ↓
                                               Reopened
                                    (2+ citizen "not fixed" votes,
                                     or adversarial flag on proof)
```

Rules enforced by the system (not just guidelines):
- Officer evidence **cannot** directly create "Verified Fixed" — citizen votes required
- Every status transition creates a **hash-chained event** in the audit ledger
- High-severity adversarial flags **block** advancement until reviewed

---

## Approved Issue Categories

`pothole/road` · `garbage/waste` · `drainage/sewage` · `water supply` · `streetlight/electrical` · `stray animals` · `encroachment` · `other`

Stable across UI, API, database, dataset, and paper.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, shadcn/ui |
| Maps | Leaflet |
| Backend | Express.js, TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| PWA | Service Worker, IndexedDB |

---

---

## Build Progress

- Phase 1: Database + Vertical Slice — COMPLETED
- Phase 2: Complete PWA + Hash-Chain Verification — Next
- Detailed roadmap: [`plans/05-implementation-roadmap.md`](plans/05-implementation-roadmap.md)
- Per-session log: [`plans/progress/SESSION_LOG.md`](plans/progress/SESSION_LOG.md)

---

## Getting Started

### 1. Database Setup (Docker)
Start the PostgreSQL container:
```bash
cd nagardrishti-frontend
docker compose up -d
npm run db:push
npm run db:seed
```

### 2. Backend Server
Runs on `http://localhost:5000`:
```bash
cd nagardrishti-frontend
npm run dev:server
```

### 3. Citizen PWA
Runs on `http://localhost:5174` (proxies `/api` to backend):
```bash
cd pwa
npm run dev
```

### 4. Administrative / Public Dashboards
Runs on `http://localhost:5173`:
```bash
cd nagardrishti-frontend
npm run dev
```

---

## Plan Documents (Start Here)

| Document | Purpose |
|---|---|
| [`plans/MASTER_PLAN.md`](plans/MASTER_PLAN.md) | Executive overview, contribution statement |
| [`plans/02-forced-transparency-engine.md`](plans/02-forced-transparency-engine.md) | Core novelty: FTE design |
| [`plans/03-novelty-features.md`](plans/03-novelty-features.md) | N1-N6 novel features |
| [`plans/05-implementation-roadmap.md`](plans/05-implementation-roadmap.md) | 8-phase build plan with status tracking |

---

## Research Context

**Paper framing:** NagarDrishti contributes an accountability-centric civic issue lifecycle that introduces adversarial proof-of-fix detection, ward equity measurement, cross-category cascade detection, and an auditable transparency score — within a privacy-preserving, citizen-verified workflow.

**Non-goals:** Live government API integration, autonomous AI closure decisions, full treasury audit, production-grade reliability claims.

---

## License

Academic research project — SEM 5 AI Capstone.
