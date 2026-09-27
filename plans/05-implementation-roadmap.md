# 05 — Implementation Roadmap

> Staged build plan with priorities, milestones, and what to build when.
> 
> **Progress tracking:** Update the "Completion Status" column in each phase after completing work. Mark individual steps as DONE/IN-PROGRESS/BLOCKED. This file is the single source of truth for what's been built.

---

## Guiding Principles

1. **Vertical slice first** — citizen submits -> backend saves -> officer sees -> citizen sees timeline. Everything else builds on this.
2. **Novelty features are integrated, not afterthoughts** — FTE mechanisms are wired during the relevant stage, not bolted on at the end.
3. **Rule baselines before ML** — every AI module ships with a deterministic fallback before any model is trained.
4. **Test as you build** — each phase has a "done when" condition.

---

## Current State Assessment

| Component | Status |
|---|---|
| Plan documents (7 files) | DONE |
| Product docs (PRD, SRS, API) | DONE |
| DB schema (Drizzle) | DONE (schema.ts has all tables) |
| Backend routes and services | DONE (7 services, 6 route files) |
| Frontend UI shells (4 dashboards) | DONE (~90%) |
| PWA citizen app (3 pages) | DONE, 2 stubs (Map, Alerts) |
| PostgreSQL running + migrations applied | DONE |
| Frontend wired to backend API | DONE |
| FTE hash-chain verification API | NOT DONE |
| Novelty features (N1-N6) | NOT DONE |
| AI model training | NOT DONE |
| Tests | NOT DONE |

---

## Phase 1: Database + Vertical Slice [NOT STARTED]
_Estimated effort: 2-3 sessions_

> **Goal:** Citizen submits issue in PWA -> backend saves to PostgreSQL -> officer sees it in dashboard -> officer updates status -> citizen sees timeline. ALL through real API calls.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 1.1 | Get PostgreSQL running (Docker or local) | `nagardrishti-frontend/.env`, `docker-compose.yml` | DONE |
| 1.2 | Run Drizzle migrations + seed data | `server/db/seed.ts`, `drizzle.config.ts` | DONE |
| 1.3 | Start backend, verify API responds | `server/index.ts` | DONE |
| 1.4 | Create centralized API client for frontend | New: `client/src/lib/api.ts` | DONE |
| 1.5 | Wire CitizenPages to POST /api/issues | `client/src/pages/citizen/CitizenPages.tsx` | DONE |
| 1.6 | Wire OfficerPages to GET /api/issues + status updates | `client/src/pages/officer/OfficerPages.tsx` | DONE |
| 1.7 | Wire PublicPages to GET /api/map, /api/scorecards | `client/src/pages/transparency/PublicPages.tsx` | DONE |
| 1.8 | Wire ResearchPages to research endpoints | `client/src/pages/research/ResearchPages.tsx` | DONE |
| 1.9 | Wire PWA ReportIssuePage to POST /api/issues | `pwa/src/pages/ReportIssuePage.tsx` | DONE |
| 1.10 | Wire PWA HomePage + MyReportsPage to API | `pwa/src/pages/HomePage.tsx`, `MyReportsPage.tsx` | DONE |

### Done When
- [x] Create an issue in PWA -> it appears in officer dashboard
- [x] Officer changes status -> citizen sees updated timeline
- [x] Public dashboard shows the issue on a map
- [x] All data comes from PostgreSQL, zero local demo data usage

---

## Phase 2: Complete PWA + Hash-Chain Verification [NOT STARTED]
_Estimated effort: 1-2 sessions_

> **Goal:** PWA is fully functional (no stubs). Hash-chain audit trail is publicly verifiable.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 2.1 | Implement PWA MapPage with Leaflet | `pwa/src/pages/MapPage.tsx` | NOT DONE |
| 2.2 | Implement PWA AlertsPage | `pwa/src/pages/AlertsPage.tsx` | NOT DONE |
| 2.3 | Build audit verification API endpoint | New: `server/routes/audit.ts` | NOT DONE |
| 2.4 | Add verification UI to public timeline view | `client/src/pages/transparency/PublicPages.tsx` | NOT DONE |
| 2.5 | Wire citizen verification voting flow end-to-end | `CitizenPages.tsx`, `verificationService.ts` | NOT DONE |

