# NagarDrishti Engineering Conventions

## Python and project layout

* Target Python 3.11 unless a dependency forces a documented exception. Use 4 spaces, UTF-8, `snake_case` functions/variables, `PascalCase` classes, and `UPPER_CASE` constants.
* Format with `ruff format`; lint with `ruff check`; type-check public Python with `mypy` or `pyright`. CI must run the chosen commands.
* Type all public functions, request/response schemas, and pipeline boundaries. Use `Path`, `datetime`, `UUID`, enums, and Pydantic models instead of untyped dictionaries at API boundaries.
* Public modules/classes/functions have concise Google-style docstrings stating inputs, outputs, errors, and privacy or model assumptions where relevant.

```text
src/nagardrishti/
├── contracts/     # schemas, status/category enums
├── data/          # validation, splits, transforms
├── ml/            # m1_text through m6_analytics
├── services/      # duplicate, verification, ledger orchestration
├── repositories/  # database access
├── api/           # routes and dependency wiring
└── settings.py
```

Keep business logic out of route handlers and notebooks. A module should be importable without requiring cloud credentials or a GPU.

## Notebook discipline

Notebooks are exploration only. They may inspect a sample, compare hypotheses, and make a plot, but are not the production source of truth.

- Name as `YYYYMMDD_topic_initials.ipynb` and put the associated issue at the top.
- Clear outputs before committing; do not store raw private images, secrets, or full model weights in notebooks.
- When an experiment is adopted, move loader, transform, feature, training, evaluation, and inference code into `src/` or `scripts/`, add a test, and leave the notebook as a short pointer to the module/run ID.
- A PR cannot require “run these notebook cells in order” to reproduce a feature.

## Configuration and secrets

Use `.env` locally and commit only `.env.example` with empty or dummy values. Use Pydantic settings to validate required values on startup.

```python
# src/nagardrishti/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379/0"
    object_store_bucket: str = "nagardrishti-dev"
    app_env: str = "dev"
    model_registry_path: str = "models/registry.csv"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

Never commit API keys, database URLs with passwords, service-account files, Colab tokens, signed URLs, raw personally identifying data, or production image media. Rotate an exposed secret; deleting it from the latest commit is not enough. CI/deployment secrets come from the platform secret store and are named consistently, for example `DATABASE_URL`, `REDIS_URL`, `OBJECT_STORE_*`.

## Dataset versioning and names

Use immutable dataset release folders and a dataset card. Raw source files are read-only; derived data always records its source release and script commit.

```text
data/{raw|interim|processed}/{dataset_slug}/vYYYY.MM.DD/
  manifest.csv
  checksums.sha256
  dataset-card.md
  labels.csv
  splits/{train,val,test}.csv
