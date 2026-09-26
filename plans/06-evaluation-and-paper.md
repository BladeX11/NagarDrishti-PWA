# 06 — Evaluation and Paper

> Research questions, metrics, ablations, paper structure, and usability study design.

---

## Research Questions

| # | Question | Addressed by |
|---|---|---|
| RQ1 | Does the Forced Transparency Engine (hash chain + inaction amplification + adversarial detection + TAS) create a measurably more accountable workflow than status-only tracking? | FTE (02), Stages 2-4 |
| RQ2 | Can rule-based adversarial proof detection identify fraudulent resolution patterns (photo reuse, temporal impossibility, GPS mismatch, bulk closures)? | N3, Stage 4 |
| RQ3 | Does municipal response time vary significantly by ward socioeconomic type for the same issue category? | N1, Stage 5 |
| RQ4 | Does combined spatial + text + category similarity outperform single-signal duplicate baselines? | M3, Stage 6 |
| RQ5 | Can cross-category spatiotemporal clustering identify plausible infrastructure cascade root causes? | N4, Stage 5 |
| RQ6 | Does trust-weighted urgency scoring produce better priority rankings than static rule-based scoring? | N2 + M4, Stage 7 |
| RQ7 | Does privacy coarsening preserve neighbourhood-level usefulness while reducing location exposure? | Privacy service |

---

## Metrics Framework

### AI Prediction Metrics

| Module | Primary Metric | Secondary Metrics |
|---|---|---|
| M1 Category | Macro-F1 | Per-category F1, per-language F1, confusion matrix |
| M3 Duplicates | Pairwise F1 | Precision, recall, false merge rate, cluster purity |
| M4 Priority | Kendall tau (vs officer ranking) | NDCG@5, officer correction rate |
| M5 Severity | Macro-F1 | Precision, recall, calibration error |
| M6 Proof | Adversarial precision | Recall, false positive rate on clean resolutions |

### FTE Metrics

| Mechanism | Metric | How Measured |
|---|---|---|
| Hash chain | Chain integrity rate | % of issues with fully valid hash chains |
| Hash chain | Tamper detection accuracy | Inject synthetic tampering, measure detection rate |
| Inaction amplification | Tier distribution | % of issues at each tier (T0-T4) over time |
| Adversarial detection | True positive rate | On synthetic fraud test set (50 cases) |
| Adversarial detection | False positive rate | On known-clean resolution set |
| TAS | Score distribution | Variance across departments, correlation with reopen rate |

### Workflow Metrics

| Metric | What it measures |
|---|---|
| Report completion time | Seconds from app open to successful submission |
| Task completion rate | % of users who complete the full report flow |
| Verification participation | % of supporters who respond to "is it fixed?" |
| Reopen rate | % of "Claimed Resolved" reopened by citizens |
| Equity gap | Median response time difference between ward types |

### System Metrics

| Metric | Target |
|---|---|
| API response time (p95) | < 500ms |
| Map load time | < 2s |
| AI inference queue time | < 5s |
| PWA install success rate | > 90% |
| Offline draft save success | 100% |

---

## Baseline and Ablation Matrix

### M1: Category Classification

| Experiment | Description |
|---|---|
| B1-keyword | Keyword matching only |
| B2-tfidf | TF-IDF + Logistic Regression |
| B3-tfidf-svm | TF-IDF + SVM |
| (Stretch) B4-muril | MuRIL fine-tuned |
| A1: no-description | Title only (remove description) |
| A2: english-only | Remove non-English training data |
| A3: no-image | Remove image features (if used) |

### M3: Duplicate Detection

| Experiment | Description |
|---|---|
| B1-distance | Distance-only (< 500m = duplicate) |
| B2-text | Text similarity only (TF-IDF cosine > 0.7) |
| B3-category | Same category + same ward = duplicate |
| Full model | Spatial + text + category + image |
| A1: no-spatial | Remove spatial signal |
| A2: no-text | Remove text similarity |
| A3: no-image | Remove image similarity |
| A4: no-category | Remove category match |

### N3: Adversarial Proof Detection

| Experiment | Description |
|---|---|
| Full system | All 4 rules active |
| A1: no-phash | Remove photo reuse detection |
| A2: no-temporal | Remove temporal impossibility check |
| A3: no-gps | Remove GPS mismatch check |
| A4: no-bulk | Remove bulk closure detection |

### N1: Equity Analysis

| Experiment | Description |
|---|---|
| Full analysis | All ward types compared across all categories |
| A1: no-category-control | Compare ward types without controlling for category |
| A2: no-priority-control | Compare without controlling for priority |

### M4: Priority Ranking

| Experiment | Description |
|---|---|
| B1-fifo | First-in-first-out (no prioritization) |
| B2-static-rules | Base rules only (safety + age + supporters) |
| Full trust score | Trust-weighted (+ growth rate, seasonal, credibility) |
| A1: no-growth | Remove supporter growth rate |
| A2: no-seasonal | Remove seasonal relevance |
| A3: no-credibility | Remove reporter credibility |

---

## Synthetic Evaluation Datasets

