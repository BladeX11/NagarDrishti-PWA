# 02 — Forced Transparency Engine (FTE)

> **The core novel system in NagarDrishti. A transparency architecture that is adversarial to its operators — designed so that hiding or faking data is computationally and practically harder than being transparent.**

---

## Why Existing Transparency Fails

| Existing Approach | Why it Fails |
|---|---|
| RTI (Right to Information) | Citizen must request. Government can delay 30+ days. Burden on citizen. |
| Open data portals (data.gov.in) | Publish data dumps. No accountability loop. Nobody reads them. |
| Swachhata before/after photos | Officer-controlled narrative. No verification that photos are real. |
| IChangeMyCity community page | Relies on goodwill. No structural consequence for inaction. |
| CPGRAMS ticket tracking | "Disposed" != "Resolved." High disposal rates, low actual resolution. |

**Common failure mode:** Transparency is opt-in. The operator decides what to show. If they choose to hide, the system cannot detect it.

---

## NagarDrishti's FTE: Four Interlocking Mechanisms

The FTE is not one feature — it's four mechanisms that reinforce each other. Disabling any one still leaves three others applying pressure.

```
           +------------------+
           |  1. Immutable    |
           |  Hash-Chain      |  "You cannot rewrite history"
           |  Status Ledger   |
           +--------+---------+
                    |
           +--------v---------+
           |  2. Inaction      |
           |  Amplification    |  "Silence gets louder over time"
           |  Engine           |
           +--------+---------+
                    |
           +--------v---------+
           |  3. Adversarial   |
           |  Proof Detection  |  "Fake fixes get caught"
           |  (N3 module)      |
           +--------+---------+
                    |
           +--------v---------+
           |  4. Transparency  |
           |  Accountability   |  "Your transparency itself is scored"
           |  Score (TAS)      |
           +------------------+
```

---

## Mechanism 1: Immutable Hash-Chain Status Ledger

### What it is
Every status change on every issue creates a **cryptographically chained event**. Each event contains the hash of the previous event. If any historical event is tampered with, all subsequent hashes break — detectable by any auditor.

### How it works (already partially built in `statusEvents` table)

```
Event N:
  issueId:     "ND-104"
  fromStatus:  "Open"
  toStatus:    "Assigned"
  actorId:     "officer-7"
  actorRole:   "officer"
  reason:      "Assigned to Sanitation team"
  timestamp:   "2026-09-26T14:30:00Z"
  prevHash:    "a3f8c1..."  (hash of Event N-1)
  eventHash:   SHA256(issueId + fromStatus + toStatus + actorId + timestamp + prevHash)
```

### What makes this novel vs. blockchain

| Property | Full Blockchain | NagarDrishti Hash Chain |
|---|---|---|
| Tamper evidence | Yes | Yes |
| Decentralized consensus | Yes (expensive, complex) | No (not needed for a prototype) |
| Performance | Slow (block finality) | Instant (append to DB) |
| Verifiability | Anyone with a node | Anyone with the public event stream |
| Complexity | High (Solidity, gas, nodes) | Low (SHA-256 + PostgreSQL) |
| Suitable for course project | No | Yes |

### Public Verification API

```
GET /api/audit/verify/{issueId}
Response:
{
  "issueId": "ND-104",
  "eventCount": 7,
  "chainValid": true,         // all hashes check out
  "brokenAt": null,            // or event index if tampered
  "latestHash": "f7a2b9...",
  "verifiedAt": "2026-09-26T15:00:00Z"
}
```

Any citizen, journalist, or auditor can call this endpoint and independently verify that no status was retroactively changed.

### Research angle
> "Can a lightweight hash-chain provide practical tamper evidence for civic grievance workflows without the overhead of distributed consensus?"

---

## Mechanism 2: Inaction Amplification Engine

### The problem with passive transparency
Publishing "this issue is 30 days old" on a dashboard is useless if nobody looks at the dashboard. Current platforms treat old issues the same as new ones — just with a bigger number.

