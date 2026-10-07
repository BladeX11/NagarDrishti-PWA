# 03 — Novelty Features (N1-N6)

> Features that no existing civic platform implements. These are what make NagarDrishti a research contribution, not just another complaint app.

---

## N1. Equity Bias Detector (Ward Fairness Index)

### Problem
All civic platforms show complaint counts and resolution rates by ward. None ask the harder question: **"Is the system treating all wards equally?"** Rich wards with politically connected residents may get faster service. Poor wards, slums, and peripheral areas may be systematically neglected — but this is invisible in aggregate statistics.

### What NagarDrishti Does
Measure and publish whether municipal response quality varies by ward socioeconomic type — controlling for issue category and priority.

### Data Requirements

**Ward metadata (added to `wards` table):**
```
ward_type: "planned" | "unplanned" | "mixed" | "peri-urban"
density_tier: "high" | "medium" | "low"
approximate_property_tax_band: "A" | "B" | "C" | "D"
```
> This data is publicly available from municipal corporation ward profiles and Smart Cities Mission data portals.

### Analysis Pipeline

```
For each (issue_category, priority_band):
  Group issues by ward_type
  Compute:
    - median_response_days (time from Open to first Assigned)
    - median_resolution_days (time from Open to Verified Fixed)
    - sla_compliance_rate
    - reopen_rate
  Statistical test:
    - Kruskal-Wallis test across ward types (non-parametric, handles skewed distributions)
    - If significant (p < 0.05): report which ward type is underserved
    - Effect size: median difference in days
```

### Visualizations (Public Dashboard)

1. **Equity Heatmap:** Matrix of (ward_type x category) colored by median_response_days
2. **Gap Chart:** Side-by-side bar chart comparing "Planned ward" vs "Unplanned ward" response times per category
3. **Fairness Alert Banner:** "For drainage issues, unplanned wards wait 3.2x longer than planned wards for first response" (auto-generated from latest scorecard)

### Feasibility: HIGH
- Pure analytics on existing data
- Ward metadata is a one-time manual addition (can start with 5-10 wards)
- No ML model needed — statistical tests + aggregation

### Research Questions
- RQ1: "Does municipal response time vary significantly by ward socioeconomic type for the same issue category?"
- RQ2: "Does publishing equity metrics change the response time gap over time?" (longitudinal, if data allows)

---

## N2. Temporal Decay Trust Score

### Problem
Current priority systems are static: P1/P2/P3/P4. A pothole reported by 15 people and ignored for 60 days has the same priority label as one reported yesterday. The priority doesn't reflect how credibility and urgency change over time.

### What NagarDrishti Does
Compute a **dynamic trust-weighted urgency score** for each issue that models temporal credibility:

```
trust_score(issue) = 
  w1 * supporter_growth_rate +           // are more people confirming?
  w2 * seasonal_relevance +              // monsoon + drainage = higher
  w3 * reporter_credibility +            // past reports verified?
  w4 * age_decay_factor +                // older = more urgent
  w5 * historical_area_validity          // false-report rate in this zone
```

### Components

| Signal | Computation | Weight |
|---|---|---|
| Supporter growth rate | `supporter_count / max(1, days_since_report)` | 0.25 |
| Seasonal relevance | Lookup table: (category, month) pairs (e.g., drainage+July = 1.5) | 0.15 |
| Reporter credibility | `verified_fixed_count / total_reports_by_user` | 0.20 |
| Age decay factor | `log2(1 + days_since_report)` (logarithmic, not linear) | 0.25 |
| Area validity | `1 - (spam_reports_in_500m / total_reports_in_500m)` | 0.15 |

### Integration
- Feeds into M4 (Priority Ranking) as the primary input signal
- Displayed to officers as "Urgency Score: 7.2/10 — Rising (12 supporters in 5 days)"
- Updated asynchronously every 6 hours or on supporter events

### Feasibility: HIGH
- Feature engineering + weighted formula
- Seasonal table is hand-crafted (8 categories x 12 months)
- Reporter credibility computed from existing `verification_votes` data

