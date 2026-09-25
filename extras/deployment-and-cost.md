# NagarDrishti Deployment and Cost Plan

## Local development quick start

Prerequisites: Git, Docker Desktop/Engine with Compose, Python 3.11, Node 20 LTS (versions team to pin in the repository), and optional Colab for training. Commands assume a repository root called `nagardrishti`.

```bash
git clone <team-repository-url> nagardrishti
cd nagardrishti
cp .env.example .env
# Set non-secret local development values only; never commit .env.
python -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.lock
npm --prefix apps/web ci

docker compose -f infra/docker-compose.yml up -d postgres redis
python scripts/wait_for_db.py
python scripts/migrate.py
python scripts/load_demo_seed.py --dataset data/processed/demo_seed/v2026.10.12
uvicorn nagardrishti.api.main:app --reload --port 8000
npm --prefix apps/web run dev
```

Open the local web address printed by Vite; API health should return a non-sensitive status at `/health`. In a one-command demo mode, use `docker compose -f infra/docker-compose.yml up --build` after the image files are defined.

## Docker Compose sketch

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: nagardrishti
      POSTGRES_USER: nagar
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-localdevonly}
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nagar -d nagardrishti"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

  api:
    build: { context: ../., dockerfile: infra/Dockerfile.api }
    env_file: ../.env
    environment:
      DATABASE_URL: postgresql+psycopg://nagar:${POSTGRES_PASSWORD:-localdevonly}@postgres:5432/nagardrishti
      REDIS_URL: redis://redis:6379/0
    command: uvicorn nagardrishti.api.main:app --host 0.0.0.0 --port 8000
    ports: ["8000:8000"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  worker:
    build: { context: ../., dockerfile: infra/Dockerfile.api }
    env_file: ../.env
    command: python -m nagardrishti.worker
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

volumes:
  pgdata:
```

Production never uses the shown default password. Add an object-storage service only if local image storage is not sufficient; use an interface so the API can switch from filesystem/MinIO to hosted S3-compatible storage.

## Model serving options

| Option | Best for | Strength | Risk / decision |
|---|---|---|---|
| In-process API model | Small M1/M3 baseline and demo seed | Fewest services | CPU latency/memory; acceptable for small v1 |
| Redis worker loading models | M2/M5 and queued inference | API responds with explicit pending state | Requires worker health and cache management; preferred v1 |
| Separate Hugging Face Space/model endpoint | Optional public model showcase | Separates model runtime | Free-tier terms/cold starts team to verify; not demo-critical |
| Colab notebook endpoint | Training only | Free compute path | Not a serving dependency; do not expose or rely on it during demo |

Pin model artifact version in the registry. Cache the selected demo artifacts locally before the presentation. A failed inference returns pending/failed; it never makes up an issue category or a proof verdict.

## Environment and secret handling

`.env.example` contains only variable names and safe defaults. Local `.env`, hosted secret-store entries, and CI secrets share names: `DATABASE_URL`, `REDIS_URL`, `POSTGRES_PASSWORD`, `OBJECT_STORE_ENDPOINT`, `OBJECT_STORE_ACCESS_KEY`, `OBJECT_STORE_SECRET_KEY`, `JWT_SECRET`, `APP_ENV`.

* Keep production/demo passwords distinct from local development.
* Use platform secret settings for hosted deployments and GitHub Actions secrets only when a deployment actually needs them.
* Do not print environment variables in CI logs. Do not package `.env` in Docker images.
* If a secret appears in a commit, revoke/rotate it immediately, document the incident, and replace it; history cleanup alone is insufficient.

## CI basics

CI runs on pull requests and `main`: format/lint, type check, unit tests, API golden tests, smoke test against compose, and a build of the web/API images. Deploy only from reviewed `main`, with manual approval if a hosted deploy exists.

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pip install -r requirements.lock
      - run: ruff format --check . && ruff check .
      - run: mypy src
      - run: pytest -q tests/unit tests/api_golden
      - run: npm --prefix apps/web ci && npm --prefix apps/web run build
      - run: docker compose -f infra/docker-compose.yml up -d --build
      - run: python scripts/wait_for_db.py && python scripts/migrate.py
      - run: python scripts/load_demo_seed.py --ci
      - run: python scripts/smoke_test.py
      - if: always()
        run: docker compose -f infra/docker-compose.yml logs --no-color
```

Exact action versions and hosted service limits are team to verify before submission.

## Free-tier hosting comparison

| Option | Suitable components | Strength | Limits / cautions | v1 use |
|---|---|---|---|---|
| Local Docker laptop | All services | No external outage, no recurring cost | Needs Docker-capable machine and preloaded artifacts | Source-of-truth demo |
| GitHub Pages-style static host | PWA build | Simple/free for static assets | API/models elsewhere; current terms team to verify | Optional web preview |
| Render/Fly/Railway-style free service | API/worker/small DB depending plan | Familiar deployment workflow | Sleep, quotas, policy/free-tier changes; terms team to verify | One optional hosted demo only |
| Managed Postgres free tier | Database | Avoids self-host DB | May have tiny storage/sleep; terms team to verify | Optional, not required |
| Object storage free tier | Demo images | S3 API compatibility | Egress/access policy and terms team to verify | Optional |
| Hugging Face Space | Model showcase | Convenient interactive model page | Cold starts and limits; team to verify | Noncritical model endpoint |

## Cost plan

| Scenario | Components | Expected monthly cost | Assumptions / controls |
|---|---|---:|---|
| Zero-budget course/demo | Local Docker, local filesystem/MinIO, GitHub repo/CI, Colab/local training, prerecorded fallback | **₹0 target** | Existing laptop/internet; all provider terms and quotas team to verify; cache models and limit image size |
| Small pilot | One small API/worker host, managed PostGIS, object storage, domain optional | **₹0–₹3,000 planning envelope** | Not a price promise; team must verify current provider/student credits, storage, egress, and billing before enabling any paid resource |
| Avoid in v1 | Multiple regions, always-on GPU, paid map API, SMS/phone auth, production observability suite | **Do not budget** | These violate near-zero scope unless faculty approves a pilot |

Set provider spending alerts/caps if available; team to verify. Remove test deployments after assessment and export data first.

## Seed/demo data loader

`python scripts/load_demo_seed.py --dataset data/processed/demo_seed/v2026.10.12 --reset` should:

1. Run only against a clearly marked local/demo database and require `--reset` before destructive clearing.
2. Load ward/cell geometry, departments, all eight category examples, safe before/after images, mock users, and append-only status events.
3. Insert a scripted pair of nearby duplicate reports and a scripted fake proof-of-fix: reused/stale/wrong-location metadata or image hash that M5 must flag.
4. Seed citizen confirmations so two nearby “no” responses demonstrate **Reopened**, while a separate valid path can show **Verified Fixed** only through the approved workflow.
5. Print stable fixture IDs/click paths and validate the hash chain, map aggregation, and scorecard totals.

Seed assets must be synthetic or consent-cleared; names/phones/exact residences are forbidden.

## Backups and recovery

* Before each major integration, export `pg_dump` to an encrypted/local restricted folder and version the seed manifest/checksum.
* Keep source code in Git, data/model metadata in the repository, and large approved artifacts in named storage with checksums.
* Weekly: test restore into a clean local database and run the smoke test.
* Before demo day: make two offline copies of the final release, seed archive, model artifacts, and recording on separate team-controlled devices. Do not rely solely on a cloud drive.
* Recovery order: restore code at release tag → start compose → restore database/seed → verify hash chain → smoke test → open scripted demo route.

## Demo-day runbook

### Day before

- [ ] Freeze release tag; run from the exact presentation laptop, not a development branch.
- [ ] Rebuild/start compose; seed database; run smoke test; verify map, images, M5 fake-fix flag, 2+ citizen reopen, and scorecards.
- [ ] Pre-warm API/worker by running the scripted demo once; cache map view/tiles only in a permitted way and use static fallback if unavailable.
- [ ] Download model artifacts, dependencies/images if possible, screen recording, slides, screenshots, and backup seed to two devices.
- [ ] Charge laptop/phone, test projector/HDMI adapter, browser zoom, microphone, and hotspot.

### Thirty minutes before

- [ ] Start local services and verify `/health`; open browser tabs at the seeded initial state.
- [ ] Confirm no real personal data is visible; reset demo fixture if needed.
- [ ] Put host machine in do-not-disturb; disable auto-update/sleep; plug in power.
- [ ] Keep the prerecorded 7-minute video and static deck ready locally.

### If something fails

1. If hosted service fails, switch to local compose.
2. If local inference fails, use cached seeded outputs and say the demo is showing the reproducible seeded pipeline; do not pretend a model just ran.
3. If browser/map fails, play the recording at the same beat and show the static status/scorecard screenshots.
4. If database fails, use the recorded demo plus explain the tested Docker/seed command. Protect presentation time; investigate after the session.
