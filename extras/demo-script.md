# NagarDrishti Demo Script and Presentation Pack

## Demo conditions

Use seeded, clearly labelled prototype data. The “officer” is a mock role; there is no municipal integration. Public map points are snapped to a cell/street segment and never show reporter identity or exact doorstep. The live flow must use only the eight categories: pothole/road, garbage/waste, drainage/sewage, water supply, streetlight/electrical, stray animals, encroachment, other.

## Seven-minute course demo

| Time | Screen / exact click path | What to say | Proof point |
|---|---|---|---|
| 0:00–0:35 | Slide 1 → PWA home | “NagarDrishti addresses the trust loop: reporting is hard, issues are invisible, and ‘resolved’ can mean nothing. CivicLens is our research prototype for transparent civic grievance workflows.” | Scope, not marketing |
| 0:35–1:15 | `Home → Report an issue → Use demo photo → Select Marathi text sample → Place approximate pin` | “A citizen can report with photo, text and an approximate map pin. The public view will never publish their identity or exact doorstep.” | Multimodal, privacy-preserving intake |
| 1:15–1:55 | `Continue → Review auto-fill` | “M1 suggests one of eight categories and a department; M3 gives an explainable suggested urgency. These are recommendations, not a legal or municipal decision.” | M1/M3; language-aware scope |
| 1:55–2:35 | `Continue → Nearby issue suggestion → Open existing issue → Tap Support` | “M4 combines text similarity, distance and time to suggest a nearby issue. It asks the citizen to support it rather than silently merging reports.” | Duplicate transparency |
| 2:35–3:20 | `Map → filter Active → open seeded issue detail → Status history` | “The public map shows snapped location, age, responsible department, supporters and a status timeline. The hash-chained events make changes inspectable in this prototype.” | Visibility/audit limitation-aware |
| 3:20–4:10 | `Open mock officer console → Issue queue → Upload scripted after-photo → Submit evidence` | “The officer can submit evidence, but this alone cannot make the ticket Verified Fixed. The evidence is checked and citizens are asked to confirm.” | Proof workflow |
| 4:10–5:05 | `Proof review → click Run/Show verifier result → show “Suspicious: reused before photo / metadata mismatch”` | “This is the single wow moment. The uploaded ‘after’ image is a fake proof: it reuses stale evidence or does not match the expected location. M5 flags it using reuse, visual change and metadata checks. It is a flag for review, not a claim of certainty.” | **Wow: fake proof-of-fix caught** |
| 5:05–5:35 | `Citizen view → Is it fixed? No → second seeded nearby confirmation → refresh issue` | “When two nearby citizens say no, the system automatically moves the issue to Reopened. A claim of repair cannot overrule local confirmation.” | Reopen rule |
| 5:35–6:15 | `Ward scorecards → select ward → department scorecard → forgotten issues` | “Scorecards are for wards and departments, not named officers. We show SLA/reopen/backlog patterns, recurring categories, and explainable spike/equity alerts where data supports them.” | Accountability without defamation |
| 6:15–7:00 | `Results slide → limitations slide → architecture slide` | “We evaluate M1 by category and language, M4 on duplicate pairs, M5 on constructed adversarial fake fixes, and the system/user flow separately. Data is public proxy, synthetic and self-collected; no municipal partnership is claimed. Our contribution is the evidence-and-citizen verification loop, not a claim that one classifier solves civic governance.” | Honest evaluation and close |

### Required live click sequence

```text
Home
→ Report an issue
→ Use Demo Photo / Marathi Sample / Approximate Pin
→ Continue
→ Review Auto-fill
→ Continue
→ Open Nearby Issue
→ Support
→ Map
→ Open Seeded Issue ND-DEMO-041
→ Mock Officer Console
→ Queue
→ ND-DEMO-041
→ Upload Scripted Fake After-photo
→ Submit Evidence
→ Proof Review / Show Verifier Result
→ Citizen Confirmation: No (two seeded nearby confirmations)
→ Refresh Issue (Reopened)
→ Ward Scorecards
```

Keep a written fixture-ID reference beside the laptop. If an item is already in a changed state, reset it with the documented seed script before presenting.

## Three-minute conference version

| Time | Beat | What to say |
|---|---|---|
| 0:00–0:25 | Problem and boundary | “NagarDrishti/CivicLens targets the gap between reporting, public visibility and credible proof of fix. It is a prototype; it does not integrate with a municipal backend or score individual officers.” |
| 0:25–0:55 | Intake and duplicate support | `Home → Demo report → auto-fill → nearby suggestion.` “Multilingual text/photo intake suggests category, urgency and a nearby report while preserving a coarse public location.” |
| 0:55–1:50 | Wow moment | `Mock officer → upload fake after-photo → proof result.` “Evidence alone does not set Verified Fixed. A reused/stale/wrong-location after-photo is flagged by M5, then citizens can reject it.” |
| 1:50–2:20 | Reopen and transparency | `Two nearby No confirmations → Reopened → status timeline.` “Two nearby negative confirmations reopen the ticket; the status timeline is tamper-evident in the prototype.” |
| 2:20–2:45 | Scorecard | `Ward scorecard.` “We aggregate to ward/department rather than name people; this highlights backlog, reopen patterns and neglected zones.” |
| 2:45–3:00 | Evidence/limitation | “We report category/language, duplicate, adversarial verifier and user-flow metrics; data provenance and limitations are explicit.” |

