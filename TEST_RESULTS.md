# NagarDrishti — Experimental & Unit Evaluation Results

Generated: `2026-11-14`
Benchmark Version: `civictrust-synthetic-template-split-v2` (Seed: `20260927`)

> **Scientific Integrity Note:** The evaluation benchmark comprises 360 deterministic multilingual records (`en`, `hi`, `mr`; 216 train / 72 validation / 72 test) and 48 duplicate-detection pairs generated from held-out report-context templates. Because category phrases overlap across splits, these metrics serve as controlled pipeline and ablation diagnostics rather than external municipal generalization claims.

---

## 1. Category Classification & Calibration (M1)

| Model / Baseline | Precision | Recall | Macro-F1 | ECE (↓) | Brier Score (↓) | Test N |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `prior` (Majority class) | 0.016 | 0.125 | 0.028 | 0.195 | 0.147 | 72 |
| `keyword` (English lexical rules) | 0.898 | 0.458 | 0.514 | 0.198 | 0.156 | 72 |
| `multilingual` (EN/HI/MR lexical) | 0.938 | 0.917 | 0.914 | 0.219 | 0.113 | 72 |
| `trained_nb` (Multinomial Naive Bayes) | 1.000 | 1.000 | 1.000 | 0.011 | 0.002 | 72 |
| `full` (Multimodal scaffold) | 0.938 | 0.917 | 0.914 | 0.219 | 0.113 | 72 |

### Per-Category Performance (`full` Scaffold, Test Split)
| Category | Precision | Recall | F1 |
| :--- | :---: | :---: | :---: |
| `pothole/road` | 0.750 | 1.000 | 0.857 |
| `garbage/waste` | 1.000 | 1.000 | 1.000 |
| `drainage/sewage` | 0.750 | 1.000 | 0.857 |
| `water supply` | 1.000 | 0.667 | 0.800 |
| `streetlight/electrical` | 1.000 | 0.667 | 0.800 |
| `stray animals` | 1.000 | 1.000 | 1.000 |
| `encroachment` | 1.000 | 1.000 | 1.000 |
| `other` | 1.000 | 1.000 | 1.000 |

---

## 2. Selective Prediction, Fairness & Priority

### Selective Risk vs. Coverage (`full` Scaffold)
| Target Coverage | Actual Coverage | Selective Risk (Error Rate) |
| :---: | :---: | :---: |
| 40% | 40.3% | 0.000 |
| 60% | 61.1% | 0.000 |
| 80% | 80.6% | 0.069 |
| 100% | 100.0% | 0.083 |

### Cross-Lingual Fairness (`full` Scaffold)
| Language Group | Test Records | Accuracy |
| :--- | :---: | :---: |
| English (`en`) | 24 | 1.000 |
| Hindi (`hi`) | 24 | 0.750 |
| Marathi (`mr`) | 24 | 1.000 |

- **Priority Prediction Accuracy:** `0.500` (72 test records)
- **Simulated Inter-Annotator Agreement (3 annotators):** Majority agreement = `0.997`, Pairwise agreement = `[0.975, 0.983, 0.964]` (`simulated: true`)

---

## 3. Duplicate Detection Ablations (M3)

| Signal Configuration | Precision | Recall | F1 | Pairs Evaluated |
| :--- | :---: | :---: | :---: | :---: |
| `spatial` (Haversine distance only) | 0.500 | 1.000 | 0.667 | 48 |
| `text` (TF-IDF cosine only) | 1.000 | 0.375 | 0.545 | 48 |
| `combined` (Spatial + Text) | 0.739 | 0.708 | 0.723 | 48 |
| `full` (Spatial + Text + Visual/Category) | 1.000 | 1.000 | 1.000 | 48 |

---

## 4. Forced Transparency Engine (FTE) & Service Unit Verification

Executed via Vitest (`npx vitest run --config vitest.config.ts`): **7/7 suites passed (112/112 tests)**.

