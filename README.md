# NagarDrishti (CivicLens)

> **Mobile-first public civic grievance platform with privacy-preserving issue mapping, proof-of-fix verification, citizen transparency, and explainable AI assist modules.**

---

## Overview

Civic grievance systems often suffer from a trust-collapse loop: filing is tedious, progress is invisible, "resolved" status lacks proof, and citizens disengage. **NagarDrishti** (research framing: **CivicLens**) addresses these challenges by offering:
- **Low-Friction Reporting**: Camera-first reporting with AI-assisted classification and multilingual support (English, Hindi, Marathi).
- **Proximity-Based De-duplication**: Nearby issue detection and support mechanism to consolidate duplicate complaints.
- **Accountable Closure**: Proof-of-fix requirement for claimed resolutions and a crowdsourced citizen verification voting system.
- **Systemic Transparency**: Ward and department scorecards, SLA-breach walls, and forgotten-issues prioritization without exposing personal identities.

---

## Core Architecture & Components

NagarDrishti is designed as a decoupled, modular system:
- **Frontend**: Responsive React Progressive Web App (PWA) tailored for mobile citizens and officers.
- **Backend API**: Python FastAPI service with PostgreSQL / PostGIS for geospatial data and lifecycle management.
- **AI Modules (M1–M6)**:
  - **M1**: Multi-class category classification (8 core categories).
  - **M2**: Object & severity detection from image media.
  - **M3**: Department routing and urgency scoring.
  - **M4**: Geospatial & textual duplicate clustering.
  - **M5**: Proof-of-fix authenticity validation.
  - **M6**: Ward/department aggregate analytics and anomaly detection.
- **Public & Officer Consoles**: Role-gated mock municipal triage and public transparency portals.

---

## Repository Structure

```text
.
├── PRODUCT/
│   ├── prd.md                    # Product Requirements Document
│   ├── system-architecture.md    # End-to-end system architecture specification
│   ├── api-spec.md               # REST API endpoints & data models specification
│   ├── data-model-schema.md      # PostgreSQL/PostGIS database schema definitions
│   └── srs.md                    # Software Requirements Specification
├── TEAM/
│   ├── 12-week-plan.md           # Milestone roadmap & weekly sprint goals
│   ├── roles-and-workflow.md     # Team responsibilities & Git branching strategy
│   ├── engineering-conventions.md# Code style, commit conventions, and QA standards
│   ├── risk-register.md          # Technical & product risk mitigation matrix
│   └── definition-of-done.md     # Quality gates & verification checklists
├── extras/
│   ├── tech-stack-decisions.md   # Architectural Decision Records (ADRs)
│   ├── deployment-and-cost.md    # Infrastructure, hosting, and cost estimates
│   ├── demo-script.md            # Evaluator & video demonstration walkthrough
│   └── ip-and-patent-notes.md    # Prior art research & IP strategy notes
├── .gitignore
├── MISTAKES.md                   # Project mistake log & lessons learned
└── README.md                     # Main repository documentation
```

---

## 12-Week Development Roadmap

| Phase | Timeline | Core Deliverables |
|---|---|---|
| **Phase 1: Foundation** | Weeks 1–4 | Database schema, mock auth, photo intake PWA, coarse geospatial mapping. |
| **Phase 2: Workflow & Verification** | Weeks 5–6 | Officer triage console, proof-of-fix uploads, citizen verification & reopen rules. |
| **Phase 3: AI Modules Baseline** | Weeks 7–9 | M1–M4 baseline models, M5 proof validation flags, asynchronous inference pipeline. |
| **Phase 4: Analytics & Hardening** | Weeks 10–12 | M6 scorecard snapshots, SLA breach wall, security redaction, and demo execution. |

---

## Getting Started & Engineering Standards

### Documentation Reading Order
1. Read [`PRODUCT/prd.md`](PRODUCT/prd.md) for product goals and scope boundaries.
2. Review [`PRODUCT/system-architecture.md`](PRODUCT/system-architecture.md) for high-level technical architecture.
3. Consult [`TEAM/engineering-conventions.md`](TEAM/engineering-conventions.md) for coding guidelines and Git practices.

---

## License

This project is created for academic research and evaluation (SEM 5 AI Capstone Project).