### NagarDrishti's approach: Escalating Visibility Tiers

As an issue ages without action, the system **progressively increases its visibility** through automated escalation tiers. This is not a notification system — it's a **structural amplification** of inaction.

```
Days without    Visibility Tier        What happens
action
-----------     ---------------        ------------------------------------------
0-3 days        T0: Normal             Issue appears on ward map, officer queue
4-7 days        T1: Highlighted        Issue gets "Aging" badge on public map
                                       Appears in "Slow Response" section
8-14 days       T2: Escalated          Issue promoted to ward-level SLA breach wall
                                       Ward scorecard gets real-time penalty
                                       Weekly digest includes this issue
15-30 days      T3: Amplified          Issue appears on city-wide "Forgotten Issues"
                                       Department scorecard penalty doubles
                                       Auto-generated summary available for media export
31+ days        T4: Critical           Issue pinned to top of public dashboard
                                       "Neglect Zone" heat signature on city map
                                       Monthly accountability report auto-includes it
```

### Key design decisions

1. **Escalation is automatic and irreversible.** An officer cannot "reset" the tier by acknowledging the issue without actually resolving it. Only a verified fix (citizen-confirmed) removes it from escalation.

2. **Tiers are computed, not stored.** The tier is derived from `(current_time - last_meaningful_action_time)` at query time. There is no "tier" field to manipulate.

3. **"Meaningful action" is defined strictly.** Only status transitions that move the issue forward count: `Open -> Triaged`, `Triaged -> Assigned`, `Assigned -> In Progress`, `In Progress -> Claimed Resolved`. Moving backward or lateral changes (re-assigning without progress) do not reset the clock.

4. **Visibility compounds.** A T3 issue in a ward that also has 5 other T2+ issues triggers a "Neglect Zone" designation for that ward — a qualitative escalation beyond individual issues.

### Formulas

```
inaction_days = (now - last_forward_transition_timestamp) / 86400000

tier = 
  inaction_days <= 3  -> T0
  inaction_days <= 7  -> T1
  inaction_days <= 14 -> T2
  inaction_days <= 30 -> T3
  else                -> T4

scorecard_penalty_multiplier =
  T0: 0
  T1: 1.0
  T2: 1.5
  T3: 2.0
  T4: 3.0

ward_neglect_zone = (count of issues at T2+ in ward) >= NEGLECT_THRESHOLD (default: 5)
```

### Research angle
> "Does progressively escalating the public visibility of unresolved issues create measurable pressure on resolution rates compared to static dashboards?"

---

## Mechanism 3: Adversarial Proof-of-Fix Detection

