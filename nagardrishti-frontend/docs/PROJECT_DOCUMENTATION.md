# NagarDrishti Project Documentation

## 1. Product Summary

NagarDrishti is a civic issue reporting and resolution platform. Citizens submit location-aware complaints through an installable PWA. Officers triage, assign, update, and close issues through a web dashboard. Public users can inspect aggregated progress, while the research layer evaluates multilingual issue understanding, duplicate detection, prioritization, calibrated confidence, and human abstention.

The product is designed as a working prototype first and a deployable public-service system second. Development shortcuts are explicitly separated from production behavior.

## 2. System Architecture

```text
Citizen PWA
  -> API: auth, issue creation, media upload, reports, notifications
  -> PostgreSQL/PostGIS: users, issues, events, locations, predictions
  -> Object storage: report images and evidence
  -> AI pipeline: language normalization, category/priority, duplicate retrieval, graph, confidence
  -> Officer dashboard: queue, assignment, status, proof review
  -> Public transparency: read-only aggregates and map views
  -> Web Push/email: citizen status updates and operational alerts
```

### Technology stack

- Frontend: React, TypeScript, Vite, Tailwind/shadcn-compatible UI, service worker, IndexedDB.
- Backend: Node.js, Express, TypeScript, Drizzle ORM.
- Data: PostgreSQL with PostGIS-compatible location fields, Redis for queues/cache.
- Media: S3-compatible object storage in production; local storage only as a development fallback.
- Notifications: Web Push with VAPID; email/SMS OTP through Resend or Twilio.
- Deployment: Docker, Caddy reverse proxy, HTTPS, secure cookies, environment-based configuration.

## 3. Repository Map

```text
client/                 React web dashboard and citizen PWA
client/public/           manifest, icons, service worker, static assets
client/src/pwa/          IndexedDB queue, sync, PWA helpers
server/                 Express API, middleware, routes, services
server/db/               Drizzle schema, migrations, seed data
server/services/         storage, notifications, issue/AI orchestration
deploy/                  Caddy and production deployment files
docs/                    runbooks, evaluation, team and project documentation
shared/                  shared types and validation contracts
```

## 4. Local Development

Run these commands from:

```powershell
cd D:\AI-ty\NagarDrishti\nagardrishti-frontend
```

The actual repository directory is `D:\AI-ty\NagarDrishti\nagardrishti-frontend`; if PowerShell interprets the displayed line incorrectly, use the exact command below:

```powershell
cd D:\AI-ty\NagarDrishti\nagardrishti-frontend
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
```

Use two terminals for development:

```powershell
# Terminal 1
pnpm dev:server

# Terminal 2
pnpm dev
```

Open the frontend at `http://localhost:3000`. The API health checks are `http://localhost:5000/api/health` and `http://localhost:5000/api/health/db`.

For a production-like local run:

```powershell
pnpm check
pnpm build
pnpm start
```

On Windows, the start script uses `cross-env`, so `NODE_ENV=production` works in PowerShell and Command Prompt.

## 5. Authentication and Roles

Production authentication is email OTP based. A user requests a code, verifies it, receives a server-side session, and then selects or is assigned an authorized workspace. The server must never trust a client-only role selector.

For local prototype work, Vite development mode supports the demo role shortcut when `ALLOW_DEMO_LOGIN=true`. This is intentionally disabled by `docker-compose.prod.yml` and must not be enabled on a public deployment.

Roles:

- Citizen: create reports, view own reports, receive status updates.
- Officer: view assigned/department queue, update status, assign work, review proof.
- Admin: manage operational configuration and privileged accounts.
- Public: read-only transparency aggregates.

Required production secrets and providers are documented in `.env.example` and `deploy/PRODUCTION.md`.

## 6. API Surface

Core routes are mounted under `/api`:

- `/api/auth`: OTP request/verification, session, logout.
- `/api/issues`: create, list, detail, assignment, status, proof, and citizen-owned reports.
- `/api/notifications`: push subscription and notification state.
- `/api/map`: public and operational geographic summaries.
- `/api/metrics`: dashboard and research metrics.
- `/api/health`: service and database health checks.

