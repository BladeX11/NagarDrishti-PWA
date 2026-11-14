# NagarDrishti — Production Cloud Deployment Summary (Railway)

**Date:** 2026-11-14  
**Live URL:** https://nagardrishti-pwa-production.up.railway.app  
**Health Check:** https://nagardrishti-pwa-production.up.railway.app/api/health/db  
**Connected Documents:**
- [SESSION_LOG.md](./plans/progress/SESSION_LOG.md) — Tracks the progression from Phase 1 (Database & Vertical Slice) through Phase 5 (Cascade & Equity) and final evaluation.
- [TEST_RESULTS.md](./TEST_RESULTS.md) — Documents the 100/100 passing backend/AI unit test suite and benchmark evaluations verified immediately prior to cloud deployment.
- [MISTAKES.md](./MISTAKES.md) — Documents historical and deployment-related engineering fixes (non-interactive Drizzle migrations, `.env` import ordering, UUID foreign keys, and patched dependency resolution).
- [deploy/PRODUCTION.md](./nagardrishti-frontend/deploy/PRODUCTION.md) — Original VPS/Caddy deployment specification adapted here for managed PaaS deployment.

---

## 1. What Was Built & Configured

NagarDrishti has been deployed as a unified, single-origin HTTPS Progressive Web Application (PWA) on **Railway** (`graceful-tranquility` project) backed by a managed PostgreSQL 16 service.

### Key Components Deployed
1. **Multi-Stage Production Docker Image ([nagardrishti-frontend/Dockerfile](./nagardrishti-frontend/Dockerfile)):**
   - **Stage 1 (`build`):** Uses `node:22-alpine` with `corepack` and `pnpm` to install locked dependencies (including custom patches in `patches/wouter@3.7.1.patch`), builds the React 19 + Vite frontend into `dist/public`, and bundles the Express + TypeScript backend into `dist/index.js` via `esbuild`.
   - **Stage 2 (`runtime`):** Installs runtime and migration dependencies, copies `dist/`, `server/db/`, and `drizzle.config.ts`, creates `/app/uploads/issues` for local media fallback, and runs automated Drizzle schema migrations (`pnpm drizzle-kit migrate`), idempotent demo seeding (`pnpm db:seed`), and the HTTP server (`node dist/index.js`).
2. **Railway Infrastructure-as-Code ([nagardrishti-frontend/railway.toml](./nagardrishti-frontend/railway.toml)):**
   - Configures the `DOCKERFILE` builder rooted at `/nagardrishti-frontend`.
   - Binds readiness/liveness verification to `/api/health/db` with a 120-second startup window to allow initial PostgreSQL schema migration and seeding to complete before traffic routing.
3. **Docker Build Context Filtering ([nagardrishti-frontend/.dockerignore](./nagardrishti-frontend/.dockerignore)):**
   - Excludes local `node_modules`, `.env*` secrets, `dist`, `uploads`, `.manus-logs`, and test suites (`tests`, `testsprite_tests`) to prevent secret leakage and reduce build context size.
4. **Managed PostgreSQL & Environment Provisioning:**
   - Linked Railway's managed `Postgres` service via `${{Postgres.DATABASE_URL}}`.
   - Configured cryptographic `SESSION_SECRET` (48-byte hex), `OTP_SECRET` (48-byte hex), and P-256 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for Web Push notifications.

---

## 2. How It Works in Detail

1. **Single-Origin Mobile-First Architecture:**
   - Mobile browser APIs required by NagarDrishti (`navigator.serviceWorker`, Web Push notifications, `navigator.geolocation`, camera media capture, and `SameSite=Lax; Secure; HttpOnly` session cookies) require a single TLS-terminated HTTPS origin.
   - Railway terminates TLS at its edge proxy (`https://nagardrishti-pwa-production.up.railway.app`) and forwards traffic to port `5000` inside the container.
   - Express (`server/app.ts`) is configured with `app.set('trust proxy', 1)` so rate limiting (`express-rate-limit`) and secure cookies accurately detect HTTPS and client IPs behind Railway's reverse proxy.
   - Express serves `/api/*` routes, `/uploads/*` media files, and the static PWA bundle (`dist/public`) with an SPA catch-all fallback from the same origin.
2. **Startup Migration & Idempotent Seeding Pipeline:**
   - On container boot, `pnpm drizzle-kit migrate` applies SQL migrations in `server/db/migrations` non-interactively (avoiding the interactive TTY failure logged in `MISTAKES.md`).
   - Next, `pnpm db:seed` (`server/db/seed.ts`) inserts reference wards, departments, SLA policies, and demo users with `.onConflictDoNothing()`, and checks if issues already exist before inserting the 25 Pune locality demo issues, status hash chains, and scorecard snapshots.
3. **In-Process AI & Local Media Fallback:**
   - `AI_CATEGORY_PROVIDER=local-ml` runs the Multinomial Naive Bayes / lexical classifier and duplicate/adversarial pipelines in-process via `server/ai/queue.ts` without requiring an external Redis cluster.
   - Setting `OBJECT_STORAGE_REQUIRED=false` allows `server/services/objectStorage.ts` to write sanitized issue images to `/app/uploads/issues` when S3/R2 credentials are omitted.

---

## 3. Problems Faced & How They Were Solved

### Problem 1: Patched Dependency Failure in Docker Multi-Stage Builds
- **Cause:** `package.json` declares `"patchedDependencies": { "wouter@3.7.1": "patches/wouter@3.7.1.patch" }`, but the original `Dockerfile` only copied `package.json` and `pnpm-lock.yaml` before running `pnpm install --frozen-lockfile`.
- **Solution:** Added `COPY patches ./patches` prior to `RUN pnpm install --frozen-lockfile` in both the `build` and `runtime` stages of `nagardrishti-frontend/Dockerfile`.

### Problem 2: Monorepo Subdirectory Resolution on Railway
- **Cause:** The GitHub repository root (`NagarDrishti-app`) contains documentation, planning artifacts, and a legacy prototype alongside the full-stack app in `nagardrishti-frontend/`.
- **Solution:** Set the Railway service **Root Directory** to `/nagardrishti-frontend` and placed `railway.toml` and `.dockerignore` inside `nagardrishti-frontend/` so Docker builds against the correct context.

### Problem 3: Production Auth Gate vs. Demo Role Access
- **Cause:** In `client/src/components/auth/AuthGate.tsx`, role-based demo login (`developmentRoleLogin`) is gated by `import.meta.env.DEV` (which compiles to `false` in production builds), showing the email OTP screen (`POST /api/auth/request-otp`). Without `RESEND_API_KEY` configured, production OTP requests return `503 No OTP provider is configured` even when `ALLOW_DEMO_LOGIN=true` is set on the backend.
- **Solution Path:** Either configure `RESEND_API_KEY` + `OTP_FROM_EMAIL` in Railway Variables for live email OTPs, or update `AuthGate.tsx` to expose the quick role selector whenever the backend allows demo login (`ALLOW_DEMO_LOGIN=true`).
