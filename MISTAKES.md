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