### Adversarial Test Set (N3 evaluation)
```
50 synthetic fraudulent resolutions:
  15 x photo reuse (same pHash used across 2+ issues)
  10 x temporal impossibility (resolved in <10% of category median)
  10 x GPS mismatch (after-photo GPS > 500m from complaint)
  10 x bulk closure (officer closes 20+ in one day)
  5 x visual inconsistency (before=pothole, after=clean road in different city)

50 clean resolutions (true negatives):
  Normal resolution times, unique photos, matching GPS, normal closure rates
```

### Duplicate Detection Test Set
```
100 issue pairs:
  30 true duplicates (same issue, different reporters)
  30 related but different issues (same area, different problems)
  40 unrelated issues

Labels: duplicate | related | unrelated
```

---

## Usability Study Design

### Participants
- 15-30 participants (students, faculty, local residents)
- Mix of smartphone-primary and desktop users
- No prior exposure to the system

### Tasks (in order)
1. **Report an issue:** Open PWA, take photo of simulated issue, describe it, submit
2. **Find nearby issue:** Browse map, find issue near current location, support it
3. **Inspect resolution:** Review a "Claimed Resolved" issue, examine before/after photos, vote "fixed" or "not fixed"
4. **Check transparency:** Navigate to public dashboard, find their ward's scorecard, interpret equity data
5. **Verify audit trail:** Use the hash-chain verification tool to check an issue's history

### Measurements
- **Quantitative:** Task completion rate, time per task, error rate, System Usability Scale (SUS)
- **Qualitative:** Semi-structured interview on:
  - Perceived trust ("Do you believe this system is harder to game?")
  - Perceived transparency ("Can you understand what the department did and didn't do?")
  - Perceived privacy ("Are you comfortable reporting with this level of location sharing?")
  - Willingness to use ("Would you use this regularly?")

### Analysis
- SUS score interpretation (>68 = above average)
- Thematic analysis of interview responses
- Compare trust/transparency perception against a control (showing same data in a simple list format vs. FTE dashboard)

---

## Paper Structure

```
1. Abstract (250 words)
2. Introduction
   - Problem: trust collapse loop in Indian civic grievance systems
   - Gap: existing platforms lack accountability after filing
   - Contribution: FTE + adversarial detection + equity analysis + cascade detection
3. Related Work
   - Civic complaint platforms (CPGRAMS, Swachhata, IChangeMyCity)
   - AI for civic issue management
   - Transparency-by-design
   - Privacy-preserving geospatial systems
4. System Architecture
   - Overview and design principles
   - Issue lifecycle and data model
   - Privacy-preserving mapping
5. Forced Transparency Engine
   - Hash-chain audit ledger
   - Inaction amplification
   - Adversarial proof detection
   - Transparency Accountability Score
6. Novel Analysis Modules
   - Ward equity analysis
   - Cross-category cascade detection
   - Trust-weighted priority scoring
7. AI Modules
   - Category classification (M1)
   - Duplicate detection (M3)
   - Proof-of-fix plausibility (M6)
8. Experimental Setup
   - Datasets and data sources
   - Baselines and ablation design
   - Evaluation metrics
9. Results
   - AI module performance
   - Adversarial detection results
   - Equity analysis findings
   - Cascade detection examples
   - Ablation results
10. Usability Study
    - Methodology
    - Quantitative results (SUS, task completion)
    - Qualitative findings (trust, transparency, privacy)
11. Discussion
    - What works and what doesn't
    - Limitations and threats to validity
    - Comparison with existing platforms
12. Ethics and Limitations
    - Privacy of complainants
    - Scoring departments vs individuals
    - Synthetic data limitations
    - Claims we do and don't make
13. Conclusion and Future Work
14. References
```

### Claims We Make (and Don't Make)

**We claim:**
- FTE creates a measurably more accountable workflow
- Adversarial detection can identify common fraudulent resolution patterns
- Ward equity analysis reveals measurable service disparities
- Combined-signal duplicate detection outperforms single-signal baselines
- The system is usable and perceived as more trustworthy than status-only tracking

**We do NOT claim:**
- Real municipal deployment or adoption
- Guaranteed fraud detection or prevention
- Universal language support
- Fully autonomous governance
- Proven reduction in corruption
- Production-grade reliability without production evidence

---

## Figures and Tables (planned)

| Figure/Table | Content |
|---|---|
| Fig 1 | System architecture diagram |
| Fig 2 | Issue lifecycle state machine |
| Fig 3 | FTE mechanism interaction diagram |
| Fig 4 | Inaction amplification tier progression |
| Fig 5 | Equity heatmap (ward_type x category x response_time) |
| Fig 6 | Cascade detection example on map |
| Fig 7 | TAS score distribution across departments |
| Table 1 | Comparison with existing platforms |
| Table 2 | M1 classification results + ablations |
| Table 3 | M3 duplicate detection results + ablations |
| Table 4 | N3 adversarial detection results |
| Table 5 | N1 equity analysis statistical results |
| Table 6 | SUS scores and task completion rates |
| Table 7 | Qualitative trust/transparency perception summary |
