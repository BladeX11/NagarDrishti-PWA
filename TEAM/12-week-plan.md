# NagarDrishti Team Plan: 12 Weeks

**Start:** Monday, 24 August 2026. **Team:** four BTech students. **Research name:** CivicLens. **Paper target:** a complete submission package after Week 10; Weeks 11–12 are revision and demo hardening, not the first time paper work starts.

## Scope guardrails

The v1 demo is a mobile-first PWA with a mock officer console, public issue map, department/ward scorecards, and the proof-of-fix workflow. It must work with public proxy, synthetic (clearly labelled), and self-collected data; municipal cooperation is a bonus, never a dependency. It covers exactly these issue categories: **pothole/road, garbage/waste, drainage/sewage, water supply, streetlight/electrical, stray animals, encroachment, other**. It does not integrate live PMC/CPGRAMS systems, score named officers, audit spending, or make legally binding claims.

## Roles and allocation

| Role                                   | Accountable scope                                                       | Primary modules                 | Weekly pattern                                                                     | Approx. share |
| -------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------: |
| **R1 Data & NLP Lead**                 | Dataset cards, annotations, M1 and M3 evaluation, paper methods/results | M1, M3, M7 stretch              | Data QA early; modelling Weeks 3–8; evaluation and paper Weeks 9–12                |           25% |
| **R2 Vision & Verification Lead**      | Image dataset, M2, M5 adversarial set and verifier                      | M2, M5                          | Image pipeline early; verifier integration Weeks 6–8; demo robustness late         |           25% |
| **R3 Backend & Data Engineering Lead** | Schema, PostGIS, API, queue, audit ledger, deployment                   | M4 integration, M6 data layer   | Foundation Weeks 1–4; full workflow Weeks 5–8; reliability Weeks 9–12              |           25% |
| **R4 Frontend, Maps & Paper Lead**     | PWA, maps, mock officer console, study materials, paper assembly        | M6 visualisation, M7 UI stretch | UX/map baseline early; product integration Weeks 5–8; user study, paper, demo late |           25% |

Each person owns their row of the weekly map, reviews at least one other person’s PR per week, and may not silently take a blocked task without recording it as an issue.

## Phases and gates

| Phase | Weeks / dates | Objective | Non-negotiable gate |
|---|---|---|---|
| **Phase 1: foundation and baselines** | Weeks 1–4, 24 Aug–20 Sep | Freeze taxonomy/privacy/data contracts; build reproducible M1/M2/M4/M5 baselines and the thin report-to-map path. | A seeded report can be classified, safely displayed, and traced through a status timeline; baseline metrics and limitations are written. |
| **Phase 2: integration and full pipeline** | Weeks 5–8, 21 Sep–18 Oct | Connect async inference, duplicate suggestion, proof evidence, citizen confirmation, reopen rule, scorecards, and Docker run path. | Scripted path succeeds from report through claimed resolution to verified/reopened state; system has a smoke test and frozen candidate metrics. |
| **Phase 3: evaluation, user study, paper and demo** | Weeks 9–12, 19 Oct–15 Nov | Evaluate all retained modules, run the small user study, complete the paper package after Week 10, rehearse and harden final demo. | Submission-ready paper and recording exist at Week 10; release tag, offline fallback, and two successful rehearsals exist by Week 12. |

## Week-by-week execution plan

