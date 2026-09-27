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