### Done When
- [ ] PWA MapPage shows issues on a real Leaflet map
- [ ] PWA AlertsPage shows notifications for user's issues
- [ ] GET /api/audit/verify/:issueId returns chainValid: true
- [ ] Tampering with a statusEvent row -> verification detects break

---

## Phase 3: Inaction Amplification + Public Transparency [NOT STARTED]
_Estimated effort: 1-2 sessions_

> **Goal:** Public dashboard shows live escalating pressure. Neglect zones visible.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 3.1 | Implement inaction tier computation (query-time) | New: `server/services/inactionService.ts` | NOT DONE |
| 3.2 | Enrich map markers with tier badges (color-coded) | `PublicPages.tsx`, map components | NOT DONE |
| 3.3 | Build "Forgotten Issues" section (T3+ by supporters) | `PublicPages.tsx` | NOT DONE |
| 3.4 | Build "SLA Breach Wall" with live data | `PublicPages.tsx` | NOT DONE |
| 3.5 | Implement neglect zone detection | `server/routes/transparency.ts` | NOT DONE |
| 3.6 | Visualize neglect zones on public map | `PublicPages.tsx` | NOT DONE |

### Done When
- [ ] 15-day-old unresolved issue shows T3 badge on public map
- [ ] "Forgotten Issues" section shows oldest unresolved with supporter counts
- [ ] Ward with 5+ escalated issues shows "Neglect Zone" indicator

---

## Phase 4: Adversarial Proof Detection (N3) [NOT STARTED]
_Estimated effort: 2-3 sessions_

> **Goal:** System actively catches fake resolutions.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 4.1 | Add perceptual_hash, exif columns to issue_media | `server/db/schema.ts`, new migration | NOT DONE |
| 4.2 | Create adversarial_flags table | `server/db/schema.ts`, new migration | NOT DONE |
| 4.3 | Implement photo reuse detection (pHash) | New: `server/services/adversarialService.ts` | NOT DONE |
| 4.4 | Implement temporal impossibility detection | `adversarialService.ts` | NOT DONE |
| 4.5 | Implement GPS mismatch detection (EXIF) | `adversarialService.ts` | NOT DONE |
| 4.6 | Implement bulk closure anomaly (daily cron) | `adversarialService.ts` | NOT DONE |
| 4.7 | Wire flags to officer + research dashboards | `OfficerPages.tsx`, `ResearchPages.tsx` | NOT DONE |
| 4.8 | Block Verified Fixed if high-severity flags exist | `workflowService.ts` | NOT DONE |

### Done When
- [ ] Reused photo flagged, temporal impossibility flagged, bulk closures flagged
- [ ] High-severity flag blocks advancement to Verified Fixed

---

## Phase 5: Equity Analysis (N1) + Cascade Detection (N4) [NOT STARTED]
_Estimated effort: 2 sessions_

> **Goal:** Ward equity measured and published. Infrastructure cascades detected.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 5.1 | Add ward metadata columns + seed data | `schema.ts`, `seed.ts` | NOT DONE |
| 5.2 | Build equity analysis engine (weekly computation) | New: `server/services/equityService.ts` | NOT DONE |
| 5.3 | Build equity dashboard (heatmap + gap charts) | `PublicPages.tsx` | NOT DONE |
| 5.4 | Create cascade_alerts table | `schema.ts`, new migration | NOT DONE |
| 5.5 | Implement DBSCAN cascade detection (daily cron) | New: `server/services/cascadeService.ts` | NOT DONE |
| 5.6 | Build cascade UI (officer map + public dashboard) | `OfficerPages.tsx`, `PublicPages.tsx` | NOT DONE |

### Done When
- [ ] Equity page shows measurable gap between ward types
- [ ] Cascade alert: 3+ different categories within 500m -> root cause suggestion

---

## Phase 6: TAS Scoring + AI Baselines [NOT STARTED]
_Estimated effort: 2-3 sessions_