## Pre-recorded fallback plan

Record the seven-minute flow in one uninterrupted 1080p screen recording with an on-screen pointer, plus separate 20-second clips for intake, verifier flag, reopen, and scorecard. Store locally on two devices and in a team-controlled backup location. The presenter says: “The live local stack is unavailable, so this recording shows the same seeded build and exact click path we tested.” Never describe it as live. Keep static screenshots of each milestone in the deck in case video playback fails.

## Hardware and room checklist

- [ ] Presentation laptop with power adapter, local Docker images/seed/model cache, browser tab pre-opened, sleep/updates disabled.
- [ ] Second laptop/USB or other local copy with video, slides, seed archive, and installer notes.
- [ ] HDMI/USB-C adapter, tested projector resolution, mouse/clicker, charger, hotspot, and offline presentation copy.
- [ ] Phone with the responsive PWA open only if it adds value; do not depend on phone camera/location/network.
- [ ] Audio/microphone tested if video includes sound; notifications disabled.
- [ ] Timer visible to R4; each speaker knows who advances and who takes over on failure.
- [ ] No real personal information, private images, exact locations, secrets, or unverified claims visible.

## Likely examiner/reviewer questions

| Question | Strong short answer |
|---|---|
| 1. Do you have municipal approval or live integration? | No. v1 deliberately works without it using public proxy, synthetic and self-collected data. We designed an adapter interface as future work. |
| 2. Why should we trust synthetic data? | We do not treat it as real municipal evidence. It is explicitly labelled, human-reviewed for the prototype, and its limitation is reported separately. |
| 3. Can M5 prove that a repair happened? | No. It flags suspicious evidence using several checks. Verified Fixed requires the workflow’s verification evidence, and two nearby negative confirmations reopen the issue. |
| 4. What stops someone gaming citizen confirmations? | v1 combines proximity/identity-limited signals and logs events, but robust production anti-abuse needs municipal governance and more evaluation. We do not overclaim it. |
| 5. Why not just use an existing civic portal? | The prototype focuses on the gaps around visible collective issues and credible proof-of-fix. It is designed as a layer/adapter, not a replacement claim. |
| 6. How do you protect privacy? | Public views use snapped/aggregated locations and exclude names/contact data. Demo/field images are consent-cleared and reviewed for faces, plates and private details. |
| 7. Why these eight categories? | They are the fixed v1 taxonomy that makes labels, routing, metrics and UI comparable. Unclear cases use `other` rather than inventing a label. |
| 8. How do you evaluate the multilingual classifier? | Macro-F1 by category and by Marathi/Hindi/English slice, compared with the same-split TF-IDF+SVM baseline. |
| 9. What makes duplicate detection safe? | It makes a user-confirmable suggestion based on text, distance and time; it does not silently merge records. We report pairwise precision/recall and cluster purity. |
| 10. Is the status ledger a blockchain? | No. It is a simpler append-only hash-chained event log. It demonstrates detectable tampering in the prototype, not institutional-grade governance. |
| 11. Why score wards/departments, not officers? | Ward/department aggregates align with the system’s accountability goal while reducing defamation risk and avoiding unsupported individual attribution. |
| 12. What is the research contribution beyond classifiers? | The contribution is the combined proof-of-fix loop: evidence checks, citizen confirmation/reopen rule, auditable status history, and aggregated equity-aware transparency. |

## Ten-slide deck outline

| Slide | Title | Content / visual |
|---:|---|---|
| 1 | NagarDrishti (CivicLens) | One-sentence problem and team; no inflated claims |
| 2 | The trust collapse loop | Five-step loop from difficult reporting to silent citizens |
| 3 | v1 scope and boundaries | Six pillars condensed; non-goals: no live municipal integration, named-officer scoring, treasury audit, native iOS |
| 4 | System workflow | Intake → AI suggestions/duplicate → public map → proof → confirmation/reopen → scorecard |
| 5 | Data and privacy | Public proxy/synthetic/self-collected split; consent, snapped locations, no identities |
| 6 | AI modules | M1–M6 with M7 marked stretch; metrics beside each core module |
| 7 | Live demonstration | Minimal cue slide; switch to exact click path |
| 8 | The verifier and reopen loop | Before/after fake proof visual, suspicious flag, 2+ citizen `No` → Reopened |
| 9 | Evaluation and limitations | Baseline comparisons, language/category/adversarial/user-study plan/results; honest limitations |
| 10 | Contribution and next steps | Evidence + citizen verification + transparent aggregates; future adapter/pilot only after governance review |
