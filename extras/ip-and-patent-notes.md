# NagarDrishti IP and Patenting Notes (India-Focused Student Team)

## Important caution

This is a planning note, **not legal advice**. Software/AI patentability, disclosure timing, ownership, college policy, employment/internship obligations, licences, and filing requirements can be fact-specific. The team should consult its college IPR cell and, if appropriate, a qualified Indian patent professional before relying on any filing or licence decision. Where legal detail is uncertain, **team to verify with the college IPR cell**.

## Conceptual framing: what may matter

At a high level, a bare idea, app name, abstract algorithm, training data collection, or a generic “AI complaint classifier” may be difficult to protect as a patentable invention. A technically specific system/process that produces a demonstrated technical effect or solves a defined technical problem may be a stronger candidate, but the applicable tests and practice must be verified with the college IPR cell.

For NagarDrishti, do not anchor an invention disclosure on M1 or M2 alone. Multilingual classification, image classification, embeddings, and clustering are useful research components but are likely easier for reviewers to view as known building blocks. The more coherent potential invention angle is the **combined proof-of-fix verification loop**:

1. before/after evidence capture and restricted metadata handling;
2. reuse/staleness/location/visual-change checks that produce a reviewable suspicion signal;
3. an append-only, hash-chained status-event ledger;
4. citizen confirmation prompts and the rule that two or more nearby negative confirmations cause **Reopened**;
5. ward/department, rather than named-officer, scorecards with equity-aware aggregate signals.

This still may or may not be protectable; novelty, inventive step, technical character, prior art, and ownership are all **team to verify**. The useful exercise is to describe a concrete mechanism, alternatives, evidence flow, and technical effect, rather than say “use AI for civic complaints.”

## What to preserve now

- Keep an inventor-contribution log: person, date, contribution, experiment/PR/diagram, and whether it was independently conceived or adapted.
- Preserve dated design notes, decision log entries, test results, data/model versions, and architecture diagrams in the repository.
- Keep a prior-art/questions list for the IPR cell; do not claim a novelty search is complete unless it is actually verified.
- Confirm whether the college, student team, internship employer, grant terms, or open-source contributors affect ownership before public release.
- Treat Git timestamps as useful records, not a substitute for formal legal advice or a filing.

## Publishing a paper and filing: conservative sequence

Public disclosure can affect patent strategy. The conservative project sequence is: **identify the candidate invention → document it → consult the college IPR cell → decide whether to file → only then publish/post slides, paper preprint, public repository details, demo video, or conference material that reveals the enabling mechanism**. Exact timing and any exception/filing requirement are **team to verify** with the college IPR cell.

For the Week 10 paper package, maintain two variants if needed: a full internal technical disclosure and a publication draft reviewed for what it reveals. Do not delay the course submission without faculty direction, but do not assume a later filing is unaffected by an earlier public paper, GitHub repository, or presentation.

## Provisional-style invention disclosure template

This is an internal drafting template, not a filing form. Fill factual fields precisely; avoid broad unsupported promises.

