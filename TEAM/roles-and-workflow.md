# NagarDrishti Roles and Workflow

## Operating principles

Build a small, inspectable v1. Claim only what the data and tests demonstrate. Public pages show aggregated ward/department information, no named officers or reporter identity. All team members protect the fixed eight-category taxonomy and the proof-of-fix rule: an officer upload alone never produces **Verified Fixed**; citizen confirmation can reopen a ticket.

### Canonical lifecycle vocabulary

Use these stored/API status values exactly: `open`, `triaged`, `assigned`, `in_progress`, `claimed_resolved`, `verified_fixed`, `reopened`, `rejected`, `duplicate_merged`. UI may render them as readable title case, for example **Verified Fixed** and **Reopened**, but must not invent a parallel status such as “resolved” or “closed.” `claimed_resolved` means evidence has been submitted and remains subject to the verification workflow.

## Role charters and decision rights

| Role | Concrete responsibilities | Can decide alone | Must consult / escalate |
|---|---|---|---|
| **R1 Data & NLP Lead** | Define annotation guide; maintain dataset cards; train/evaluate M1 and M3; document language slices; review synthetic-data disclosures; write methods/results. | Label corrections within the approved taxonomy; M1/M3 experiment parameters; data-quality rejection. | New label/department, model claim, or synthetic-data use: consult all; privacy concern: escalate immediately. |
| **R2 Vision & Verification Lead** | Maintain image manifest and consent checks; train/evaluate M2; build M5 reuse, embedding-change, and metadata checks; create adversarial fake-fix set; write M2/M5 cards. | Image preprocessing, verifier thresholds backed by held-out validation, test cases. | Any change to proof-of-fix rule: R3/R4; potentially sensitive image: stop use and escalate. |
| **R3 Backend & Data Engineering Lead** | Own schemas, PostGIS, API contracts, job queue, audit/status ledger, test fixtures, Docker and backups; integrate M4/M6 outputs. | Internal implementation, migrations, API error format, deployment config that preserves contract. | Public API/status change: R4 and R1/R2 as relevant; deletion/privacy incident: all team. |
| **R4 Frontend, Maps & Paper Lead** | Own mobile PWA, Leaflet/OSM map, public privacy presentation, mock officer console, scorecards, accessibility, study materials, paper assembly and demo. | Interaction/layout within approved privacy/status rules; deck and narrative order. | New user-visible claim, map precision, scorecard interpretation: consult role owner and all for risks. |

Any member can stop a release for a privacy, security, defamation, plagiarism, or unsupported-claim risk. The team then records the decision before resuming.

## RACI by workstream

R = does the work; A = final accountable decision; C = consulted before decision; I = informed.

| Workstream | R1 | R2 | R3 | R4 |
|---|---:|---:|---:|---:|
| Taxonomy, annotation guide, dataset cards | A/R | C | I | C |
| Field-data consent and image privacy | C | A/R | C | C |
| M1 text classification and M3 urgency | A/R | C | C | C |
| M2 image classification and M5 verifier | C | A/R | C | C |
| M4 duplicate clustering | C | C | A/R | C |
| M6 metrics/spikes/equity display | C | I | A/R | R |
| Database, audit ledger, API, queues | C | C | A/R | I |
| PWA, map, public and mock officer interfaces | C | C | C | A/R |
| User study, consent copy, analysis | C | C | I | A/R |
| Paper data/methods/results | R | R | R | A |
| Demo, release, deployment drill | C | C | R | A/R |
| Scope, ethics, high-risk changes | C | C | C | A (facilitates consensus) |

## Git workflow

### Branches and pull requests

* `main` is always demonstrable. Direct pushes are prohibited.
* Branch names: `feat/M5-proof-verifier`, `fix/api-status-transition`, `data/m1-label-audit`, `docs/week-04-status`, `chore/pin-requirements`.
* Every change lands through a PR. Use a draft PR within one working day for a task longer than two days.
* One approval is required for routine code. Changes to schemas, public status transitions, privacy, scorecards, dataset releases, CI, deployment, or paper claims require **two** approvals, including the accountable role.
* PR author runs tests and fills the template. Reviewer checks the checklist below. Rebase or merge cleanly; delete the branch after merge.
* Do not merge with unresolved comments, a failed required check, unreviewed generated output, or secret-like content.

### Commit convention

Use Conventional-Commit-style messages with a short scope:

```text
feat(m5): reject reused after-photo hashes
fix(api): retain reopen reason in status event
 data(m1): correct 18 Marathi category labels
docs(paper): qualify synthetic-data limitation
test(duplicates): add same-location golden fixture
chore(dev): pin Python dependencies
```

One logical change per commit. Commit messages state what changed, not what was discussed.

## Repository structure

```text
nagardrishti/
├── apps/
│   ├── api/                    # FastAPI application
│   └── web/                    # mobile-first React PWA
├── src/nagardrishti/
│   ├── contracts/              # pydantic request/response/status models
│   ├── data/                   # loaders, validation, privacy transforms
│   ├── ml/                     # m1_text ... m6_analytics modules
│   ├── services/               # orchestration and business rules
│   └── settings.py
├── tests/
│   ├── unit/
│   ├── api_golden/
│   └── fixtures/
├── data/
│   ├── raw/                    # ignored or pointer only
│   ├── interim/
│   └── processed/
├── models/                      # registry metadata; large weights excluded
├── notebooks/                   # exploration only
├── scripts/                     # seed, smoke, export, backup helpers
├── infra/                       # compose, deployment, CI assets
├── docs/                        # decisions, model cards, data cards, study
└── README.md
```

