# NagarDrishti Finalization Checklist

## Completed in the Prototype

- Citizen web and PWA reporting flow
- Photo upload and private media metadata
- PostgreSQL issue, workflow, and audit storage
- Officer triage and status lifecycle
- Public transparency map
- Duplicate scoring and spatial-temporal issue graph
- Confidence calibration and human abstention fields
- Versioned evaluation benchmark
- Train/validation/test split contract
- Heuristic and trained Naive Bayes classification baselines
- Duplicate-detection baselines
- Calibration, selective-risk, and fairness metrics
- Research metrics dashboard
- Human annotation workspace for 120 records
- Annotation progress, agreement summary, and CSV export
- Reproducibility and annotation protocols

## Required Before Paper Submission

1. Start PostgreSQL/Redis and apply migration `0003_brainy_carlie_cooper.sql`.
2. Collect real labels from at least three independent annotators.
3. Replace simulated agreement with real Fleiss' kappa and Cohen's kappa.
4. Add real complaint images and human duplicate-pair labels.
5. Train image or multimodal embeddings using a fixed training split.
6. Keep the test set locked until all model and calibration decisions are frozen.
7. Compare against standard published baselines.
8. Fit calibration on validation data only.
9. Report confidence intervals, fairness gaps, and selective-risk curves.
10. Run ablations for text, image, spatial, temporal, and graph features.
11. Record model, data, seed, and configuration versions for every experiment.

## Scientific Integrity Rule

The seeded benchmark and trained baseline validate the software pipeline only. They must not be described as human-labeled municipal evidence or as final generalization results.
