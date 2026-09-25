# NagarDrishti Technical Stack Decisions

These are working ADRs for a zero-budget student prototype. Revisit only when evidence changes, not because a newer tool is fashionable. Any external service’s current free-tier terms are **team to verify** before adoption.

## ADR-001: Backend framework

**Context.** The backend needs typed APIs, async endpoints/jobs, validation, and easy Python integration for M1–M6.

**Options considered.** FastAPI (free, local, type-first); Flask (free, small); Django REST Framework (free, batteries included); serverless functions on a student-friendly platform (free tier team to verify).

**Decision.** Use **FastAPI** with Pydantic and Uvicorn.

**Consequences.** It matches the Python ML code and creates an inspectable OpenAPI contract. The team must keep route handlers thin and run background work outside the request. Flask would be simpler for a tiny API; Django would add more framework than v1 needs.

## ADR-002: Database and geospatial extension

**Context.** M4 needs spatial candidate retrieval, while map/status/scorecard data needs reliable relations and aggregates.

**Options considered.** PostgreSQL + PostGIS (free locally); SQLite + SpatiaLite (free local); Firebase/Firestore (student free tier team to verify); managed Postgres free tier (team to verify).

**Decision.** Use **PostgreSQL + PostGIS** locally and, if hosted, the same engine on a free managed tier.

**Consequences.** Spatial indexes and SQL analytics reduce custom geospatial code. Setup is heavier than SQLite; Docker compose is mandatory. Firebase remains a non-v1 alternative because spatial queries and audit queries are less natural.

## ADR-003: Image/object storage

**Context.** Photos should not bloat the database or Git; access and metadata need control.

**Options considered.** Local MinIO (free); filesystem in local demo (free); Cloudflare R2/S3-compatible free tier (team to verify); Cloudinary student/free plan (team to verify); Git LFS (not appropriate for user uploads).

**Decision.** Use **local MinIO or filesystem for development/demo**, behind an S3-style storage interface; choose one hosted S3-compatible free tier only if needed.

**Consequences.** Local demo is reliable and portable. Storage abstraction avoids vendor lock-in. Public media must be generated/served only after privacy review; original evidence remains restricted.

## ADR-004: Frontend and map

**Context.** v1 needs a mobile-first PWA, accessible form flow, map pins/cells, and a small mock officer console.

**Options considered.** React + Vite + Leaflet (free); plain JavaScript + Leaflet (free); Next.js + React (free); MapLibre GL (free, more capability); commercial map SDK free tiers (team to verify).

**Decision.** Use **React + Vite + Leaflet + OpenStreetMap tiles** with rate/use policy **team to verify**.

**Consequences.** The team knows JavaScript and gets reusable components without a server-rendering layer. Leaflet suits markers/cells; advanced vector styling is deferred. Cache or use a permitted alternative for the live demo rather than assume public tiles will be available.

## ADR-005: Multilingual NLP model

**Context.** M1 routes Marathi/Hindi/English complaint text into category + department; a strong, reproducible baseline is required.

**Options considered.** TF-IDF + linear SVM (free); mBERT (open model); MuRIL (open model); IndicBERT (open model); hosted LLM API free credits (team to verify, unsuitable as core dependency).

**Decision.** Use **TF-IDF + linear SVM as the mandatory baseline** and select **MuRIL or IndicBERT after a small three-language validation comparison**, recording the decision in the model registry.

**Consequences.** The final transformer is evidence-based rather than assumed. Compute can run in Colab/local. The team must not claim broad language support beyond the observed Marathi/Hindi/English test slices.

## ADR-006: Vision model

**Context.** M2 classifies civic issue images; optional boxes are explicitly noncritical.

**Options considered.** MobileNet/EfficientNet classifier (free/open); YOLO detector (free/open subject to licence verification); CLIP zero-shot (open weights/options team to verify); hosted vision API free tier (team to verify).