> **Goal:** Transparency scores computed. AI modules have trained baselines.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 6.1 | Implement TAS computation (weekly cron) | `scorecardService.ts`, new `tas_snapshots` table | NOT DONE |
| 6.2 | TAS dashboard (color-coded bands per department) | `PublicPages.tsx` | NOT DONE |
| 6.3 | Create synthetic training dataset (500+ complaints) | New: `ml/data/` | NOT DONE |
| 6.4 | Train M1 category classifier (TF-IDF + LogReg) | New: `ml/train_m1.py` or `server/ai/` | NOT DONE |
| 6.5 | Enhance M3 with TF-IDF text similarity | `server/ai/rules.ts`, `orchestrator.ts` | NOT DONE |
| 6.6 | Integrate Trust Score (N2) into M4 priority | `server/ai/rules.ts` | NOT DONE |
| 6.7 | Write model cards | New: `ml/cards/` | NOT DONE |

### Done When
- [ ] TAS scores visible on public dashboard
- [ ] M1 achieves >0.65 macro-F1 on held-out test
- [ ] M3 with text outperforms distance-only baseline
- [ ] Officer sees dynamic urgency scores with explanations

---

## Phase 7: Hardening + Testing [NOT STARTED]
_Estimated effort: 2 sessions_

> **Goal:** System is robust, tested, demo-ready.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 7.1 | API integration tests (lifecycle, flags, equity) | New: `tests/` | NOT DONE |
| 7.2 | PWA offline flow (IndexedDB + retry queue) | `pwa/src/` | NOT DONE |
| 7.3 | Security audit (no PII in public APIs) | All route files | NOT DONE |
| 7.4 | Mobile responsiveness + accessibility polish | All pages | NOT DONE |
| 7.5 | Seed script with 50+ realistic demo issues | `server/db/seed.ts` | NOT DONE |

### Done When
- [ ] npm test passes all tests
- [ ] Fresh docker-compose up + seed -> full demo works
- [ ] PWA saves drafts offline, syncs when reconnected
- [ ] No PII in any public API response

---

## Phase 8: Evaluation + Paper [NOT STARTED]
_Estimated effort: 3-4 sessions_

> **Goal:** All claims backed by evidence. Paper draft complete.

### Steps

| # | Task | Files | Status |
|---|---|---|---|
| 8.1 | Run full evaluation suite (all metrics tables) | `ml/evaluate/` | NOT DONE |
| 8.2 | Run ablation experiments | `ml/ablations/` | NOT DONE |
| 8.3 | Conduct usability study (15-30 participants) | - | NOT DONE |
| 8.4 | Generate figures and tables | - | NOT DONE |
| 8.5 | Write paper draft | - | NOT DONE |

### Done When
- [ ] All metrics tables populated
- [ ] Ablations show each component adds value
- [ ] Usability study completed with SUS > 68
- [ ] Paper draft complete

---

## Critical Path

```
Phase 1 --> Phase 2 --> Phase 3 --------------------------------> Phase 7 --> Phase 8
  (DB +       (PWA +      (Inaction +                               (Tests +    (Paper)
  Vertical    Hash-Chain   Transparency)                             Polish)
  Slice)      Verify)           |
                                |
                          Phase 4 --> Phase 5 --> Phase 6
                          (Adversarial) (Equity +   (TAS +
                                        Cascade)    AI Train)
```

Phases 1-3 are strictly sequential. Phases 4-6 can be parallelized. Phases 7-8 are final.

---

## Efficiency Tips

### Don't Do These (Time Traps)
- Don't build custom auth — mock auth with preset demo users is fine
- Don't optimize DB queries until Phase 7
- Don't train ML models before rule baselines work
- Don't add voice/speech input — text + photo first
- Don't add real-time WebSocket updates — polling is fine for prototype

### Do These (High ROI)
- Seed DB with 50+ realistic demo issues across multiple wards
- Build equity analysis early (Phase 5) — easiest novelty to demo
- Screenshot everything as you build — figures for the paper
- Keep MISTAKES.md updated — saves future sessions from repeating errors