All mutation routes validate input, require the correct role, and write an auditable event. Media uploads should use the storage service rather than exposing local filesystem paths.

## 7. PWA Behavior

The PWA includes:

- Installable manifest and 192px/512px icons.
- Service-worker application-shell caching and push event handling.
- IndexedDB drafts and an offline upload queue.
- Automatic retry after connectivity returns.
- Camera/location hooks, upload status, and citizen report timeline.
- Optional push notifications that deep-link to a report.

PWA release checks:

1. Build with `pnpm build`.
2. Serve the built app over HTTPS or localhost.
3. Confirm the manifest and service worker in browser DevTools.
4. Test install, offline navigation, draft creation, reconnect sync, camera, location, and push on Android Chrome and iOS Safari.
5. Follow `docs/PWA_RUNBOOK.md` for troubleshooting.

## 8. AI Architecture

The AI layer is designed as a decision-support system rather than an unreviewed automatic authority.

1. **Input normalization:** detect language, normalize script and spelling, preserve the original text, and extract location/time/media metadata.
2. **Issue understanding:** predict category and priority with a model version and confidence distribution.
3. **Duplicate retrieval:** retrieve semantically similar issues, combine text similarity with distance/time/category signals, and score candidate pairs.
4. **Issue graph:** connect likely duplicates and related reports into components so officers see the underlying problem rather than isolated tickets.
5. **Calibration:** calibrate probabilities on validation data and report expected calibration error and reliability diagrams.
6. **Human abstention:** route low-confidence, high-impact, out-of-distribution, or fairness-sensitive cases to an officer instead of forcing a label.
7. **Feedback loop:** record officer corrections as labeled events; never silently overwrite prior predictions.

Research claims must be supported by the evaluation runner, frozen dataset versions, baseline comparisons, ablations, calibration metrics, selective-risk curves, fairness slices, and reproducibility configuration. Synthetic seed data is useful for demos but is not evidence for a paper.

## 9. Data and Research Protocol

The target evaluation set contains several hundred realistic English, Hindi, and Marathi records with:

- human category and priority labels;
- human-labeled duplicate pairs;
- independent train, validation, and test splits;
- multiple annotators, adjudication, and agreement scores;
- privacy-safe identifiers and documented consent/redaction procedures.

Evaluation should report macro-F1, balanced accuracy, AUROC/AUPRC where appropriate, expected calibration error, Brier score, selective risk/coverage, duplicate precision/recall, fairness slices, and ablation results. Each run records a seed, model/configuration version, dataset hash, timestamp, and artifact path.

## 10. Production Deployment

The production path is:

1. Provision PostgreSQL, Redis, object storage, email/SMS OTP, VAPID keys, domain, and HTTPS certificate.
2. Set production environment variables from `.env.example`; do not commit them.
3. Apply migrations and create real officer/admin accounts.
4. Build and start the Docker image using `docker-compose.prod.yml`.
5. Put Caddy in front of the app using `deploy/Caddyfile`.
6. Verify secure cookies, CORS, health checks, upload access, push delivery, backups, and logs.
7. Run the end-to-end release checklist before inviting real users.

Images must use cloud object storage in production. Local disk storage is a development fallback only. Production must use HTTPS because service workers, geolocation, camera permissions, and push notifications require a secure context.

## 11. Verification Checklist

Before merging or releasing:

- `pnpm check` passes.
- `pnpm build` passes.
- `pnpm db:migrate` succeeds against a clean database.
- Seed data runs without duplicate or credential errors.
- API health and database health return success.
- Citizen report creation, offline queue, reconnect sync, and own-report access work.
- Officer assignment, status update, proof review, and citizen notification work.
- Unauthorized roles cannot mutate protected resources.
- PWA install and service worker are verified on target mobile browsers.
- AI metrics come from generated experiment artifacts, not manually entered values.
- No `.env`, tokens, raw private data, uploads, or generated secrets are committed.

## 12. Git Workflow

Use scoped branches for the four tracks listed in `docs/TEAM_TASK_BREAKDOWN.md`. Keep the repository root as the only push boundary. Before staging, inspect `git status` and stage only files inside this repository. Never use parent-folder wildcards, and never commit local environment files.