| Week | Dates        | Theme                       | Deliverables and owner                                                                                                                                                                                    | Exit criteria                                                                                                                                           |
| ---: | ------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | 24–30 Aug    | Scope, repo, data contracts | R1: label guide and 8-category taxonomy; R2: image-source/data-consent plan; R3: FastAPI/PostGIS skeleton and status-event schema; R4: clickable report-flow/map wireframe                                | Repo runs locally; 20 representative records exist; all fields, categories, and privacy rules signed off                                                |
|    2 | 31 Aug–6 Sep | Baselines and corpus        | R1: multilingual text corpus v0 plus TF-IDF+SVM baseline; R2: image dataset manifest plus MobileNet baseline; R3: issue/report/media/status API contracts; R4: PWA shell and Leaflet map with seeded pins | Baselines have a metric file; API serves seeded data; PWA renders active issues snapped to cells/segments                                               |
|    3 | 7–13 Sep     | Core data and workflows     | R1: M1 fine-tuning plan/run; R2: before/after pairs and perceptual-hash reuse check; R3: PostGIS duplicate candidate query and hash-chained event prototype; R4: report form, support-nearby issue UI     | One complaint can be submitted, classified by baseline, displayed publicly without identity or exact doorstep                                           |
|    4 | 14–20 Sep    | Foundation checkpoint       | R1: M1 language/category evaluation and error slice; R2: M2 evaluation and M5 attack cases; R3: M4 baseline clustering plus queue stub; R4: issue detail/status timeline and scorecard skeleton           | **Phase 1 gate:** end-to-end seeded path works; baselines and limitations are documented; de-scope decision made if a core metric is weak               |
|    5 | 21–27 Sep    | Full pipeline I             | R1: explainable M3 hybrid urgency rules; R2: M2 inference service; R3: async job orchestration, media metadata checks; R4: intake auto-fill and duplicate-join flow                                       | Intake creates an async job; category/urgency/duplicate suggestion return in UI; failures are visible and recoverable                                   |
|    6 | 28 Sep–4 Oct | Full pipeline II            | R1: M1/M3 model cards; R2: M5 embedding-change and wrong-location checks; R3: proof-of-fix endpoint, citizen confirmation and auto-reopen rule; R4: mock officer proof upload and citizen yes/no screen   | A proof upload cannot become **Verified Fixed** on officer assertion alone; 2+ nearby “no” votes reopens it                                             |
|    7 | 5–11 Oct     | Transparency layer          | R1: M6 spike/equity calculation specification; R2: verifier threshold calibration; R3: scorecard aggregation and SLA-breach job; R4: ward/department scorecards, forgotten-issues feed                    | Map, scorecards, proof-of-fix and reopening share one consistent data model and visible status history                                                  |
|    8 | 12–18 Oct    | Integration and hardening   | R1: multilingual ablation and final M1/M3 tables; R2: M2/M5 final test split and adversarial suite; R3: Docker compose, smoke test, adapter interface; R4: mobile QA and study prototype                  | **Phase 2 gate:** scripted full pipeline succeeds from report through verified/reopened; reproducible metrics freeze candidate                          |
|    9 | 19–25 Oct    | Evaluation and user study   | R1: M1/M3 evaluation narrative; R2: M2/M5 precision/recall; R3: simulated SLA/reopen system metrics; R4: 15–20 participant time-to-file/trust study and consent script                                    | Metrics table has provenance; participant data is de-identified; paper figures and limitations draft exist                                              |
|   10 | 26 Oct–1 Nov | Paper freeze and rehearsal  | R1: methods/data sections; R2: verifier results/figures; R3: architecture/reproducibility appendix; R4: integrates full paper, 7-minute demo script, recording                                            | **Critical gate:** submission-ready paper, reproducibility bundle, and recorded demo exist by Sunday; target submission follows team/venue verification |
|   11 | 2–8 Nov      | Buffer, review, polish      | R1: respond to internal review; R2: improve only evidence-backed weak point; R3: deployment/backup drill; R4: usability fixes and slide deck                                                              | All P0/P1 defects closed or deliberately accepted; two consecutive demo rehearsals pass                                                                 |
|   12 | 9–15 Nov     | Final delivery              | R1: final model cards/data statement; R2: verify adversarial “fake fix” demo; R3: final release tag and offline pack; R4: presentation lead, final demo and README                                        | Final tag reproduces the path; all deliverables have owners, run instructions, limitations, and no secrets                                              |

## Parallelisation map

| Week | R1 Data & NLP        | R2 Vision & Verification | R3 Backend & Data Engineering | R4 Frontend, Maps & Paper |
| ---: | -------------------- | ------------------------ | ----------------------------- | ------------------------- |
|    1 | Label guide          | Image/consent plan       | Schema/API scaffold           | Wireframes                |
|    2 | M1 baseline          | M2 baseline              | Seed API                      | PWA/map shell             |
|    3 | M1 run               | pHash verifier           | M4 candidates/ledger          | Report/support UI         |
|    4 | M1 error analysis    | M2/M5 tests              | Clustering/queue              | Detail/timeline           |
|    5 | M3 rules             | Inference service        | Async jobs                    | Auto-fill/join            |
|    6 | Model cards          | M5 checks                | Fix/reopen API                | Officer/citizen screens   |
|    7 | M6 spec              | Threshold tuning         | Aggregations/SLA job          | Scorecards/feed           |
|    8 | Ablation             | Test suite               | Docker/smoke                  | Mobile QA/study prep      |
|    9 | NLP results          | Vision results           | System metrics                | User study/figures        |
|   10 | Methods              | Results                  | Architecture appendix         | Paper/demo integration    |
|   11 | Review revisions     | Targeted polish          | Deployment drill              | Slides/usability          |
|   12 | Cards/data statement | Fake-fix proof           | Release/offline pack          | Present/demo              |

