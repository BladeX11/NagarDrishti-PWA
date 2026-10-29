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

### Vitest Drizzle Mock Chaining and Queue Leakage
**Problem:** Vitest unit tests in `adversarialService.test.ts` and `inactionService.test.ts` failed with `db.select(...).from(...).where(...).orderBy is not a function` and leftover `mockResolvedValueOnce` calls poisoned subsequent tests.
**Context:** Chained Drizzle queries like `db.select().from(statusEvents).where(...).orderBy(...)` when `(db as any).where` was mocked directly with `mockResolvedValue`.
**Solution:** Wrapped mock methods in Proxy handlers inside `vi.hoisted()` that attach chaining methods (`orderBy`, `limit`, etc.) to returned Promises while guarding against mutating the mock chain itself (`target !== c`). Reset mock queues using `mockReset()` in `beforeEach` to prevent test-to-test mock pollution.
**Date:** 2026-10-01

### Officer Triage Queue Crash and Hardcoded Detail View
**Problem:** Officer triage queue crashed with a blank white screen because `issue.ward.replace(...)` threw a TypeError on API issues lacking `ward`. Furthermore, `OfficerIssueDetail` only checked `seedIssues.find()`, ignoring real database issues.
**Context:** `client/src/pages/officer/OfficerPages.tsx` (TriageQueue & OfficerIssueDetail)
**Solution:** Added `getWardLabel()` with fallback dictionary mapping `wardId` to ward name, guarded against undefined `ward`, dynamically fetched issue data via `issuesApi.get(id)`, and wired real status updates.
**Date:** 2026-10-01

### Issue Support Count Not Incrementing and PublicRef Query Failure
**Problem:** Clicking Support on cards or issue details did not increment the count. The frontend handlers only updated local mock state without calling the API, and `issueService.supportIssue` threw PostgreSQL syntax errors when querying `issueSupporters` with `publicRef` strings against UUID columns.
**Context:** `server/services/issueService.ts`, `server/routes/issues.ts`, `client/src/components/shared/IssueCard.tsx`, and `client/src/pages/citizen/CitizenPages.tsx`
**Solution:** Resolved `publicRef` to real UUID before database operations in `supportIssue` and `workflowService.transitionStatus`, passed authenticated user ID to check `hasSupported`, and wired optimistic updates with Sonner toast feedback in `IssueCard` and `CitizenIssueDetail`.
**Date:** 2026-10-01

### Cascade Alert Duplicate Insertion on Repeated Scans
**Problem:** Triggering cascade scans repeatedly or via periodic detection crons caused duplicate rows to be inserted into `cascade_alerts` for the same geographic cluster because the table lacked a compound unique constraint on float coordinates.
**Context:** `server/services/cascadeService.ts` detectCascades
**Solution:** Added pre-insertion query of existing active alerts and used Haversine distance threshold (`dist <= Math.max(cascade.radiusMeters, existing.radiusMeters)`) to detect identical spatial zones. Existing active alerts are updated with the latest issue IDs and cluster metrics instead of inserting duplicate rows.
**Date:** 2026-10-03


### Non-UUID Demo User ID Causing PostgreSQL FK Crash
**Problem:** `createIssue` and `verificationService.castVote` crashed with PostgreSQL syntax error `invalid input syntax for type uuid: "demo-citizen"` when running in development/demo mode without existing user rows.
**Context:** `server/middleware/auth.ts`, `server/services/issueService.ts`, and `server/services/verificationService.ts`
**Solution:** Added deterministic fallback UUIDs per role in `auth.ts` and added UUID regex validation in `createIssue` and `castVote` to map non-UUID demo IDs to valid user UUIDs before executing SQL queries.
**Date:** 2026-10-29

### Uploaded Images Missing in Registered Reports and Detail Views
**Problem:** Uploaded report photos were not visible in registered issue lists ("My reports") or issue detail views.
**Context:** `client/src/components/shared/IssueCard.tsx`, `client/src/pages/citizen/CitizenPages.tsx`, and `server/services/issueService.ts`
**Solution:** Preserved base64 photo data and media array during local demo issue creation, added media batch fetching in `listIssues`, rendered photo thumbnails in `IssueCard`, and resolved before-photo URLs across all media fallbacks in `CitizenIssueDetail` and `OfficerIssueDetail`.
**Date:** 2026-10-30

### Support Action Failing Offline and Generic City-Wide Issue Titles
**Problem:** Clicking Support failed with an error toast when PostgreSQL was offline or when targeting demo reports. Issue titles were generically titled "in Pune" without reflecting specific Pune neighborhoods.
**Context:** `client/src/components/shared/IssueCard.tsx`, `client/src/pages/citizen/CitizenPages.tsx`, and `client/src/data/puneLocalities.ts`
**Solution:** Added local storage voting persistence with optimistic increments in `IssueCard` and `CitizenIssueDetail`, and implemented geographic nearest-neighbor locality matching (`getNearestPuneLocality`) to automatically generate titles like "Drainage and sewage issue in Katraj" or "Waste and garbage issue in Kondhwa".
**Date:** 2026-10-30

### Duplicates Detection Ignoring Local Demo Reports and Failing Offline
**Problem:** Step 5 of the report flow (Duplicates) failed to detect previously submitted reports and showed "No similar reports found nearby", because it only queried backend `issuesApi.list` without pooling local demo reports or seed issues.
**Context:** `client/src/pages/citizen/CitizenPages.tsx` and `client/src/data/duplicateDetector.ts`
**Solution:** Built a multi-source duplicate matcher in `duplicateDetector.ts` that pools local demo reports, seed issues, and backend reports, scoring them by category match, GPS Haversine proximity, and keyword overlap, and wired interactive local support in the duplicates card.
**Date:** 2026-10-30


### Leaking GPS and EXIF Metadata in Public API and Static Upload Serving
**Problem:** Public API endpoints returned exact citizen GPS coordinates, reporter UUIDs, and raw photo paths. Static upload routes served unredacted original photos containing EXIF location data, and privileged roles could be spoofed via unauthenticated `x-demo-role` HTTP headers.
**Context:** `server/services/privacyService.ts`, `server/services/issueService.ts`, `server/app.ts`, and `server/middleware/auth.ts`
**Solution:** Hardened `redactForPublic` to recursively strip `privateLat`, `privateLng`, `reporterId`, `exifLat`, `exifLng`, and `privatePath`. Implemented a two-gate media pipeline using `sharp` to store raw photos in an unserved `uploads/private` directory while serving only sanitized WebP derivatives via `/uploads/public`. Gated privileged roles in `requireAuth` to reject unauthenticated header spoofing.
**Date:** 2026-10-30


### Offline Report ID Collisions, Seed Mismatches, Double-Counted Votes, and Fraud Fallback Bypass
**Problem:** The submit handler caught adversarial duplicate rejections and silently faked success in offline mode; offline report IDs (`ND-100..999`) collided with client seeds (`ND-104..128`); client seed issues did not align with server database seeds; and supporting an offline report double-counted the vote count on reload.
**Context:** `client/src/pages/citizen/CitizenPages.tsx`, `client/src/components/shared/IssueCard.tsx`, `client/src/data/localDemo.ts`, and `server/db/seed.ts`
**Solution:** Gated the submit fallback so validation and adversarial image rejections surface real error toasts; partitioned offline IDs to `ND-LOC-XXXX` to prevent collisions; aligned server seeds to match client issues `ND-101..ND-128`; and isolated static seed increments from persisted demo reports so supporter counts reflect exactly 1 vote per user.
**Date:** 2026-10-30
