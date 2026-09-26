# NagarDrishti — Agent Rules

## Project Identity (Read This First, Every Session)

You are working on **NagarDrishti**, an accountability-centric civic issue platform for Indian municipalities. This is NOT another complaint app. It is a system where the architecture itself is adversarial to corruption.

Before writing any code, read these files in order to load full project context:
1. `plans/MASTER_PLAN.md` — executive overview, contribution statement, project goals
2. `plans/02-forced-transparency-engine.md` — the core novelty (FTE with 4 mechanisms)
3. `plans/03-novelty-features.md` — 6 novel features (N1-N6) that differentiate this project
4. `plans/05-implementation-roadmap.md` — 9-stage build plan with current progress
5. `plans/01-system-architecture.md` — tech stack, data model, API contracts
6. `plans/04-ai-modules.md` — AI modules M1-M7 + novel modules
7. `plans/06-evaluation-and-paper.md` — research questions, metrics, paper structure

Also read `MISTAKES.md` at project root for past issues and solutions.

If any plan file is missing or corrupted, flag it immediately and ask the user before proceeding.

---

## Core Thesis (Never Forget This)

Existing civic platforms (CPGRAMS, Swachhata, IChangeMyCity) fail at the same point: **after filing**. Complaints go in, tickets get "disposed," but nothing verifiably changes. NagarDrishti attacks this gap with:

1. **Forced Transparency Engine (FTE)** — 4 interlocking mechanisms:
   - Hash-chain audit ledger (tamper-evident status history)
   - Inaction amplification (auto-escalating visibility tiers T0-T4)
   - Adversarial proof-of-fix detection (catches fake resolutions)
   - Transparency Accountability Score (TAS — departments scored on HOW they behave)
2. **Ward Equity Analysis (N1)** — measures if poor wards get worse service
3. **Cross-Category Cascade Detection (N4)** — finds infrastructure root causes
4. **Trust-Weighted Priority Scoring (N2)** — dynamic urgency based on temporal credibility

Every feature serves the contribution statement in `MASTER_PLAN.md`. If a task doesn't serve it, question whether it's needed.

---

## Technical Context

- **Main app:** `nagardrishti-frontend/` — Express.js + React + TypeScript + Drizzle ORM + PostgreSQL
- **Standalone PWA:** `pwa/` — Vite + React (citizen mobile-first)
- **UI components:** shadcn/ui (already in project)
- **Maps:** Leaflet
- **DB schema:** `nagardrishti-frontend/server/db/schema.ts` (READ THIS before any DB work)
- **API routes:** `nagardrishti-frontend/server/routes/` (READ relevant route file before modifying)
- **AI modules:** `nagardrishti-frontend/server/ai/` (orchestrator, queue, rules, features)
- **Shared types:** `nagardrishti-frontend/shared/types.ts`
- **Product docs:** `PRODUCT/` folder (PRD, SRS, API spec, data model, system architecture)

---

## Approved Taxonomy (8 Categories — Never Change These)

`pothole/road` | `garbage/waste` | `drainage/sewage` | `water supply` | `streetlight/electrical` | `stray animals` | `encroachment` | `other`

These must remain stable across UI, API, database, dataset, and paper. If you need a new category, ask the user first.

---

## Issue Lifecycle (Enforce This in All Status Logic)

```
Open -> Triaged -> Assigned -> In Progress -> Claimed Resolved -> Verified Fixed
                                                    |
                                                Reopened
```

Rules:
- Only forward transitions are allowed (except Reopen)
- Officer evidence CANNOT directly create "Verified Fixed"
- "Verified Fixed" requires citizen verification votes
- 2+ "not fixed" votes auto-reopen the issue
- Every status transition MUST create a hash-chained event in `statusEvents`

---

## Scope Protection

### What You Must NEVER Do Without Explicit User Approval
- Change the 8-category taxonomy
- Remove or weaken any FTE mechanism
- Skip hash-chain events on status transitions
- Expose private data (exact coordinates, phone numbers, names, raw media URLs) in public API responses
- Allow AI to autonomously close or reject an issue
- Add blockchain or distributed consensus (the hash chain is sufficient and deliberate)
- Add dependencies that duplicate functionality already in `package.json`
- Refactor or rename files outside the scope of the current task

### What You Should Always Do
- Wire every new feature to the UI (if you add backend logic, add the frontend too)
- Create hash-chain events for any new status-affecting operation
- Consider how new features interact with the FTE
- Use existing services and utilities before creating new ones
- Check `plans/05-implementation-roadmap.md` to understand what stage the project is at

---

## Quality Standards