| Test Suite | Tests Passed | Mechanism Verified |
| :--- | :---: | :--- |
| `adversarialService.test.ts` | 38 / 38 | 4 fraud rules (`PHOTO_REUSE` pHash Hamming $\le 8$, `TEMPORAL` ratio $< 0.10$, `GPS_MISMATCH` Haversine $> 500\text{m}$, `BULK_CLOSURE` $> \mu + 2\sigma$), coordinate privacy redaction, duplicate flag guards |
| `inactionService.test.ts` | 11 / 11 | SLA tier progression (T0–T4 across 0–31+ days), forward-only clock reset, batch event query, neglect-zone ward identification ($\ge 5$ T2+ issues) |
| `auditService.test.ts` | 9 / 9 | SHA-256 deterministic event hashing, genesis-to-head hash chaining, 100% tamper detection on intermediate event mutation |
| `priorityService.test.ts` | 23 / 23 | Category impact tiers (+10/+25/+40), age escalation bands (>14d, >30d), supporter thresholds (>10, >50), priority band mapping (P1–P4) |
| `workflowService.test.ts` | 23 / 23 | Strict forward state machine (`Open` $\to$ `Triaged` $\to$ `Assigned` $\to$ `In Progress` $\to$ `Claimed Resolved` $\to$ `Verified Fixed`/`Reopened`), RBAC enforcement |
| `authMiddleware.test.ts` | 5 / 5 | Session cookie verification (`nd_session`), expiry rejection, role-based access control (403 on unauthorized role) |
| `liveApi.test.ts` | 3 / 3 | Production credential inclusion (`credentials: 'include'`) and suppression of development `x-demo-role` headers |

---

## 5. Ready-to-Use LaTeX Tables for the Research Paper

```latex
% Table 2: Category Classification & Calibration Results (M1)
\begin{table}[htbp]
\centering
\caption{Category Classification and Confidence Calibration across Baselines ($N_{\text{test}}=72$, Synthetic Multilingual Split)}
\label{tab:classification_results}
\begin{tabular}{lccccc}
\toprule
\textbf{Model / Baseline} & \textbf{Precision} & \textbf{Recall} & \textbf{Macro-F1} & \textbf{ECE} $\downarrow$ & \textbf{Brier} $\downarrow$ \\
\midrule
Majority Prior (\texttt{prior}) & 0.016 & 0.125 & 0.028 & 0.195 & 0.147 \\
English Lexical (\texttt{keyword}) & 0.898 & 0.458 & 0.514 & 0.198 & 0.156 \\
Multilingual Lexical (\texttt{multilingual}) & 0.938 & 0.917 & 0.914 & 0.219 & 0.113 \\
Multinomial Naive Bayes (\texttt{trained\_nb}) & 1.000 & 1.000 & 1.000 & 0.011 & 0.002 \\
Full Multimodal Scaffold (\texttt{full}) & 0.938 & 0.917 & 0.914 & 0.219 & 0.113 \\
\bottomrule
\end{tabular}
\end{table}

% Table 3: Duplicate Detection Signal Ablation (M3)
\begin{table}[htbp]
\centering
\caption{Duplicate Detection Ablation across Spatial, Textual, and Combined Signals ($N=48$ pairs)}
\label{tab:duplicate_ablation}
\begin{tabular}{lccc}
\toprule
\textbf{Signal Configuration} & \textbf{Precision} & \textbf{Recall} & \textbf{F1 Score} \\
\midrule
Spatial Only (Haversine $< 500\text{m}$) & 0.500 & 1.000 & 0.667 \\
Text Only (TF-IDF Cosine) & 1.000 & 0.375 & 0.545 \\
Combined (Spatial + Text) & 0.739 & 0.708 & 0.723 \\
Full Model (Spatial + Text + Visual/Category) & 1.000 & 1.000 & 1.000 \\
\bottomrule
\end{tabular}
\end{table}

% Table 4: Forced Transparency Engine (FTE) Rule & Module Verification
\begin{table}[htbp]
\centering
\caption{Forced Transparency Engine (FTE) Unit Verification Summary}
\label{tab:fte_verification}
\begin{tabular}{llcc}
\toprule
\textbf{FTE Component} & \textbf{Rule / Property Tested} & \textbf{Assertions} & \textbf{Pass Rate} \\
\midrule
Adversarial Proof Detection (N3) & Photo reuse (pHash), temporal ratio, EXIF GPS, bulk closure ($>\mu+2\sigma$) & 38 & 100\% (38/38) \\
Inaction Amplification & SLA tiers (T0--T4), forward-only clock reset, ward neglect zones & 11 & 100\% (11/11) \\
Cryptographic Audit Ledger & SHA-256 event chaining, genesis linkage, tamper detection & 9 & 100\% (9/9) \\
Priority \& Workflow Engine & Severity/age/supporter scoring, state machine RBAC transitions & 46 & 100\% (46/46) \\
Auth \& Session Security & Cookie validation, role guards, demo-header suppression in prod & 8 & 100\% (8/8) \\
\midrule
\textbf{Total} & & \textbf{112} & \textbf{100\% (112/112)} \\
\bottomrule
\end{tabular}
\end{table}
```
