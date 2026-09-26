# 01 — System Architecture

> Tech stack, repository structure, data model, API contracts, and deployment configuration.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 19, TypeScript, Vite | Shared role-based UI, fast iteration |
| UI Components | shadcn/ui (already in project) | Consistent, accessible, themeable |
| Maps | Leaflet | Open-source, markers, spatial interaction |
| Backend | Express.js, TypeScript | Already built, Node.js ecosystem |
| ORM | Drizzle ORM | Type-safe, PostgreSQL-native, migrations |
| Database | PostgreSQL | Relational lifecycle + spatial queries |
| Async Queue | Redis + BullMQ (or simple in-memory queue for MVP) | AI inference doesn't block report creation |
| Object Storage | Local filesystem (MinIO for production) | Zero-budget prototype storage |
| PWA | Service Worker, IndexedDB | Installable, offline drafts, retry queue |
| AI/ML | Python microservice or Node.js rule-based (MVP) | Rule baselines first, ML later |

---

## Repository Structure

```
NagarDrishti-app/
|-- plans/                     # This documentation set
|   |-- MASTER_PLAN.md
|   |-- 01-system-architecture.md
|   |-- 02-forced-transparency-engine.md
|   |-- 03-novelty-features.md
|   |-- 04-ai-modules.md
|   |-- 05-implementation-roadmap.md
|   |-- 06-evaluation-and-paper.md
|
|-- nagardrishti-frontend/     # Main full-stack app
|   |-- client/src/
|   |   |-- components/        # Shared UI components
|   |   |-- pages/
|   |   |   |-- citizen/       # Citizen PWA views
|   |   |   |-- officer/       # Officer dashboard
|   |   |   |-- transparency/  # Public dashboard
|   |   |   |-- research/      # Research dashboard
|   |   |-- layouts/           # Role-based layouts
|   |   |-- contexts/          # React contexts (theme, auth)
|   |   |-- hooks/             # Custom hooks
|   |   |-- data/              # Local demo data (to be replaced by API)
|   |   |-- types/             # TypeScript types
|   |
|   |-- server/
|   |   |-- routes/            # Express route handlers
|   |   |-- services/          # Business logic (issue, workflow, audit, etc.)
|   |   |-- ai/                # AI orchestrator, queue, rules, features
|   |   |-- db/                # Drizzle schema, migrations, seed
|   |   |-- middleware/        # Auth, validation, error handling
|   |   |-- utils/
|   |
|   |-- shared/                # Types shared between client and server
|
|-- pwa/                       # Standalone citizen PWA (Vite + React)
|   |-- src/pages/             # Mobile-first citizen pages
|   |-- src/components/        # PWA-specific components
|   |-- public/                # manifest.json, icons
|
|-- PRODUCT/                   # Product docs (PRD, SRS, API spec, data model)
|-- TEAM/
|-- MISTAKES.md
```

---

## Core Data Model

### Existing Tables (already in `server/db/schema.ts`)

| Table | Purpose |
|---|---|
| `users` | Citizens, officers, admins, researchers |
| `sessions` | Auth sessions |
| `wards` | Ward registry |
| `departments` | Department registry |
| `sla_policies` | SLA deadlines per (category, priority) |
| `issues` | Core issue records with location, status, category |
| `issue_media` | Before/after photos with privacy review state |
| `issue_supporters` | Citizens supporting an issue |
| `verification_votes` | Citizen votes on claimed fixes |
| `issue_duplicates` | Duplicate detection results |
| `status_events` | Hash-chained audit ledger |
| `model_predictions` | AI prediction records with versioning |
| `scorecard_snapshots` | Periodic ward/department performance snapshots |

### New Tables/Columns Needed for Novelty Features

