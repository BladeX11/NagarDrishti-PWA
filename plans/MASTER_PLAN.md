# NagarDrishti — Master Plan

> **An accountability-centric civic issue platform where the architecture itself is adversarial to corruption, not just a complaint box with a dashboard.**

---

## What NagarDrishti IS (and is NOT)

**IS:** A system where reporting is frictionless, every status change is cryptographically committed, fake resolutions are actively hunted, service equity across wards is measured, and the cost of hiding information is higher than the cost of being transparent.

**IS NOT:** Another Swachhata/CPGRAMS/IChangeMyCity clone that publishes complaint lists and hopes someone reads them.

---

## Core Thesis

> Existing civic platforms fail at the same point: **after filing**. Complaints go in, tickets get "disposed," but nothing verifiably changes. NagarDrishti attacks this gap with three weapons no existing platform has:
>
> 1. **Adversarial Proof Detection** — actively catching fake resolutions
> 2. **Equity Measurement** — proving whether poor wards get worse service
> 3. **Escalating Transparency** — making inaction progressively more visible and costly

---

## Architecture Overview

```
Citizen PWA          Public Dashboard         Officer Console        Research Dashboard
    |                      |                       |                       |
    v                      v                       v                       v
    +----------------------+---+-------------------+-----------------------+
                               |
                        Express API Layer
                               |
          +----------+---------+---------+------------------+
          |          |         |         |                  |
     PostgreSQL   Redis    Object    Forced             AI Modules
     (Drizzle)    Queue    Storage   Transparency       M1-M7 + N1-N4
                                     Engine (FTE)
```

---

## Sub-Plan Documents

| Document | What it covers |
|---|---|
| [01 — System Architecture](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/01-system-architecture.md) | Tech stack, repo structure, data model, API contracts, deployment |
| [02 — Forced Transparency Engine](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/02-forced-transparency-engine.md) | The novel FTE design: hash-chain ledger, inaction amplification, transparency score, adversarial accountability |
| [03 — Novelty Features](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/03-novelty-features.md) | 6 novel features (N1-N6) that differentiate NagarDrishti from all existing platforms |
| [04 — AI Modules](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/04-ai-modules.md) | M1-M7 base modules + novel AI additions, training plan, evaluation |
| [05 — Implementation Roadmap](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/05-implementation-roadmap.md) | Staged build plan, priorities, timeline, milestones |
| [06 — Evaluation and Paper](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/06-evaluation-and-paper.md) | Research questions, metrics, ablations, paper structure, usability study |

---

## Contribution Statement

> NagarDrishti introduces an **accountability-centric civic issue lifecycle** that goes beyond complaint filing and status tracking. It contributes:
>
> 1. A **Forced Transparency Engine (FTE)** — architecturally adversarial to its operators — where every status change is cryptographically committed, inaction is progressively amplified in public visibility, and departments receive a computed Transparency Accountability Score
> 2. **Adversarial proof-of-fix detection** that identifies fraudulent resolution patterns: photo reuse across issues, temporal impossibility, GPS mismatches, and bulk suspicious closures
> 3. **Ward equity analysis** that measures whether municipal services are distributed fairly across socioeconomic ward types, answering: "Do poor wards get slower service than rich wards for the same issue?"
> 4. **Cross-category cascade detection** that identifies when spatiotemporally clustered complaints of different types share a likely infrastructure root cause
> 5. All within a **privacy-preserving, citizen-verified workflow** with explainable AI assistance and human-in-the-loop controls

---

## Product Roles

| Role | Surface | Key Actions |
|---|---|---|
| Citizen | PWA (mobile-first) | Report, support, verify fix, track status |
| Officer | Dashboard (desktop) | Triage, assign, update, submit proof |
| Public Visitor | Transparency Dashboard | Inspect ward data, scorecards, equity maps |
| Researcher | Research Dashboard | Review predictions, audit ledger, experiments |

---

## Issue Lifecycle

```
Open -> Triaged -> Assigned -> In Progress -> Claimed Resolved -> Verified Fixed
                                                    |
                                                Reopened (if citizens vote "not fixed"
                                                          or adversarial detection flags fraud)
```

---

## Approved Issue Taxonomy (8 categories)

`pothole/road` | `garbage/waste` | `drainage/sewage` | `water supply` | `streetlight/electrical` | `stray animals` | `encroachment` | `other`

---

## Non-Goals

- Live PMC/CPGRAMS/government backend integration
- Public ranking of individual officers (departments and wards only)
- AI-only closure or rejection decisions
- Legal or enforcement claims
- Forensic audit of every tax rupee (frame as budget-grievance linkage)
- Native iOS app in MVP

---

## How to Read This Plan

1. Start with this file for the big picture
2. Read **02-FTE** to understand the core novelty
3. Read **03-Novelty** for the differentiating features
4. Read **05-Roadmap** for what to build and when
5. Refer to **01**, **04**, **06** as needed during implementation
