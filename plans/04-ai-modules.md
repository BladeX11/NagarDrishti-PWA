# 04 — AI Modules

> Base modules M1-M7 (from original architecture) + novel AI additions. Training plan, baselines, evaluation.

---

## Module Overview

### Base Modules (from original architecture)

| Module | Purpose | Current State | Target |
|---|---|---|---|
| M1 | Category Classification | Rule-based keyword matching | TF-IDF baseline -> MuRIL if time |
| M2 | Department Routing | Category-to-dept lookup table | Rule baseline + historical pattern |
| M3 | Duplicate Detection | Haversine + category match | + TF-IDF text similarity + pHash |
| M4 | Priority/Urgency Ranking | Rule-based (safety + age) | + N2 Trust Score signals |
| M5 | Image Severity | Not implemented | MobileNet lightweight classifier |
| M6 | Proof-of-Fix Plausibility | Stub only | + N3 adversarial rules |
| M7 | Analytics/Scorecards | Scorecard service exists | + TAS computation + equity |

### Novel Modules (from novelty features)

| Module | Purpose | Source |
|---|---|---|
| N1-AI | Ward Equity Analysis | Statistical tests on scorecard data |
| N3-AI | Adversarial Proof Detection | pHash + EXIF + temporal + bulk anomaly |
| N4-AI | Cascade Detection | DBSCAN clustering + co-occurrence |
| N6-AI | Code-Mixed NLP | MuRIL-based classification (stretch) |

---

## M1: Category Classification

### Baseline (must ship)
```
Input: issue title + description (text)
Method: TF-IDF vectorizer -> Logistic Regression / SVM
Output: category (one of 8), confidence, top-3 alternatives
Fallback: citizen manually selects category
```

### Training Data
- 500+ synthetic complaints (50+ per category, 3 languages)
- Format: `{ text, language, category, source: "synthetic" }`
- Split: 70/15/15 (train/val/test), stratified by category

### Evaluation
- **Metrics:** macro-F1, per-category F1, per-language F1, confusion matrix
- **Ablations:** 
  - Remove description (title-only)
  - Remove language features
  - English-only vs multilingual

### Stretch: MuRIL/IndicBERT
- Fine-tune on same dataset
- Compare against TF-IDF baseline
- Report training cost, inference time, and whether the improvement justifies complexity

---

## M2: Department Routing

### Baseline (must ship)
```
Deterministic mapping:
  pothole/road     -> roads_dept
  garbage/waste    -> sanitation
  drainage/sewage  -> drainage
  water supply     -> water
  streetlight      -> electrical
  stray animals    -> animal_control
  encroachment     -> enforcement
  other            -> general

Enhancement: if historical data shows ward-specific routing overrides, apply them.
```

### Evaluation
- **Metrics:** top-1 accuracy, top-3 accuracy, officer correction rate
- **Baseline comparison:** deterministic vs ML (if trained)

---

## M3: Duplicate Detection (Enhanced)

### Current State
- Haversine distance + category match only
- No text similarity, no image similarity

### Enhanced Pipeline

```
Stage 1: Candidate Retrieval (fast filter)
  - PostGIS: issues within 1500m
  - Same ward preferred
  - Open/In-Progress/Assigned status only
  - Created within last 30 days

Stage 2: Text Similarity
  - TF-IDF cosine similarity between descriptions
  - Score: 0.0 to 1.0

Stage 3: Category Match
  - Same category: 1.0
  - Related categories (e.g., drainage + water): 0.5
  - Different categories: 0.0

Stage 4: Image Similarity (if both have photos)
  - Perceptual hash (pHash) hamming distance
  - Normalize to 0.0-1.0 score

Stage 5: Composite Score
  duplicate_score = 
    0.30 * spatial_proximity_score +    // 1.0 at 0m, 0.0 at 1500m
    0.30 * text_similarity +
    0.20 * category_match +
    0.20 * image_similarity

  If duplicate_score >= 0.50: suggest as duplicate
  If duplicate_score >= 0.75: strong duplicate candidate
```

### Evaluation
- **Metrics:** pairwise precision, recall, F1, false merge rate
- **Ablations:** remove spatial, text, image, or category signal individually
- **Baselines:** distance-only, text-only, category-only

---

## M4: Priority Ranking (Enhanced with N2 Trust Score)

### Base Rules (must ship)
```
priority_score = 
  safety_weight(category) +          // drainage/road = higher
  age_score(days_open) +             // older = higher
  supporter_score(supporter_count) + // more supporters = higher
  sla_breach_penalty(is_breached)    // SLA breach = +2
```

### Enhanced with Trust Score (N2)
```
enhanced_priority = 
  0.40 * base_priority_score +
  0.25 * supporter_growth_rate +
  0.15 * seasonal_relevance(category, month) +
  0.10 * reporter_credibility +
  0.10 * area_validity
```

### Output
```json
{
  "priority_band": 1,       // 1=critical, 2=high, 3=medium, 4=low
  "score": 8.7,             // 0-10 scale
  "trend": "rising",        // rising|stable|declining
  "explanation": "High urgency: drainage issue during monsoon season, 12 supporters in 5 days, reporter has 80% verified track record",
  "model_version": "rules-v2.0"
}
```