---

## N3. Adversarial Proof-of-Fix Detection

### Problem
Officers submit "resolved" with an after-photo. The photo might be:
- Reused from another issue
- Taken at a different location
- Temporally impossible (resolved in 2 hours for a 5-day-median category)
- Part of a bulk "close everything" spree

No existing civic platform detects any of these patterns.

### Detection Rules

#### Rule 1: Photo Reuse Detection
```
For each new after-photo:
  Compute perceptual hash (pHash, 64-bit)
  Compare against all existing after-photos in DB
  If hamming_distance(new_hash, existing_hash) < THRESHOLD (default: 8):
    FLAG: "After-photo may be reused from issue {existing_issue_id}"
```

**Implementation:** pHash library (e.g., `sharp` for Node.js perceptual hashing). Store hash in `issue_media.perceptual_hash` column.

#### Rule 2: Temporal Impossibility
```
For each "Claimed Resolved" transition:
  resolution_time = claimed_resolved_at - created_at
  historical_median = median resolution time for this category (last 90 days)
  If resolution_time < (historical_median * 0.1):  // 10x faster than normal
    FLAG: "Resolution time ({resolution_time}h) is unusually fast for {category} (median: {historical_median}h)"
```

#### Rule 3: GPS Mismatch
```
For each after-photo with EXIF GPS data:
  photo_location = extract GPS from EXIF
  complaint_location = issue.privateLat, issue.privateLng
  distance = haversine(photo_location, complaint_location)
  If distance > GPS_MISMATCH_THRESHOLD (default: 500m):
    FLAG: "After-photo was taken {distance}m from complaint location"
```

**Note:** EXIF may be stripped by some devices/apps. This is an opportunistic check, not a requirement.

#### Rule 4: Bulk Closure Anomaly
```
Every 24 hours:
  For each officer:
    closures_today = count of "Claimed Resolved" transitions by this officer today
    officer_daily_median = median daily closures for this officer (last 30 days)
    officer_daily_stddev = stddev of daily closures
    If closures_today > (officer_daily_median + 2 * officer_daily_stddev):
      FLAG all today's closures: "Officer closed {closures_today} issues today (typical: {officer_daily_median})"
```

#### Rule 5: Before/After Visual Consistency (stretch goal)
```
For issues with both before and after photos:
  Use CLIP embeddings to compute similarity
  If similarity > SAME_IMAGE_THRESHOLD:
    FLAG: "Before and after images appear nearly identical"
  If before_category_prediction != after_category_prediction:
    // e.g., before shows pothole, after shows garbage area
    FLAG: "After-photo may not show the same issue type"
```

### Flag Severity Levels
```
1 flag  -> "Review Suggested"  (yellow indicator)
2 flags -> "Review Recommended" (orange indicator)
3+ flags -> "Review Required" (red indicator, blocks auto-advance to Verified Fixed)
```

### Feasibility: MEDIUM
- Rules 1-4: Low complexity, all rule-based
- Rule 5: Higher complexity, requires CLIP/BLIP model, treat as stretch goal

---

## N4. Cross-Issue Cascade Detector

### Problem
Infrastructure failures cause chain reactions. A broken water main causes road damage which creates potholes which cause accidents. Current systems treat these as 4 unrelated complaints. Nobody connects them to the root cause.

### What NagarDrishti Does
Detect spatiotemporally clustered complaints of **different categories** that likely share an infrastructure root cause.

### Algorithm

```
1. SPATIAL CLUSTERING (every 24 hours):
   Run DBSCAN on all open/in-progress issues:
     eps = 500m (maximum distance between points in cluster)
     min_samples = 3 (minimum issues to form a cluster)

2. CROSS-CATEGORY CHECK:
   For each spatial cluster:
     categories_present = unique categories in cluster
     If len(categories_present) >= 3:
       // Multiple different issue types in same area = possible cascade
       FLAG as potential cascade

3. TEMPORAL CORRELATION:
   For flagged cascades:
     Sort issues by created_at
     Check if issues appeared in a burst (within 14-day window)
     If yes: stronger cascade signal

4. ROOT CAUSE SUGGESTION:
   Use a predefined cascade pattern table:
     "water supply" + "drainage/sewage" + "pothole/road" -> "Possible underground pipe failure"
     "streetlight/electrical" + "encroachment" -> "Possible unauthorized construction"
     "garbage/waste" + "drainage/sewage" + "stray animals" -> "Possible neglected sanitation zone"
```