> Full details in [03 — Novelty Features (N3)](file:///e:/SEM%205/AI/CP/NagarDrishti-app/plans/03-novelty-features.md)

This is the **active fraud detection** layer. Instead of trusting officer-submitted "after photos" and resolution notes, the system actively hunts for patterns of fake resolution:

| Detection | Method | Complexity |
|---|---|---|
| Photo reuse across issues | Perceptual hash (pHash) matching across all after-photos | Low |
| Temporal impossibility | Compare resolution time vs historical median for that category | Low |
| GPS mismatch | Compare after-photo EXIF GPS vs complaint location | Low |
| Bulk suspicious closures | Statistical outlier detection on closures-per-officer-per-day | Low |
| Image tampering | Error Level Analysis (ELA) on submitted photos | Medium |
| Visual consistency | Before/after semantic comparison (BLIP-2 or CLIP similarity) | Medium-High |

**Important framing:** The system produces **review flags**, not accusations. "This resolution has 3 suspicious indicators — flagged for review" is acceptable. "This officer committed fraud" is not.

### Integration with FTE

When the adversarial detector flags an issue:
1. Status cannot advance to "Verified Fixed" until the flag is manually reviewed
2. The flag is permanently recorded in the hash-chain ledger
3. The department's Transparency Accountability Score takes a penalty
4. The issue's visibility tier escalates immediately (regardless of age)

---

## Mechanism 4: Transparency Accountability Score (TAS)

### The insight
Existing platforms measure **performance** (resolution time, SLA compliance). None measure **how transparent the department is being**. A department could have great resolution numbers by closing tickets without evidence — and nobody would know.

### TAS measures HOW the department behaves, not just outcomes

```
TAS = weighted_sum(
  evidence_rate,           // % of resolved issues with after-photo + note
  verification_response,   // % of "Claimed Resolved" that received citizen verification
  status_update_frequency, // avg updates per issue lifecycle
  flag_rate,               // % of resolutions flagged by adversarial detection (INVERTED)
  reopen_rate,             // % of "resolved" issues reopened by citizens (INVERTED)
  ledger_integrity,        // % of hash-chain events that verify correctly
)
```

### Component weights and scoring

| Component | Weight | Scoring | Rationale |
|---|---|---|---|
| Evidence Rate | 0.25 | % of claimed-resolved with proof photo + note | "Did you even try to prove it?" |
| Verification Response | 0.20 | % of resolutions where citizens responded to verify prompt | "Did citizens confirm your work?" |
| Update Frequency | 0.15 | avg status updates per issue / expected updates | "Are you communicating progress?" |
| Adversarial Flag Rate | 0.20 | 1 - (flagged_resolutions / total_resolutions) | "Are your resolutions suspicious?" |
| Reopen Rate | 0.10 | 1 - (reopened / claimed_resolved) | "Do citizens agree you fixed it?" |
| Ledger Integrity | 0.10 | % of events with valid hash chain | "Is your audit trail clean?" |

### Scoring bands

```
TAS >= 0.85  ->  "Highly Transparent"  (green badge)
TAS >= 0.65  ->  "Transparent"         (blue badge)
TAS >= 0.45  ->  "Needs Improvement"   (yellow badge)
TAS <  0.45  ->  "Opaque"              (red badge)
```

### Published on Public Dashboard
- Per-department TAS with component breakdown
- Per-ward TAS (aggregated from department scores for that ward)
- Monthly TAS trend chart
- "Most Improved" and "Most Declined" rankings

### Research angle
> "Can a computed Transparency Accountability Score incentivize proactive evidence submission and reduce fraudulent closures compared to performance-only metrics?"

---

## Why FTE is Novel (Competitive Differentiation)

| Aspect | CPGRAMS | Swachhata | IChangeMyCity | **NagarDrishti FTE** |
|---|---|---|---|---|
| Status history | Mutable database | Mutable database | Mutable database | **Immutable hash chain** |
| Inaction handling | Ticket ages silently | Ticket ages silently | Community can re-vote | **Auto-escalating visibility tiers** |
| Resolution verification | Officer marks done | Officer uploads photo | Community discussion | **Adversarial fraud detection + citizen vote** |
| Transparency measured | Not measured | Not measured | Not measured | **Computed TAS score per department** |
| Gaming resistance | Low | Low | Low | **Four interlocking mechanisms** |

**The key insight:** Each mechanism alone can be gamed. Together, they create a system where the easiest path for a department is genuine transparency — because gaming any one mechanism exposes you through the others.

---

## Implementation Priority

| Mechanism | Stage | Effort |
|---|---|---|
| Hash-chain ledger | Already partially built (`statusEvents` table) | Low — finish verification API |
| Inaction Amplification | Stage 4 (after vertical slice) | Low — computed at query time |
| Adversarial Proof Detection | Stage 5-6 | Medium — pHash + rule checks |
| TAS Scoring | Stage 6-7 | Low — aggregation query |

---

## Ethical Safeguards

1. **Score departments and wards, never individual officers** — avoids personal targeting
2. **Flags are for review, not conviction** — system never claims fraud, only "needs review"
3. **All scoring formulas are published** — the methodology is part of the transparency
4. **Override records are preserved** — when an admin overrides a flag, that override is logged in the hash chain too
5. **No retaliation channel** — system does not notify specific officers about their flags; only aggregate department data is public
