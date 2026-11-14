# Mistake Log

### Drizzle Push in CI/Non-Interactive
**Problem:** `drizzle-kit push` fails with "Interactive prompts require a TTY terminal" when schemas change.
**Context:** Pushing the initial schema to the database non-interactively using npm scripts.
**Solution:** Do not use `push`. Use `drizzle-kit generate` followed by `drizzle-kit migrate`.
**Date:** 2026-09-27

### DB Connections Not Loading `.env`
**Problem:** Seed script and backend server failed to connect to PostgreSQL (Authentication failed for user "postgres").
**Context:** `db/seed.ts` and `db/index.ts` use `process.env.DATABASE_URL` but `.env` was either not loaded or loaded too late.
**Solution:** Swapped import order in `server/index.ts` so `config.ts` (which runs `dotenv.config()`) loads before `app.ts`. Added `import 'dotenv/config'` to the top of `seed.ts`.
**Date:** 2026-09-27

### Mock Auth ID Not a Valid UUID (FK Violation)
**Problem:** Issue creation returned 500 with FK constraint violation on `reporter_id`.
**Context:** The mock auth middleware set `req.user.id = 'user-citizen-001'` (a plain string). The `issues.reporter_id` column is a `uuid` FK to the `users` table — PostgreSQL rejected the non-UUID value.
**Solution:** Updated `auth.ts` to query the DB for the demo user by role and return their real UUID. Cached per-role to avoid repeated DB hits.
**Date:** 2026-09-27

### publicRef UNIQUE Collision on Server Restart
**Problem:** `POST /api/issues` failed with UNIQUE constraint violation on `public_ref`.
**Context:** `generatePublicRef()` used a process-level counter starting at 100. Every server restart reset it to 101, colliding with seeded issues `ND-101`..`ND-125`.
**Solution:** Replaced the counter with a timestamp+random string (e.g. `ND-LQ2X4XA8K`). Guaranteed unique across restarts.
**Date:** 2026-09-27

### Missing Demo Auth Header in Citizen PWA (401 Unauthorized)
**Problem:** `POST /api/issues` from Citizen PWA was rejected with `401 Unauthorized`.
**Context:** The Express backend auth middleware expected either JWT or `x-demo-role` header. PWA `fetch()` calls did not supply any authentication header by default.
**Solution:** Seeded `demo_role: 'citizen'` in `pwa/src/main.tsx` localStorage and attached `x-demo-role: citizen` to issue submission requests.
**Date:** 2026-09-27

### Using ArtifactMetadata on Project Files
**Problem:** Tool call `write_to_file` failed with error `... is not a valid artifact path`.
**Context:** Creating `adversarialService.ts` in the project workspace, but supplied `ArtifactMetadata` payload.
**Solution:** `ArtifactMetadata` is ONLY for `.md` files created in the `brain/...` directory as artifacts for user review. Never pass it when creating regular source code files in the workspace.
**Date:** 2026-09-28

### Missing database columns leading to silent fallback and subsequent GET failure
**Problem:** A 500 error on GET requests caused by Drizzle querying a column (file_hash) that didn't exist in the database yet, because db:push was skipped or failed.
**Context:** `server/services/issueService.ts` getIssue
**Solution:** Added the missing columns via direct pg ALTER TABLE query, taking care of process.env hoisting bugs. Also need to instruct user to restart the dev server so prepared statements are flushed.
**Date:** 2026-09-28

### Missing verificationVotes causing blank issue detail page
**Problem:** CitizenIssueDetail page crashed with a blank white screen because `issue.verificationVotes.fixed` was accessed on backend API issues where `verificationVotes` was undefined.
**Context:** `client/src/pages/citizen/CitizenPages.tsx` CitizenIssueDetail and `server/services/issueService.ts` getIssue
**Solution:** Populated `verificationVotes` and `events` in `issueService.getIssue()` and added optional chaining with safe defaults (`issue.verificationVotes ?? { fixed: 0, notFixed: 0, unsure: 0 }`) in the frontend.
**Date:** 2026-09-30


### Vitest Mock Queue Leakage and Drizzle Chain `.where().orderBy()` Stubbing
**Problem:** 14 unit tests failed in `adversarialService.test.ts` and `inactionService.test.ts` with `db.select(...).from(...).where(...).orderBy is not a function` and shifted `mockResolvedValueOnce` responses.
**Context:** `tests/adversarialService.test.ts` and `tests/inactionService.test.ts`
**Solution:** Used `.mockReset()` in `beforeEach` to flush unconsumed `mockResolvedValueOnce` queues between tests, and returned the mock `db` object on intermediate `.where()` calls that chain `.orderBy()`.
**Date:** 2026-11-14


### Dockerfile Missing `patches/` Directory for `pnpm install --frozen-lockfile`
**Problem:** Docker build stage ran `pnpm install --frozen-lockfile` after copying only `package.json` and `pnpm-lock.yaml`, which fails when `package.json` references `"patchedDependencies": { "wouter@3.7.1": "patches/wouter@3.7.1.patch" }`.
**Context:** `nagardrishti-frontend/Dockerfile` multi-stage build for Railway deployment.
**Solution:** Added `COPY patches ./patches` before `RUN pnpm install --frozen-lockfile` in both `build` and `runtime` stages.
**Date:** 2026-11-14