### Evaluation
- **Metrics:** Kendall tau ranking correlation with officer-assigned priority
- **Ablations:** remove each signal, measure ranking quality drop

---

## M5: Image Severity (New)

### Architecture
```
Input: consent-cleared issue image
Model: MobileNetV2 (pretrained on ImageNet) -> fine-tuned head
Output: severity (low | medium | high), confidence, quality flag
Fallback: manual severity selection by citizen
```

### Training Data
- Source: publicly available civic complaint image datasets + self-collected
- Labels: low (cosmetic), medium (functional impairment), high (safety hazard)
- Minimum: 200 labeled images across 3 severity levels

### Evaluation
- **Metrics:** precision, recall, macro-F1, calibration error
- **Baseline:** random baseline, majority-class baseline

---

## M6: Proof-of-Fix Plausibility (Enhanced with N3)

### Integration with Adversarial Detection

M6 is now the AI wrapper around the N3 adversarial rules:

```
Input: before_media, after_media, issue metadata, proof metadata
Pipeline:
  1. Run N3 Rule 1 (photo reuse pHash check)
  2. Run N3 Rule 2 (temporal impossibility check)
  3. Run N3 Rule 3 (GPS mismatch check)
  4. Run N3 Rule 4 (bulk closure anomaly check)
  5. (Stretch) Run N3 Rule 5 (CLIP visual consistency)
  
Output:
  plausibility: "plausible" | "needs_review" | "suspicious"
  flags: [{ type, severity, details }]
  confidence: 0.0-1.0
  model_version: "adversarial-rules-v1.0"
```

### Evaluation
- **Metrics:** adversarial precision, recall (on synthetic fraud test set)
- **Test set:** Create 50 synthetic fraudulent resolutions:
  - 15 with reused photos
  - 10 with impossible resolution times
  - 10 with GPS mismatches
  - 10 with bulk closures
  - 5 with visual inconsistency

---

## M7: Analytics (Enhanced with FTE)

### Base Analytics (already planned)
- Median resolution time per ward/department
- SLA compliance rate
- Reopen rate
- Verification agreement rate
- Workload distribution
- Forgotten issues (oldest unresolved)

### New: TAS Computation
```
For each (department, ward, period):
  evidence_rate = resolved_with_proof / total_resolved
  verification_response = verification_received / claimed_resolved
  update_frequency = avg_status_updates_per_issue / expected_updates
  flag_rate = 1 - (flagged_resolutions / total_resolutions)
  reopen_rate = 1 - (reopened / claimed_resolved)
  ledger_integrity = valid_hash_events / total_events

  TAS = 0.25*evidence_rate + 0.20*verification_response + 
        0.15*update_frequency + 0.20*flag_rate + 
        0.10*reopen_rate + 0.10*ledger_integrity
```

### New: Equity Analysis (N1)
```
For each (category, ward_type):
  Compute median_response_days, median_resolution_days
  Run Kruskal-Wallis test across ward types
  Report p-value, effect size, underserved ward type
```

### New: Cascade Detection (N4)
```
Scheduled job (daily):
  1. Fetch all open/in-progress issues with coordinates
  2. Run DBSCAN (eps=500m, min_samples=3)
  3. For each cluster with 3+ unique categories:
     Create cascade_alert record
  4. Match against cascade pattern table for root cause suggestion
```

---

## AI Inference Architecture

```
Report Created
      |
      v
Job enqueued (Redis/BullMQ)
      |
      +-- M1: Category classification (async, <1s)
      +-- M2: Department routing (sync, deterministic)
      +-- M3: Duplicate candidate search (async, <2s)
      +-- M4: Priority scoring (sync, computed)
      |
      v
Predictions stored in model_predictions table
      |
      v
Citizen/Officer review -> accept or override

Resolution Claimed
      |
      v
M6: Adversarial proof check (async)
      |
      +-- N3 Rules 1-5 applied
      +-- Flags stored in adversarial_flags table
      |
      v
If flags: block auto-advance, require review

Scheduled Jobs (cron)
      |
      +-- M7: Scorecard snapshots (daily)
      +-- M7: TAS computation (weekly)
      +-- N1: Equity analysis (weekly)
      +-- N4: Cascade detection (daily)
      +-- N3 Rule 4: Bulk closure check (daily)
```

---

## Model Registry

Every model/rule version is tracked:

```
{
  "modelId": "M1-tfidf-v1.0",
  "module": "M1",
  "type": "tfidf+logistic_regression",
  "dataVersion": "synthetic-v1.0",
  "trainedAt": "2026-10-01",
  "metrics": { "macro_f1": 0.72, "accuracy": 0.78 },
  "status": "approved",  // candidate|approved|deprecated|rejected
  "artifactPath": "ml/models/m1-tfidf-v1.0/",
  "cardPath": "ml/cards/m1-tfidf-v1.0.md"
}
```