```

File names: `{source}_{language-or-category}_{yyyymmdd}_{shortid}.{ext}`. Examples: `fieldwalk_marathi_20260912_a73f.jpg`, `synthetic_hindi_20260829_0421.jsonl`. Use language codes `mr`, `hi`, `en`. Stored/API category values must be exactly: `pothole/road`, `garbage/waste`, `drainage/sewage`, `water supply`, `streetlight/electrical`, `stray animals`, `encroachment`, `other`. A filename-safe derived slug may replace `/` or spaces with `_`, but it is never a separate taxonomy value.

Each manifest includes `record_id`, `source_type` (`public_proxy`, `synthetic`, `self_collected`), licence/permission, consent flag, language, category, collection date, privacy review state, hash, and split. Do not mix the same physical issue across train/validation/test. Synthetic data is visibly flagged in data cards, UI seed data, and paper tables.

## Model artifacts and registry

Artifact filename: `{module_id}_{architecture}_{data_version}_{metric-name}{metric}_{runid}.pt` or `.joblib`; example `m1_muril_v2026.09.07_macroF1-0.71_r014.pt`. Large files live in approved storage, not ordinary Git.

`models/registry.csv` uses this minimum format:

| model_id | module | run_id | git_sha | data_version | task | architecture | seed | split | primary_metric | metric_value | artifact_uri | card_path | approved_by | status |
|---|---|---|---|---|---|---|---:|---|---|---:|---|---|---|---|
| `m1-r014` | M1 | `r014` | `abc1234` | `v2026.09.07` | category+department | MuRIL | 42 | group split | macro_f1 | 0.71 | private artifact path | `docs/model-cards/m1-r014.md` | R1 | candidate |

Status is `candidate`, `approved`, `deprecated`, or `rejected`; it is not a citizen-issue status. Every approved model has a card: purpose, training data/source types, language/category coverage, baseline, held-out metrics, error slices, threshold, limitations, privacy/ethical considerations, and rollback artifact.

## Experiment tracking: CSV/MLflow-lite

A shared append-only `experiments/runs.csv` is sufficient. Optionally mirror it to MLflow local tracking, but the CSV remains the portable record.

```text
run_id,timestamp,module,git_sha,data_version,split,seed,command,params_json,
metric_name,metric_value,per_slice_json,artifact_uri,owner,notes
```

Log per run: purpose/hypothesis, exact command, commit SHA, Python/package lock version, data manifest hash, split definition, seed, hardware/Colab note, hyperparameters, duration, metrics (overall and language/category slices), confusion matrix or error examples, threshold, artifact path, and known limitation. Log failures too; failed runs prevent duplicated effort and selective reporting.

## Reproducibility rules

1. Set and log seeds for Python, NumPy, framework, and data split; document unavoidable nondeterminism.
2. Pin Python dependencies in `requirements.lock` or a lockfile; update intentionally and record why. `requirements.txt` may be a human-readable input, not the only record.
3. Provide one command per module for train, evaluate, and infer. Commands accept configuration path, data release, seed, output directory, and no hidden notebook state.
4. Colab is a compute environment, not a separate codebase. Clone the same commit, install the same lockfile, mount no secret data by default, and copy back only registered artifacts/metrics. Record Colab runtime/GPU in the run record.
5. A clean clone plus documented seed data must run `scripts/smoke_test.py` locally or in CI. No result enters the paper until a teammate independently reruns its evaluation command.

## Testing strategy

| Layer | What to test | Minimum examples |
|---|---|---|
| Unit | Pure pipeline functions: category normalization, H3/public-location transform, duplicate features, status transition guard, hash-chain calculation, M5 rules | Normal, boundary, malformed, privacy-sensitive input |
| Integration | Repository/database routes and async task handoff | Submit → inference queued → issue response; proof upload → review; 2 nearby “no” votes → Reopened |
| API golden file | Stable public request/response shape | JSON fixtures for create issue, issue map, scorecard, proof status; update intentionally only with review |
| Model | Data leakage/split validation, metric calculation, fixed tiny evaluation fixture | One deterministic baseline and one regression slice per M1–M5 used |
| Smoke | `python scripts/smoke_test.py` | Start services, migrate/seed, request health/map, run one fake report and verifier case |

Tests use synthetic or consent-cleared fixtures only. Golden files exclude timestamps, secrets, exact home coordinates, and unstable IDs. Bug fixes add a regression test before or alongside the fix.

## Logging and error handling

Use structured logs with `timestamp`, `level`, `request_id`, `issue_id` where safe, `module`, `event`, `duration_ms`, and sanitized error code. Do not log voice text, raw photo URL, contact data, exact coordinates, tokens, EXIF payloads, or stack traces to public responses.

- Return explicit, consistent API errors: `400` invalid input, `401/403` access failure, `404` absent resource, `409` illegal state/duplicate conflict, `422` schema error, `429` throttled, `500` unexpected fault.
- Model/inference failures return a bounded degraded state and queue retry when appropriate; they never fabricate category, urgency, proof, or **Verified Fixed**.
- Catch expected exceptions at the boundary, add context, and re-raise or translate. Avoid broad `except Exception: pass`.
- Hash-chain/status verification failures are high severity: reject the transition, preserve evidence, alert R3, and write a non-sensitive audit event.

## Pre-submission repository hygiene checklist

- [ ] `main` is green from a clean clone; smoke test and core demo script pass.
- [ ] Dependency lock, Python/Node versions, run commands, environment template, migrations, and seed instructions are documented.
- [ ] No `.env`, credentials, raw private media, unreviewed personal data, or large model weights are tracked.
- [ ] Git history/working tree reviewed for accidental files; licence and attribution files are present.
- [ ] Data cards name public proxy, synthetic, and self-collected portions honestly; consent/privacy status is recorded.
- [ ] Model registry/cards, experiment CSV, exact metrics, seeds, test split and baseline comparisons are complete.
- [ ] UI copy uses the eight approved categories and does not claim officer scoring, municipal integration, legal findings, or treasury auditing.
- [ ] API has golden fixtures; status history and M5/reopen logic have regression tests.
- [ ] README includes a 10-minute local run path and a limitations section.
- [ ] Release is tagged; demo assets and paper figures are reproducible from named scripts/commits.