### Backend
- Validate every status transition server-side (never trust client)
- Return explicit HTTP status codes: 400, 401, 403, 404, 409, 422, 500
- Keep route handlers thin; business logic goes in `server/services/`
- Use structured logs without PII (no raw photos, coordinates, tokens, contact data)
- Every AI prediction stores: model_version, data_version, confidence, explanation

### Frontend
- All new UI must be mobile-responsive
- Match existing shadcn/ui component patterns and spacing
- Interactive elements need hover and focus states
- Never leave a feature half-wired (if you add a button, wire its handler)
- Show loading, empty, error, and offline states

### Privacy (Non-Negotiable)
- Store private location separately from public representation
- Public responses use geohash-coarsened coordinates, never exact lat/lng
- No name, phone, exact coordinates, or raw upload URL in public endpoints
- Apply minimum aggregation thresholds when small report counts could reveal a household
- Media in public responses uses redacted derivatives only

---

## Implementation Decision Making

When facing a design choice, use this priority order:

1. **Does the plan file cover this?** Check `plans/` folder first. Follow the documented approach.
2. **Does the codebase already solve this?** Search existing services, utilities, and components before creating new ones.
3. **Is the simplest approach sufficient?** Rule-based before ML. Computed-at-query-time before stored fields. Existing library before custom code.
4. **Does this serve the contribution statement?** If a feature doesn't serve FTE, equity analysis, cascade detection, or the accountability thesis — question whether it belongs.
5. **Can the user test this immediately?** Every change should be testable. No dead code, no TODO-only implementations.

---

## Session Start Protocol

At the beginning of every session:
1. Read the plan files listed in "Project Identity" section above
2. Read `MISTAKES.md` for past issues
3. Check `plans/05-implementation-roadmap.md` for current stage and what's done
4. Scan the project structure to verify state matches expectations
5. State: "This project is at Stage [X]. Last completed work: [Y]. I will [Z]."
6. If picking up incomplete work, state what's partially done and continue from there

---

## When Stuck or Uncertain

1. Search the web for solutions — use trusted sources (official docs, MDN, Stack Overflow)
2. Check if a similar problem was logged in `MISTAKES.md`
3. Read the actual file contents before guessing — never reconstruct from memory
4. If genuinely ambiguous, ask ONE clarifying question, then wait
5. Never hallucinate function names, API signatures, or import paths — verify they exist

---

## Code Conciseness

- Before writing custom logic, check if an existing library in `package.json` already does it
- Before adding a new library, check if an existing dependency does the same job
- Use built-in language features (array methods, optional chaining, destructuring) over manual loops
- Don't create utility functions for logic used only once
- After writing code, self-check: "Could this be fewer lines using existing tools, without losing clarity?"

---

## Post-Task Protocol

After completing a task:
1. Confirm: "I changed [X]. I also updated [Y, Z] which depended on it."
2. Verify: "Can the user actually use this feature right now?" If no, fix it.
3. Suggest: 2 specific next steps (1 sentence each)
4. If 5+ prompts or a major feature completed, create a summary document linking to previous summaries

---

## Progress Tracking (MANDATORY — Never Skip This)

### After Every Session (or every major feature completed):

1. **Update the roadmap:** Open `plans/05-implementation-roadmap.md` and change the Status column for every step you completed from `NOT DONE` to `DONE`. If something is partially done, mark it `IN PROGRESS`. If blocked, mark it `BLOCKED: reason`.

2. **Save a progress report:** Create or append to `plans/progress/SESSION_LOG.md` with this format:
   ```
   ## Session: YYYY-MM-DD
   **Phase:** [current phase number and name]
   **Completed:** [list of specific steps completed, e.g., "1.1, 1.2, 1.3"]
   **In Progress:** [what was started but not finished]
   **Blocked:** [anything blocked and why]
   **Key Decisions:** [any design decisions made during this session]
   **Next Session Should:** [exact first action for the next session to take]
   **Files Changed:** [list of files modified/created]
   ```

3. **Update MISTAKES.md** if any mistakes were made or non-obvious fixes were needed.

### Why This Matters
Each session starts by reading `plans/05-implementation-roadmap.md` and `plans/progress/SESSION_LOG.md`. If these are not updated, the next session wastes time rediscovering what's already done. **Skipping progress updates is not acceptable — it directly harms the next session's efficiency.**

### Session Handoff Checklist
Before ending a session, verify:
- [ ] Roadmap step statuses are updated in `plans/05-implementation-roadmap.md`
- [ ] Session log entry written in `plans/progress/SESSION_LOG.md`
- [ ] Any new mistakes logged in `MISTAKES.md`
- [ ] No half-wired features left (if you added backend logic, the frontend is wired too)
- [ ] The user knows exactly what to say to start the next session (e.g., "Continue Phase 1")