**Decision.** Train an **EfficientNet or MobileNet classifier baseline/candidate** first. Add YOLO boxes only if the data and Week 4 gate justify it.

**Consequences.** Classification gives a reliable v1 path with lower annotation cost. Detection remains a cuttable enhancement. Model licence and dataset compatibility must be verified before release.

## ADR-007: Duplicate clustering

**Context.** M4 should suggest an existing nearby issue without silently merging unrelated reports.

**Options considered.** Exact distance/time rules (free); LaBSE/sentence-transformer embeddings + PostGIS + DBSCAN/HDBSCAN (free/open); graph neural network (more research/compute); hosted embedding API free tier (team to verify).

**Decision.** Use **text embeddings + PostGIS distance + time window to form candidates, then DBSCAN/HDBSCAN or an explainable score**; present the result as a user-confirmable suggestion.

**Consequences.** It is testable with labelled duplicate pairs and supports transparent fallback. Automatic irreversible merging is excluded from v1.

## ADR-008: Async inference

**Context.** Image/NLP jobs must not block a mobile API request; the demo needs observable failure states.

**Options considered.** FastAPI background tasks (free, simplest); Redis + RQ/Celery worker (free local); cloud queue free tier (team to verify); synchronous inference (simpler, poorer resilience).

**Decision.** Use **Redis + RQ (or a thin worker) for M1/M2/M5 jobs**, with a synchronous lightweight fallback only for local seeded demo paths.

**Consequences.** The status can show pending/failed work and retries. It adds a service to compose and deploy. The exact queue library must be locked by Week 3, not switched mid-integration.

## ADR-009: Hosting and deployment

**Context.** The team needs near-zero cost, a reproducible local path, and no dependency on a live service for assessment.

**Options considered.** Local Docker/laptop (free); Render/Fly/Railway-style student/free web tiers (terms team to verify); Hugging Face Spaces for model demo (terms team to verify); GitHub Pages for static frontend (free terms team to verify).

**Decision.** Make **Docker Compose on a presentation laptop the source-of-truth deployment**. Optionally host web/API on one free-tier provider after a Week 8 drill; use a recorded fallback.

**Consequences.** The course demo survives free-tier sleep/limits. Hosted URLs are convenience, not evidence of production readiness. Avoid multi-provider architecture in v1.

## ADR-010: Authentication and roles

**Context.** A mock officer console needs a separated role; public reporting should minimise identity collection.

**Options considered.** No login plus demo role switch (free); simple email/password JWT (free); Firebase Auth free tier (team to verify); OAuth provider (more setup).

**Decision.** Use **minimal JWT/session auth for mock officer accounts** and an optional pseudonymous reporter/support identity for the prototype. No real municipal SSO, phone verification, or sensitive profile collection.

**Consequences.** The team can test role boundaries while minimising PII. Demo accounts are seeded and nonreal. Anti-spam/account signals are simulated/limited and cannot justify identity-based claims.

## ADR-011: Mobile strategy

**Context.** The brief excludes native iOS and prioritises a 20-second reporting flow.

**Options considered.** Responsive PWA (free); React Native/Expo native app (free tier/tooling team to verify); Android-only build (future option); separate iOS/Android apps.

**Decision.** Build a **mobile-first PWA**. An Android wrapper is future work only after the PWA is complete.

**Consequences.** One codebase supports the course demo and matches scope. Camera/geolocation permissions vary by browser, so intake must have graceful text/manual-pin fallbacks.

## ADR-012: Tamper-evident status ledger

**Context.** Trust depends on visible, auditable changes to status and proof review.

**Options considered.** Mutable `status` field only; append-only PostgreSQL status events; external blockchain; append-only events plus hash chain.

**Decision.** Store **append-only status events in PostgreSQL with a hash chain**, a verifier function, and public status timeline. No blockchain.

**Consequences.** It demonstrates a bounded tamper-evident design without cost/complexity. It does not prove institutional governance or prevent a privileged database operator from rewriting history; state that limitation in the paper.