```sql
-- N1: Ward Equity - add to wards table
ALTER TABLE wards ADD COLUMN ward_type TEXT; -- planned|unplanned|mixed|peri-urban
ALTER TABLE wards ADD COLUMN density_tier TEXT; -- high|medium|low
ALTER TABLE wards ADD COLUMN tax_band TEXT; -- A|B|C|D

-- N3: Adversarial Proof - add to issue_media table
ALTER TABLE issue_media ADD COLUMN perceptual_hash TEXT;
ALTER TABLE issue_media ADD COLUMN exif_lat DOUBLE PRECISION;
ALTER TABLE issue_media ADD COLUMN exif_lng DOUBLE PRECISION;
ALTER TABLE issue_media ADD COLUMN exif_timestamp TIMESTAMP;

-- N3: Adversarial flags
CREATE TABLE adversarial_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  flag_type TEXT NOT NULL, -- photo_reuse|temporal_impossible|gps_mismatch|bulk_closure|visual_inconsistency
  severity TEXT NOT NULL, -- low|medium|high
  details JSONB NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  review_outcome TEXT, -- confirmed|dismissed
  created_at TIMESTAMP DEFAULT NOW()
);

-- N4: Cascade detection results
CREATE TABLE cascade_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id TEXT REFERENCES wards(id),
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_m DOUBLE PRECISION,
  issue_ids JSONB NOT NULL, -- array of issue UUIDs
  categories JSONB NOT NULL, -- array of categories in cluster
  suggested_root_cause TEXT,
  confidence TEXT, -- low|medium|high
  status TEXT DEFAULT 'active', -- active|acknowledged|resolved
  created_at TIMESTAMP DEFAULT NOW()
);

-- FTE: Transparency Accountability Score snapshots
CREATE TABLE tas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT REFERENCES departments(id),
  ward_id TEXT REFERENCES wards(id),
  period TEXT NOT NULL,
  evidence_rate DOUBLE PRECISION,
  verification_response_rate DOUBLE PRECISION,
  update_frequency DOUBLE PRECISION,
  flag_rate DOUBLE PRECISION,
  reopen_rate DOUBLE PRECISION,
  ledger_integrity DOUBLE PRECISION,
  overall_tas DOUBLE PRECISION NOT NULL,
  method_version TEXT DEFAULT 'v1.0',
  snapshot_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Contracts

### Existing Routes (in `server/routes/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Mock auth login |
| `/api/auth/me` | GET | Current user |
| `/api/issues` | GET | List issues (with filters) |
| `/api/issues` | POST | Create issue (citizen) |
| `/api/issues/:id` | GET | Get single issue |
| `/api/issues/:id` | PATCH | Update issue (officer) |
| `/api/issues/:id/support` | POST | Support issue (citizen) |
| `/api/issues/:id/assign` | POST | Assign issue (officer) |
| `/api/issues/:id/status` | POST | Transition status (officer) |
| `/api/issues/:id/proof` | POST | Submit proof (officer) |
| `/api/issues/:id/verify` | POST | Cast verification vote (citizen) |
| `/api/issues/:id/timeline` | GET | Get hash-chain timeline |
| `/api/issues/:id/duplicates` | GET | Get duplicate candidates |
| `/api/issues/:id/ai/infer` | POST | Trigger AI inference |
| `/api/map` | GET | Public map data |
| `/api/scorecards` | GET | Ward/dept scorecards |
| `/api/transparency/*` | GET | Public transparency data |
| `/api/research/*` | GET | Research data |

### New Routes Needed

```
# FTE Routes
GET  /api/audit/verify/:issueId      # Public hash-chain verification
GET  /api/transparency/tas            # TAS scores per dept/ward
GET  /api/transparency/neglect-zones  # Wards with 5+ T2+ issues
GET  /api/transparency/equity         # Ward equity analysis data
GET  /api/transparency/cascades       # Active cascade alerts

# Adversarial Detection
GET  /api/research/flags              # All adversarial flags
GET  /api/research/flags/:issueId     # Flags for specific issue
POST /api/research/flags/:id/review   # Review a flag (admin/researcher)

# Cascade Alerts
GET  /api/officer/cascades            # Active cascades for officer dashboard
POST /api/officer/cascades/:id/ack    # Acknowledge a cascade
```

---

## Deployment (Development)

```yaml
# docker-compose.yml (extend existing)
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: nagardrishti
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: ./nagardrishti-frontend
    ports:
      - "5000:5000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgres://dev:devpass@db:5432/nagardrishti

volumes:
  pgdata:
```
