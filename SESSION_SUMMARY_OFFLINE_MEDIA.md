# Session Summary: Offline Reporting, Media, Support and Duplicates

Previous docs: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) (architecture), [TEST_RESULTS.md](TEST_RESULTS.md) (TestSprite run and first fixes).

## What was built

1. **Offline report submission**: `ReportFlow` falls back to `localStorage` (`nd-demo-reports`) when the API fails. The root cause was PostgreSQL being offline (`ECONNREFUSED` on 5432). Drizzle surfaced this as `Failed query: select ... from "issue_media"` during the duplicate-photo hash check.
2. **Report photos visible everywhere**:
   - Where photos are stored: API uploads are written to `uploads/issues/` and served at `/uploads` (proxied by Vite). Offline reports keep the photo as base64 inside the stored issue.
   - What changed: `listIssues` now batch-loads `issue_media`, `IssueCard` renders thumbnails, and both detail pages fall back through `media`, `photo` and `photoUrl`.
3. **Working Support button**: optimistic update plus a per-browser record (`nd-supported-issues`) in `localDemo.ts`, so it works even when the DB is down.
4. **Locality-based titles**: `client/src/data/puneLocalities.ts` maps the pin to the nearest of about 30 Pune localities. This produces titles like "Drainage and sewage issue in Kondhwa".
5. **Duplicate detection**: `client/src/data/duplicateDetector.ts` pools offline reports, seed issues and API issues. It scores each one by category (+40), distance (+50 if under 0.8 km, scaling down to 10 km) and keyword overlap, then returns the top 4.

## Problems and fixes

| Problem | Fix |
|---|---|
| Submit failed with a raw SQL error toast | DB offline; added an offline fallback |
| Photos missing in lists and detail pages | Offline save dropped `photo`; list endpoint had no media; cards had no `<img>` |
| Support failed offline | Optimistic local persistence |
| "in Pune" titles too vague | Nearest-locality lookup |
| Duplicates step always empty | It only queried the API; it now pools local, seed and API issues |
| `edit_file` target mismatches | Files had CRLF line endings; normalized them to LF |

## Known follow-ups

A full predicted-issue review (30 items) found some regressions from this session's fixes. Fix these first:
- The fallback swallows 400 duplicate-image errors.
- Offline IDs can collide with seed IDs.
- Supporter counts are double-counted.
- `listIssues` exposes `privateLat`, `privateLng`, `reporterId` and EXIF data.

See the review notes before the next feature work.

