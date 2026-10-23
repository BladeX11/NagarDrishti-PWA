# NagarDrishti Team Task Breakdown

## Objective

Deliver a reliable civic-issue platform with two connected surfaces:

1. A citizen-first installable PWA for reporting and tracking issues.
2. A web dashboard for officers, administrators, public transparency, and research evaluation.

The four tracks below are parallel ownership areas. They share the API contracts, database schema, design tokens, and acceptance checklist documented in `docs/PROJECT_DOCUMENTATION.md`.

## Person 1: PWA and Mobile Experience

**Owns:** `client/src/pwa`, citizen report flow, installability, mobile UX, camera/location behavior.

**Deliverables:**

- Validate manifest, icons, service-worker scope, cache versioning, and install prompt on Android Chrome and iOS Safari.
- Finish the offline complaint lifecycle: draft, queued, retrying, uploaded, and failed states.
- Add and test camera capture, GPS permission handling, fallback location behavior, image compression, and upload progress.
- Verify responsive layouts at 360px, 375px, 412px, tablet, and desktop widths.
- Validate push opt-in and notification click-through to the correct citizen report.
- Add browser/device test evidence to the release checklist.

**Acceptance criteria:**

- A citizen can create a report with no network, close the app, reconnect, and see it upload exactly once.
- A citizen can install the PWA and reopen it from the device launcher.
- No report or image is silently lost; failures are visible and retryable.
- Keyboard navigation, readable contrast, safe-area padding, and touch targets are verified.

## Person 2: Dashboard and Product Workflow

**Owns:** officer dashboard, citizen timeline, public transparency views, live refresh, product UX.

**Deliverables:**

- Connect all dashboard cards, tables, maps, issue detail views, and citizen timelines to live API data.
- Complete officer assignment, department updates, status transitions, proof review, and notification feedback.
- Remove placeholder-only states and clearly label any research/demo data that remains.
- Add loading, empty, error, unauthorized, and stale-data states.
- Add browser tests for the citizen-to-officer-to-resolution workflow.
- Keep public transparency read-only and protect officer actions behind server authorization.

**Acceptance criteria:**

- A submitted citizen report appears in the officer queue without a manual database edit.
- An officer status change is visible in the citizen timeline and public view after refresh/polling.
- A citizen can only see their own reports; officer actions require an officer/admin session.
- Dashboard behavior remains usable on desktop and tablet widths.

## Person 3: Backend, Security, and Deployment

**Owns:** `server`, migrations, storage, notifications, production runtime, observability.

**Deliverables:**

- Configure production OTP through Resend or Twilio, with rate limits, expiry, replay prevention, and audit logging.
- Configure S3-compatible object storage and move production images off local disk.
- Configure VAPID push credentials and verify subscription lifecycle and status notifications.
- Apply migrations safely, create real officer/admin accounts, and verify least-privilege authorization.
- Deploy the API and frontend behind a real domain with HTTPS, Caddy, secure cookies, and restricted CORS.
- Add health checks, structured logs, backup/restore instructions, and error monitoring.
- Run dependency, secret, upload, and authorization checks before release.

**Acceptance criteria:**

- Production rejects demo role login and requires verified identity.
- Uploaded media is stored in object storage with private-by-default access and controlled delivery.
- HTTPS, secure session cookies, CORS, rate limiting, and authorization are verified with an end-to-end test.
- A fresh environment can be restored from documented environment variables and migrations.

## Person 4: AI and Research Evaluation

**Owns:** issue understanding, duplicate scoring, issue graph, confidence, abstention, dataset, baselines, paper evidence.

**Deliverables:**

- Collect and label several hundred English, Hindi, and Marathi issue records.
- Maintain independent train/validation/test splits, multiple annotators, adjudication, and agreement scores.
- Implement reproducible category and priority prediction, multilingual normalization, duplicate retrieval, and graph construction.
- Calibrate confidence and implement human abstention for low-confidence or high-impact decisions.
- Compare against transparent baselines and report macro-F1, balanced accuracy, AUROC/AUPRC, calibration error, selective risk, duplicate precision/recall, fairness slices, and ablations.
- Generate experiment results through the evaluation runner; never hand-edit research numbers.
- Produce a reproducibility bundle with fixed seeds, configurations, dataset version, environment, and run IDs.

**Acceptance criteria:**

- Every reported metric can be regenerated from versioned data and configuration.
- The system abstains when confidence is insufficient instead of presenting uncertain automation as fact.
- Results include language, ward, category, and priority slices where sample sizes are defensible.
- The paper distinguishes prototype engineering results from human-labeled experimental results.

## Shared Interfaces

- Person 1 consumes the stable issue creation, upload, and notification APIs owned by Person 3.
- Person 2 consumes issue, assignment, status, metrics, and notification APIs owned by Person 3.
- Person 4 consumes immutable issue snapshots and event logs; AI predictions must be versioned and explainable in the dashboard.
- Database changes require a migration and an update to the schema/API documentation.
- Any breaking API change requires an updated TypeScript client and an integration test.

## Suggested Execution Order

1. Person 3 locks production-safe API contracts, auth, storage, migrations, and local deployment.
2. Persons 1 and 2 complete the PWA and dashboard flows against those contracts.
3. Person 4 runs the evaluation pipeline on frozen dataset versions and publishes result artifacts.
4. All four run the final end-to-end, security, mobile, performance, and reproducibility checks.

## Git and Handoff Convention

Use one branch per track:

- `feature/pwa-mobile`
- `feature/dashboard-workflow`
- `feature/backend-deployment`
- `feature/ai-evaluation`

Keep commits small and scoped. Do not commit `.env`, credentials, raw private citizen data, uploaded images, or generated secrets. Merge only after `pnpm check`, `pnpm build`, migration validation, and the relevant acceptance tests pass.