```markdown
# Invention Disclosure: [Working Title]

## 1. Administrative details
- Disclosure date:
- Contributors / proposed inventors and contact details:
- College / department / course:
- Related grants, internships, employers, or agreements:
- Public disclosures already made or planned (paper, GitHub, demo, poster):
- Confidentiality constraints:

## 2. Title
[Example: System and method for evidence-backed civic issue resolution verification
with tamper-evident status events and proximity-aware citizen confirmation]

## 3. Technical field
[One paragraph: civic grievance workflow systems, image evidence verification,
geospatial event processing, integrity-preserving logs, and aggregate analytics.]

## 4. Background
[Describe existing workflow weaknesses without copying sources: reported issue can be
marked resolved without credible public evidence; records are private; status history
may be hard to inspect; a single classifier does not close the verification gap.]

## 5. Technical problem
[State the specific problem: how to generate and evaluate post-resolution evidence,
record a reviewable sequence of status events, and re-open a potentially false
resolution without exposing individual reporter identity.]

## 6. Summary of the proposed solution
[Explain the full loop in plain technical steps. Identify which parts are essential
and which are optional alternatives.]

## 7. Novelty / distinguishing features to investigate
1. [Before/after proof capture combined with reuse, time/location, and visual-change checks.]
2. [Append-only hash-chain status event structure linking proof review and citizen confirmation.]
3. [Proximity-aware negative confirmation threshold causing an automatic Reopened event.]
4. [Aggregate ward/department scorecard derived from these verified/reopened events.]
5. [Privacy-preserving public location transformation and limited public evidence view.]
- Prior art / alternatives known to team: [fill; team to verify with IPR cell]

## 8. Claims-style numbered statements (drafting aid only)
1. A computer-implemented method comprising: receiving a report with an approximate location and before evidence; storing a status event; receiving resolution evidence; generating a suspicion signal from at least two evidence checks; recording linked status events; requesting proximity-qualified confirmations; and changing the issue state to Reopened when a configured negative-confirmation threshold is satisfied.
2. The method of statement 1, wherein the evidence checks include perceptual reuse comparison, metadata/time/location consistency, and embedding-based visual change.
3. The method of statement 1, wherein each status event includes a hash derived from a preceding status event and current event data.
4. The method of statement 1, wherein a public interface exposes aggregated ward/department performance without exposing individual reporter identity or named-officer scores.
5. A system configured to perform any preceding statement, with alternative modules described below.

## 9. Detailed embodiments
### Embodiment A: minimum prototype workflow
[Inputs, storage schema, event fields, state transitions, pseudocode, UI sequence.]
### Embodiment B: evidence verifier alternatives
[pHash, image embedding difference, metadata validation; thresholds and failure paths.]
### Embodiment C: citizen confirmation and anti-abuse controls
[Nearby/cell qualification, threshold, rate limits, audit events; limitations.]
### Embodiment D: analytics and privacy
[Aggregate scorecard, equity alert calculation, snapped location, retention/access boundaries.]

## 10. Technical effect / measurable behavior
[Examples: detects a reused evidence file in a constructed test; preserves verifiable
event linkage; prevents an officer upload alone from producing Verified Fixed; creates
an auditable Reopened event. Do not promise social outcomes not measured.]

## 11. Drawings / diagrams list
- Figure 1: end-to-end workflow architecture
- Figure 2: status-event/hash-chain data structure
- Figure 3: before/after evidence and suspicion decision flow
- Figure 4: citizen confirmation and Reopened transition
- Figure 5: privacy-preserving public map and aggregate scorecard

## 12. Implementation evidence
- Repository commit / experiment IDs:
- Dataset/model versions:
- Test results including adversarial fake proof cases:
- Screenshots / demo recording:

## 13. Known limitations and alternatives
[No live municipal integration; M5 supplies a review flag, not certainty; data constraints;
alternative models/storage/geospatial methods.]
```

## Open-source software licence choices

Ask the IPR cell/faculty to confirm the intended ownership and dissemination model before selecting. The following is general product guidance, not a legal conclusion.

| Licence | When it may fit | Practical trade-off | Team action |
|---|---|---|---|
| MIT | Teaching/demo code where easy reuse is desired | Very permissive; downstream users can make proprietary versions; limited patent/notice detail compared with Apache-2.0 | Simple default if the college agrees and dependencies permit |
| Apache-2.0 | Reusable civic code with explicit patent-related terms | More detailed notices/conditions; compatibility and contributor policy need checking | Strong candidate if the team wants a clear contribution/patent posture; verify with IPR cell |
| AGPL | Team wants network-deployed modifications to remain shareable | Strong copyleft may deter adoption/hosting partners and needs careful compatibility review | Consider only with an intentional public-service reciprocity goal and legal review |

Do not license code until the team verifies third-party model, dataset, map-tile, font, and dependency licences. “Open-source” does not automatically mean every model weight or training asset can be redistributed.

## Dataset licence guidance

Data licensing is distinct from code and may be constrained by privacy/consent even when a licence looks permissive. Use a dataset card and preserve source terms. Team to verify each source’s actual licence and attribution requirements.

| Option | Strength | Trade-off / caution | Likely use |
|---|---|---|---|
| CC0 | Maximises reuse | May be inappropriate if team cannot waive rights or if privacy/third-party terms apply | Only for safe, wholly controlled synthetic metadata where the college agrees |
| CC-BY | Requires attribution | Downstream users must retain credit; exact version/attribution wording must be verified | Candidate for cleaned, shareable team-created documentation/data |
| ODbL | Designed around database sharing | Attribution/share-alike obligations can complicate mixing/release; team to verify compatibility | Consider only for a standalone aggregated spatial database, not automatically for all data |
| No public dataset release | Safest for uncertain field images/consent | Limits reproducibility; provide manifest/schema and safe fixture instead | Preferred for sensitive/raw self-collected images |

For self-collected field images, consent, identifiable content, and location risk override a permissive licence choice. A safe release may include only derived labels, blurred thumbnails, coarse geometry, synthetic fixtures, and reproducible scripts.

## Immediate actions

- [ ] Create `docs/ip/inventor-contributions.md` and the internal disclosure from the template.
- [ ] Ask faculty/college IPR cell about ownership, filing route, paper deadline, public demo/GitHub timing, and licence preference.
- [ ] Mark all publication/demo/repository dates planned before filing as “review required.”
- [ ] Decide whether the contribution is publication-only, disclosure-first, or a future-work idea by Week 8.
- [ ] Keep paper wording modest: M5 is a plausibility/suspicion verifier within a workflow, not a conclusive repair detector.