## Dependencies and critical path

```text
Taxonomy + label guide
  -> clean labelled records + media manifest
  -> M1/M2 baselines and API contracts
  -> async inference + M4 candidate generation
  -> report/duplicate-join workflow
  -> proof-of-fix verification + status ledger + citizen confirmation
  -> scorecards/system metrics + full scripted pipeline
  -> evaluation, user study, paper and demo
```

* Blocks: R1’s taxonomy blocks labels, M1 routing, M3 explanations, and scorecards. R3’s schema/status ledger blocks every integrated workflow. R2’s adversarial M5 cases block the central accountability claim. R4’s map/workflow blocks the user study and final demo.
* **Critical path:** taxonomy/data contract → reproducible M1/M2 baselines → API and async workflow → M5 proof-of-fix/reopen flow → full pipeline by Week 8 → evaluation and user study → paper package in Week 10. No cosmetic feature may displace a critical-path task.
* Use mock/offline data whenever model or hosting work is blocked; integration interfaces return an explicit `pending` or `failed` inference state rather than inventing a result.

## Weekly operating rhythm

* **Monday, 30 minutes:** review last week’s exit criteria; pick one measurable outcome per person; identify dependencies; update the issue board.
* **Thursday, demo-or-die, 20 minutes:** every owner shows a running artifact, metric, or written blocker. “Almost done” is not a demo. If it cannot run, show the failing command and next recovery action.
* **Sunday, written status in the repository:** each role commits a short status note: shipped, metric/result, blockers, next week, and a red/amber/green confidence. R4 consolidates without erasing dissent.

## Buffers and de-scope ladder

Weeks 11–12 are the primary buffer. Week 4’s gate and Week 8’s gate are controlled scope-review points. Do not spend buffer on a speculative model before the core workflow works.

If behind, cut in this order:

1. **M7 voice intake**; retain typed Marathi/Hindi/English intake.
2. Optional M2 detection boxes; retain image classification or metadata-only UI, clearly labelled.
3. Advanced M6 forecasting; retain simple, explainable spike/backlog and equity summaries.
4. Complex officer-console assignment tools; retain the mock proof upload and queue.
5. Extra deployment targets and live hosting; retain Docker/local plus one stable hosted demo.
6. Any effort to seek municipal integration; retain only an adapter interface.

Never cut: privacy snapping, eight-category taxonomy, visible status history, duplicate suggestion baseline, proof-of-fix checks, the 2+ nearby-citizen auto-reopen rule, reproducible evaluation, or an honest data statement.

## Week 0 checklist (finish before 24 August)

- [ ] Confirm the four role assignments, availability constraints, exam dates, and preferred communication channel.
- [ ] Create GitHub repository, issue board, protected `main`, project board labels, and shared calendar.
- [ ] Add Python/Node versions, `.gitignore`, `.env.example`, `README.md`, contributor guide, and licence decision placeholder.
- [ ] Establish exact issue taxonomy and controlled values for department, ward/cell, and the agreed status enum; use **Verified Fixed** and **Reopened** exactly where applicable.
- [ ] Decide the privacy rule: no personal identity on public views; snap map locations to an H3 cell/street segment; strip or limit image metadata in public assets.
- [ ] Create a 20-record seed fixture across all eight categories and three intake languages; mark synthetic records visibly.
- [ ] Create a shared consent and field-data protocol; no faces, vehicle plates, private residences, or identifiable reporter data in demo data.
- [ ] Confirm local setup on all four laptops: Git, Python, Node, Docker where available, and a Colab fallback.
- [ ] Reserve two field-data collection windows and name the fallback campus-only collection area.
- [ ] Create `docs/decision-log.md`, risk register issue, and the Sunday status template.