## Issues, labels, and blockers

Create an issue before starting any work that could take more than 90 minutes. Every issue contains: context, acceptance criteria, owner, deadline/week, dependency, test/evidence, and privacy/data classification.

| Label family | Values |
|---|---|
| Area | `area:m1` … `area:m7`, `area:api`, `area:web`, `area:data`, `area:paper`, `area:infra` |
| Type | `type:feature`, `type:bug`, `type:research`, `type:docs`, `type:chore` |
| Priority | `p0-blocker`, `p1-this-week`, `p2-next`, `p3-icebox` |
| State | `blocked`, `needs-review`, `needs-decision`, `good-first-task` |
| Risk | `risk:privacy`, `risk:ethics`, `risk:academic`, `risk:demo` |

A blocker issue begins with `BLOCKED:` in the title, names the blocking dependency and owner, proposes a fallback, and is raised within 24 hours. Do not wait for Thursday if it threatens a weekly exit criterion.

## Standups and escalation

Monday planning is the weekly standup. Each person has at most three minutes:

1. Last week: demonstrated result or metric.
2. This week: one primary outcome and one supporting task.
3. Blocker: ask, owner, deadline, and fallback.
4. Risk: what could invalidate the result or claim.

Thursday is evidence-only: running feature, plot, test result, or failing command. The facilitator opens an issue for every unresolved blocker. If no decision is reached in 15 minutes, R4 records options and the accountable role decides by the next day; privacy/ethics risks use the conservative option.

## Code review checklist

- [ ] Change is small enough to understand; issue and acceptance criteria are linked.
- [ ] Category values are only the eight approved categories; department/ward/status contracts are unchanged or deliberately migrated.
- [ ] Public responses reveal no name, contact, exact doorstep, unblurred face/plate, or unsupported officer-level score.
- [ ] M5 still requires evidence and citizen confirmation before **Verified Fixed**; reopening logic is tested.
- [ ] Input validation, error response, logging, and failure paths are present.
- [ ] Tests cover normal case, bad input, and one regression/golden case where relevant.
- [ ] Models/data have version identifiers and no raw private data or secrets are committed.
- [ ] Results are not cherry-picked; metric changes include test set and seed.
- [ ] Docs/README/API example are updated when behavior changes.

## When a teammate falls behind

1. Notice early: missed Thursday evidence, no update for 48 hours, or repeatedly unfinished tasks triggers a private check-in, not public blame.
2. Re-plan the task into a 60–120 minute deliverable with a clear definition of done; uncover a dependency or skill gap.
3. Pair for one focused session. Transfer a narrow subtask only after documenting the handoff in the issue.
4. Protect the person’s ownership of a bounded, finishable artifact. Reduce noncritical work using the de-scope ladder before redistributing core work.
5. If exams, illness, or absence makes delivery impossible, R4 calls a scope review; reassign the accountable role temporarily, record it, and revise the week exit criterion honestly.

## Shared decision log

Keep `docs/decision-log.md` append-only. One decision per entry.

```markdown
## D-YYYY-MM-DD-Short-title
- **Date / proposer:**
- **Decision needed:**
- **Context and evidence:**
- **Options considered:**
- **Decision and owner:**
- **Consequences / trade-offs:**
- **Revisit trigger:**
- **Links:** issue, PR, experiment, screenshot
```

### Worked entry 1

```markdown
## D-2026-08-25-location-privacy
- **Date / proposer:** 25 Aug 2026, R4
- **Decision needed:** What precision is shown on the public map?
- **Context and evidence:** Exact pins could expose a reporter’s home. The public map only needs nearby issue visibility.
- **Options considered:** exact point; street segment; H3 cell.
- **Decision and owner:** Use H3 cell/street-segment display; R3 implements a server-side public-location field and R4 never renders raw coordinates.
- **Consequences / trade-offs:** Duplicate matching keeps controlled-precision coordinates internally; public users see less exact placement.
- **Revisit trigger:** Only after a documented privacy review and consent model.
- **Links:** #12, PR #18
```

### Worked entry 2

```markdown
## D-2026-09-30-proof-status-rule
- **Date / proposer:** 30 Sep 2026, R2
- **Decision needed:** Can an officer photo set a ticket to Verified Fixed?
- **Context and evidence:** The core trust claim requires more than officer assertion; M5 can flag but cannot prove every repair.
- **Options considered:** officer assertion; AI-only decision; evidence plus citizen confirmation.
- **Decision and owner:** Evidence upload enters resolution review; only the existing verification workflow may show **Verified Fixed**. Two or more nearby citizen “no” responses trigger **Reopened**. R3 owns enforcement; R2 owns test set.
- **Consequences / trade-offs:** The mock officer flow is slower, but the accountability claim is defensible.
- **Revisit trigger:** No change in v1 without team approval and a paper limitation update.
- **Links:** #47, PR #61, `docs/model-cards/m5.md`
```
