# NagarDrishti Evaluation Reproducibility

## Evaluation Contract

- Benchmark version: `civictrust-benchmark-v1`
- Evaluation seed: `20260927`
- Languages: English (`en`), Hindi (`hi`), Marathi (`mr`)
- Classification cases: 360 deterministic cases across 8 civic categories
- Duplicate pairs: 12 labeled spatial-text pairs
- Runtime endpoint: `GET /api/research/evaluation`
- Benchmark endpoint: `GET /api/research/evaluation/benchmark`

## Running the Evaluation

```powershell
cd D:\AI-ty\NagarDrishti\nagardrishti-frontend
pnpm check
pnpm build
pnpm dev:server
Invoke-RestMethod http://localhost:5000/api/research/evaluation | ConvertTo-Json -Depth 10
```

The runner is deterministic for all model outputs. The timestamp is generated at request time and is not part of the metric calculation.

The current benchmark is templated synthetic data. A trained Naive Bayes baseline is included to validate the train/test plumbing, but its results must not be interpreted as evidence of municipal generalization.

## Baselines

Classification baselines are `prior`, English-only `keyword`, multilingual `multilingual`, trained multilingual `trained_nb`, and the `full` multimodal scaffold. The trained baseline uses only the train split and is evaluated on the locked test split. Duplicate baselines are spatial-only, text-only, combined spatial-text, and the full spatial-text-image score.

## Reported Metrics

- Macro precision, recall, and F1
- Per-category precision, recall, and F1
- Expected Calibration Error (ECE)
- Brier score
- Calibration bins
- Selective risk versus coverage
- Duplicate precision, recall, and F1
- Priority accuracy
- Language-group accuracy
- Annotator agreement summary

## Limitations

This benchmark is a transparent seeded prototype with simulated annotator labels, not a substitute for a real labeled municipal dataset. Conference claims must be rerun on held-out human-labeled data before publication. The image signal is represented by controlled benchmark similarity values until real image embeddings are added. Simulated agreement must never be reported as human inter-annotator agreement.