### Output
```json
{
  "cascadeId": "CASCADE-27",
  "location": { "lat": 18.5204, "lng": 73.8567, "radius_m": 400 },
  "ward": "Ward 7",
  "issueCount": 5,
  "categories": ["water supply", "drainage/sewage", "pothole/road"],
  "suggestedRootCause": "Possible underground pipe failure",
  "confidence": "medium",
  "oldestIssue": "2026-09-10",
  "newestIssue": "2026-09-24"
}
```

### Visualization
- **Officer Map:** Cascade zones shown as pulsing circles with multi-category icon
- **Public Dashboard:** "Infrastructure Alert Zones" section showing active cascades
- **Research Dashboard:** Cascade pattern frequency, accuracy of root cause suggestions

### Feasibility: HIGH
- DBSCAN is a standard algorithm (use a JS implementation or compute server-side)
- Cascade pattern table is hand-crafted (domain knowledge)
- Clean research question with measurable output

---

## N5. Citizen Engagement Decay Prediction

### Problem
The "trust collapse loop" from Smart Cities.md: people report once, see no action, and stop engaging. No civic platform models or intervenes on this disengagement.

### What NagarDrishti Does
Track each citizen's engagement trajectory and proactively re-engage those at risk of dropping out.

### User Lifecycle States
```
Active:   Made an action (report/support/verify) in last 14 days
At-Risk:  Last action 15-30 days ago
Dormant:  Last action 31-60 days ago
Churned:  No action in 60+ days
```

### Re-engagement Triggers (computed weekly)
```
For each "At-Risk" user:
  Generate personalized ward digest:
    - Issues fixed in their ward this week
    - Issues they supported that progressed
    - New issues near their past reports
    - "Your reports have helped resolve X issues" (impact message)
```

### Implementation
- Computed from existing `issues.reporterId`, `issueSupporters.userId`, `verificationVotes.userId` timestamps
- No ML needed — lifecycle states are rule-based
- Digest generation is a scheduled job (weekly cron)

### Feasibility: MEDIUM (needs enough user data to demonstrate)

---

## N6. Code-Mixed Multilingual Complaint Understanding

### Problem
Real Indian complaints are code-mixed: "yahan pe nala block hai, bahut **problem** ho raha hai." CPGRAMS supports 22 languages but assumes **single-language input**. Nobody handles Hinglish or Marathinglish.

### What NagarDrishti Does
Use a multilingual encoder (MuRIL or IndicBERT) that handles code-mixing natively for category classification.

### Evaluation Plan
```
Dataset: 100 synthetic code-mixed complaints (hand-written, labeled)
  Split: 60 train, 20 val, 20 test
  Languages: Hindi-English mix, Marathi-English mix, pure English, pure Hindi

Baselines:
  B1: English-only TF-IDF classifier (ignore non-English tokens)
  B2: Translate-then-classify (Google Translate to English first)
  B3: MuRIL zero-shot on code-mixed input

Ablation:
  Remove code-mixed examples from training -> measure drop
```

### Feasibility: MEDIUM (needs dataset creation + model fine-tuning)

---

## Priority Matrix

| Feature | Novelty | Feasibility | Paper Value | Priority |
|---|---|---|---|---|
| N1: Equity Bias | High | High | High | **Must Have** |
| N3: Adversarial Proof | Very High | Medium | Very High | **Must Have** |
| N4: Cascade Detector | High | High | High | **Should Have** |
| N2: Trust Score | Medium | High | Medium | Should Have |
| N6: Code-Mixed NLP | High | Medium | High | Nice to Have |
| N5: Engagement Decay | Medium | Medium | Medium | Stretch |
