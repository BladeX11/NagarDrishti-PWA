# NagarDrishti Definition of Done

“Done” means usable, reviewed, reproducible, and evidenced. A screenshot, an unpushed notebook, or a claim without a measurement is not done.

## Level 1: individual task

A task is done only when all apply:

- [ ] It has an issue with scope, owner, acceptance criteria, dependencies, and risk label where relevant.
- [ ] Implementation, document, dataset change, or experiment is committed on a branch and merged through the required review.
- [ ] The result meets the stated acceptance criteria and includes evidence: test output, run ID, figure, API response, or reviewed document section.
- [ ] Inputs/outputs and failure behavior are documented; relevant tests pass.
- [ ] Privacy, category taxonomy, public-location rule, status transition, and unsupported-claim checks are passed.
- [ ] Follow-up/debt is recorded as a separate issue, not hidden in “done.”

## Level 2: weekly sprint

A week is done when:

- [ ] Every planned deliverable has a demoable artifact or an explicit, approved re-plan.
- [ ] The weekly exit criterion in `12-week-plan.md` is met and demonstrated on Thursday/Sunday.
- [ ] `main` passes required tests; no P0 blocker is open without a documented contingency.
- [ ] Each role has posted Sunday status: shipped, evidence/metric, blocker, next action, confidence.
- [ ] New decisions, risks, models, datasets, and claims are reflected in their logs/cards.
- [ ] The next week has no hidden dependency; owners and fallback are named.

## Level 3: project deliverable

A project deliverable is done when it can be reproduced by a teammate from a clean checkout, is understandable to an examiner, and makes only claims supported by its data. It includes run instructions, ownership, limitations, and an offline/demo fallback where applicable.

## Acceptance checklists

### AI module (M1–M6; M7 only if retained)

- [ ] Task and output contract are explicit; categories are the approved eight where applicable.
- [ ] Training/evaluation data release, source type (public proxy/synthetic/self-collected), licence/consent status, split rule, and manifest hash are recorded.
- [ ] A simple baseline is trained and compared on the same held-out split.
- [ ] Candidate is trained with logged command, commit SHA, seed, dependency lock, parameters, and artifact path.
- [ ] Evaluation reports the relevant metric: M1 macro-F1 by category/language; M2 precision/recall or mAP; M3 ranking quality/explanation; M4 pairwise precision/recall/F1 and purity; M5 adversarial false-resolution precision/recall; M6 explainable system calculations.
- [ ] Error slices and known failure cases are reviewed; no cherry-picked examples substitute for metrics.
- [ ] Model card and registry entry exist, including limitation and rollback/baseline.
- [ ] Code is moved out of notebooks, has a deterministic evaluation command, tests pass, and PR is merged.
- [ ] M5 is not represented as conclusive truth; it flags plausibility/suspicion and works with citizen confirmation.

### API endpoint

- [ ] Route has a Pydantic request/response contract, validation, auth/role handling where needed, and documented status/error codes.
- [ ] It never expose reporter identity, contact data, raw exact coordinates, or sensitive media in a public response.
- [ ] It enforces valid issue/status transitions. In particular, officer evidence alone cannot produce **Verified Fixed**; required verification and automatic **Reopened** logic are tested.
- [ ] Database migration/repository code is reviewed; idempotency/conflict behavior is clear for writes.
- [ ] Structured logs carry safe request/issue context; errors are actionable and do not leak secrets.
- [ ] Unit/integration tests and an API golden JSON fixture pass; README/API example is updated.

### UI screen

- [ ] It has a named user goal and a tested click path on a small mobile viewport.
- [ ] It uses only the eight issue categories and approved status labels; unknown model results are shown as pending/uncertain, not fact.
- [ ] Public map location is snapped/aggregated and shows no name, phone, exact doorstep, or unreviewed image.
- [ ] Empty, loading, failed, and slow-network states are designed; error action is clear.
- [ ] Keyboard/basic accessibility and readable contrast are checked; no critical action relies only on colour.
- [ ] API contract is stable or versioned; a screenshot and manual QA note are attached to the issue/PR.

### Dataset release

- [ ] Folder name, immutable manifest, checksums, dataset card, licence/permission, and source types are present.
- [ ] Synthetic records are explicitly marked; self-collected records have consent/privacy review; unsafe images are excluded or appropriately transformed.
- [ ] Labels follow the guide; sampled records are independently checked; duplicate/leakage checks and split logic are documented.
- [ ] No raw contact data, exact private locations, faces/plates, or inappropriate material is released.
- [ ] Intended use, prohibited use, bias/coverage limitations, and removal/contact process are stated.

### Paper draft

- [ ] Title uses NagarDrishti for product and CivicLens for research; v1 non-goals are respected.
- [ ] Abstract, problem, method, evaluation, limitations, ethics/privacy, and conclusion are complete; no unverified external statement is inserted.
- [ ] Every number/figure/table points to a run ID, dataset release, or script; synthetic/public/self-collected provenance is clear.
- [ ] Metrics include baselines and relevant category/language/adversarial/system/user-study slices.
- [ ] Claims distinguish prototype, simulated workflow, and any actual user-study evidence; no claim of live municipal deployment/cooperation without proof.
- [ ] Two teammates review technical accuracy and one reviews clarity/originality; final format/venue requirements are team-verified.

### Final demo

- [ ] A 7-minute scripted flow works from a fresh seeded state: intake → auto-fill/duplicate suggestion → map/status → officer proof → verifier flags a fake/reused/stale/wrong-location case → citizen feedback/reopen → scorecard/history.
- [ ] The demonstration clearly labels synthetic/mock components and uses only safe data.
- [ ] It shows the single “wow” moment without falsely claiming AI certainty or municipal connection.
- [ ] Local/hosted setup, cached assets, seeded database, test account, screen recording, static screenshots, and offline fallback are prepared.
- [ ] Two full rehearsals pass with a timer; each teammate knows a speaking and recovery role.
- [ ] Release tag, runbook, README, model/data cards, and backup are complete.

## Not-done anti-patterns

* “Works on my laptop” with no command, lockfile, test, or peer run.
* A notebook result presented as a production feature.
* Accuracy reported without macro-F1, language/category slice, baseline, test split, or seed.
* A map screenshot showing raw home-like pins or identifiable people.
* A ticket set to **Verified Fixed** directly from a mock officer upload.
* A model silently guessing after inference fails.
* Synthetic records presented as municipal or real-citizen data.
* A PR merged without review because the deadline is close.
* A paper chart copied manually with no run/data provenance.
* “Future work” implemented late while the core workflow, evaluation, or demo path remains broken.
