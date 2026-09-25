# NagarDrishti REST API Specification

## 1. API conventions
**Base URL:** `/api/v1`  
**Media type:** `application/json; charset=utf-8` unless an upload uses a signed object-storage URL.  
**Time:** RFC 3339 UTC timestamps.  
**IDs:** opaque UUID/string values; clients must not infer information from them.  
**Pagination:** cursor pagination where a list can grow. Request `limit` is 1–100, default 20. Responses use `next_cursor` or `null`.

The API supports a student-scale MVP. It is not a public government integration promise. All server-side writes validate role, ownership, status transition policy, file metadata, and privacy rules irrespective of what the client displays.

## 2. Authentication model
### 2.1 Citizen OTP authentication
1. `POST /auth/otp/request` accepts a mobile number and records a short-lived challenge. In a demonstration environment, an explicitly configured test identity may replace SMS delivery; raw OTP values are never logged or stored in plaintext.
2. `POST /auth/otp/verify` validates the challenge and returns a short-lived JWT access token and refresh token/session mechanism. First-time users create a `citizen` user.
3. Citizen write routes require `Authorization: Bearer <access_token>`. Officers/admins use provisioned project accounts or the same JWT mechanism with server-issued role claims.
4. JWT claims include `sub` (user ID), `role` (`citizen`, `officer`, `admin`), `jti`, `iat`, `exp`, and token/user-version. The server resolves/validates claims; a client-provided role is ignored.

### 2.2 Authorization summary
| Capability | Public | Citizen | Officer | Admin |
|---|---:|---:|---:|---:|
| Read redacted map/detail/scorecards/export | Yes | Yes | Yes | Yes |
| Request/verify OTP | No | Yes | Yes if configured | Yes if configured |
| Create/edit own draft/complaint, upload own media | No | Yes | No | No unless acting as citizen |
| Support/vote/report abuse | No | Yes | Optional | Yes |
| Queue/assign/status/proof | No | No | Yes, scoped | Yes |
| Merge/moderate/recompute | No | No | No | Yes |

### 2.3 Rate limiting
Rate limits are enforced by IP hash plus authenticated user/phone hash where available. Return `429` with `Retry-After` and a stable error envelope.

| Route group | Limit target | Rationale |
|---|---|---|
| OTP request | 3 per phone / 15 min; 10 per IP / hour | Abuse/cost control. |
| OTP verify | 5 per challenge; 10 per phone / hour | Prevent guessing. |
| Upload intent | 10 per user / hour | Storage abuse control. |
| Complaint create/support/vote | 10 creates, 30 supports, 10 votes per user / day | Student-MVP anti-spam control. |
| Public reads | 120 requests / IP / minute | Protect map/export service. |
| Officer/admin writes | 60 requests / user / minute | Prevent accidental loops. |
| Open-data bulk export | 5 requests / IP / hour | Avoid expensive repeated exports. |

These are configuration defaults, not civic policy. Moderation/audit may apply stricter limits to suspicious accounts.

### 2.4 Versioning and idempotency
- Breaking changes create `/api/v2`; additive response fields may remain in v1.
- Writes that create a complaint, support, vote, proof, merge, or recompute accept `Idempotency-Key: <UUID>` and retain a request result for 24 hours.
- List/read response schemas may add nullable fields; clients must ignore unknown fields.

### 2.5 Error envelope
Every non-2xx response uses:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "category must be one of the supported values",
    "fields": [{"field": "category_key", "issue": "unsupported_value"}],
    "request_id": "9a1fbe5b-ec5e-4f24-9639-0f18ee0d5e21"
  }
}
```
Common codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INVALID_TRANSITION`, `MEDIA_REQUIRED`, `OTP_EXPIRED`, `OTP_INVALID`, `PRIVACY_RESTRICTED`, `SERVICE_DEGRADED`, `INTERNAL_ERROR`.

## 3. Shared representations
### 3.1 Status values
`open`, `triaged`, `assigned`, `in_progress`, `claimed_resolved`, `verified_fixed`, `reopened`, `rejected`, `duplicate_merged`.

### 3.2 Category keys
`pothole/road`, `garbage/waste`, `drainage/sewage`, `water supply`, `streetlight/electrical`, `stray animals`, `encroachment`, `other`.

### 3.3 Complaint summary
```json
{
  "id": "6e94a761-cd1a-4bd5-bf8d-c7db4ad4c7b0",
  "public_id": "f937d0bdb1e3a1b63f",
  "category_key": "pothole/road",
  "department": {"id": "uuid", "name": "Roads Department"},
  "ward": {"id": "uuid", "code": "W-01", "name": "Demo Ward 1"},
  "status": "open",
  "urgency": {"tier": 3, "source": "ai_suggestion", "explanation": "road hazard near reported crossing"},
  "supporter_count": 4,
  "submitted_at": "2026-08-20T07:45:00Z",
  "age_days": 2,
  "location": {"type": "coarsened_point", "coordinates": [73.8567, 18.5204], "h3_cell": "demo"},
  "analysis_state": "completed"
}
```

### 3.4 Public media representation
```json
{
  "id": "uuid",
  "kind": "complaint_before",
  "thumbnail_url": "https://media.example/signed-or-public-derivative",
  "redaction_state": "ready",
  "captured_at": "2026-08-19T08:00:00Z"
}
```
The response omits original object keys, EXIF/GPS, uploader identity, and private originals.

## 4. Endpoint index
| Group | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| Auth | POST | `/auth/otp/request` | No | Request OTP/demo challenge. |
| Auth | POST | `/auth/otp/verify` | No | Verify and issue JWT/session. |
| Citizen | POST | `/media/upload-intents` | Citizen/officer | Obtain signed media upload target. |
| Citizen | POST | `/complaints` | Citizen | Submit a complaint. |
| Citizen | GET | `/complaints/nearby` | Citizen | Find nearby active candidates. |
| Citizen | POST | `/complaints/{id}/support` | Citizen | Support one eligible complaint. |
| Citizen | POST | `/proofs/{proof_id}/verification-votes` | Citizen | Vote fixed/not_fixed/unsure. |
| Citizen | GET | `/me/complaints` | Citizen | List own reports and supported issues. |
| Citizen | GET | `/me/ward-digest` | Citizen | Personal ward digest. |
| Citizen | POST | `/abuse-reports` | Citizen | Report unsafe/abusive content. |
| Public | GET | `/public/issues.geojson` | No | Public issue map GeoJSON. |
| Public | GET | `/public/complaints/{public_id}` | No | Redacted complaint detail. |
| Public | GET | `/public/wards/{ward_id}/scorecard` | No | Ward snapshot. |
| Public | GET | `/public/departments/{department_id}/scorecard` | No | Department snapshot. |
| Public | GET | `/public/sla-breaches` | No | Active breach feed. |
| Public | GET | `/public/forgotten-issues` | No | Ranked forgotten issues. |
| Public | GET | `/public/open-data/export` | No | CSV/JSON de-identified export. |
| Officer | GET | `/officer/queue` | Officer/admin | Work queue. |
| Officer | POST | `/officer/complaints/{id}/assignments` | Officer/admin | Assign/reassign. |
| Officer | POST | `/officer/complaints/{id}/status-events` | Officer/admin | Valid status transition. |
| Officer | POST | `/officer/complaints/{id}/proofs` | Officer/admin | Submit proof-of-fix. |
| Admin | POST | `/admin/complaints/{id}/merge` | Admin | Merge duplicate into canonical record. |
| Admin | PATCH | `/admin/abuse-reports/{id}` | Admin | Moderate abuse report. |
| Admin | POST | `/admin/scorecards/recompute` | Admin | Queue scorecard recomputation. |

## 5. Authentication endpoints
### POST `/auth/otp/request`
**Auth:** none.  
**Request**
```json
{"phone": "+919999999999", "locale": "mr", "purpose": "login"}
```
**Response 202**
```json
{"challenge_id": "uuid", "expires_at": "2026-08-20T08:00:00Z", "delivery": "sms_or_demo", "retry_after_seconds": 60}
```
**Status codes:** `202`, `400`, `429`.

### POST `/auth/otp/verify`
**Auth:** none.  
**Request**
```json
{"challenge_id": "uuid", "otp": "123456", "consent_version": "2026-08-v1", "preferred_language": "mr"}
```
**Response 200**
```json
{
  "access_token": "jwt", "token_type": "Bearer", "expires_in": 900,
  "refresh_token": "opaque-session-token",
  "user": {"id": "uuid", "role": "citizen", "preferred_language": "mr", "is_new": true}
}
```
**Status codes:** `200`, `400`, `401`, `410`, `429`.

## 6. Citizen endpoints
### POST `/media/upload-intents`
**Auth:** citizen or officer/admin for their permitted media purpose.  
**Request**
```json
{
  "purpose": "complaint_before",
  "content_type": "image/jpeg",
  "bytes": 1840234,
  "sha256": "64-hex-character-digest",
  "filename": "road.jpg"
}
```
`purpose` is `complaint_before`, `voice_note`, or `proof_after`; only officers/admins may request `proof_after`.

**Response 201**
```json
{
  "media_id": "uuid", "upload_url": "https://object-store/signed", "upload_headers": {"Content-Type": "image/jpeg"},
  "expires_at": "2026-08-20T08:10:00Z", "max_bytes": 10485760
}
```
**Status codes:** `201`, `400`, `401`, `403`, `413`, `415`, `429`.

### POST `/complaints`
**Auth:** citizen. `Idempotency-Key` required.  
**Request**
```json
{
  "category_key": "pothole/road",
  "description_text": "Large pothole near the bus stop",
  "original_language": "en",
  "location": {"latitude": 18.52042, "longitude": 73.85672, "accuracy_m": 24, "source": "device"},
  "media_ids": ["uuid"],
  "consent_version": "2026-08-v1",
  "client_reported_at": "2026-08-20T07:45:00Z"
}
```
`category_key` may be omitted only if a description or image is supplied; server then defaults to `other` pending human/AI correction. At least one of non-empty `description_text` or a complete `complaint_before` media ID is required. The response is created even if AI jobs are pending.

**Response 201**
```json
{
  "complaint": {
    "id": "uuid", "public_id": "f937d0bdb1e3a1b63f", "status": "open",
    "category_key": "pothole/road", "department": null,
    "location": {"type": "coarsened_point", "coordinates": [73.8567, 18.5204], "h3_cell": "demo"},
    "submitted_at": "2026-08-20T07:45:10Z", "analysis_state": "pending"
  },
  "next": {"suggestions_url": "/api/v1/complaints/uuid", "nearby_candidates_url": "/api/v1/complaints/nearby?complaint_id=uuid"}
}
```
**Status codes:** `201`, `400`, `401`, `409`, `413`, `422`, `429`.

### GET `/complaints/nearby`
**Auth:** citizen.  
**Query:** `complaint_id` or `lat`, `lng`; optional `radius_m` (bounded), `category_key`, `limit`, `cursor`. Exact supplied coordinates are not echoed.

**Response 200**
```json
{
  "items": [
    {"id": "uuid", "public_id": "abc", "category_key": "pothole/road", "status": "open", "distance_m": 40,
     "supporter_count": 3, "age_days": 4, "can_support": true, "duplicate_signal": {"score": 0.78, "explanation": "nearby and similar description"}}
  ],
  "next_cursor": null
}
```
**Status codes:** `200`, `400`, `401`, `429`.

### POST `/complaints/{id}/support`
**Auth:** citizen. `Idempotency-Key` required.  
**Request**
```json
{"location": {"latitude": 18.5205, "longitude": 73.8568, "source": "device"}}
```
Location is optional if a recent verified location is available. It is used for eligibility but is not publicly returned.

**Response 201**
```json
{"complaint_id": "uuid", "supported": true, "supporter_count": 5, "proximity_verified": true, "supported_at": "2026-08-20T08:00:00Z"}
```
**Status codes:** `201`, `401`, `403`, `404`, `409`, `422`, `429`.

### POST `/proofs/{proof_id}/verification-votes`
**Auth:** citizen. `Idempotency-Key` required.  
**Request**
```json
{"choice": "not_fixed", "note": "The pothole is still present", "location": {"latitude": 18.5205, "longitude": 73.8568, "source": "device"}}
```
Choice is `fixed`, `not_fixed`, or `unsure`. Eligibility is computed server-side from reporter/supporter relationship and/or configured nearby rule.

**Response 201**
```json
{
  "vote": {"id": "uuid", "choice": "not_fixed", "is_eligible_nearby": true, "created_at": "2026-08-20T08:05:00Z"},
  "complaint": {"id": "uuid", "status": "reopened"},
  "reopen_rule": {"eligible_not_fixed_count": 2, "threshold": 2, "triggered": true}
}
```
**Status codes:** `201`, `400`, `401`, `403`, `404`, `409`, `422`, `429`.

### GET `/me/complaints`
**Auth:** citizen.  
**Query:** `view=reported|supported|all`, optional `status`, `limit`, `cursor`.

**Response 200**
```json
{"items": [{"id": "uuid", "public_id": "abc", "category_key": "garbage/waste", "status": "in_progress", "submitted_at": "2026-08-18T00:00:00Z", "proof_pending_verification": false}], "next_cursor": null}
```
**Status codes:** `200`, `401`, `422`.

### GET `/me/ward-digest`
**Auth:** citizen.  
**Query:** optional `ward_id`; defaults to user’s latest eligible report ward.  
**Response 200**
```json
{
  "ward": {"id": "uuid", "name": "Demo Ward 1"}, "period": {"start": "2026-08-13T00:00:00Z", "end": "2026-08-20T00:00:00Z"},
  "new_count": 12, "claimed_resolved_count": 4, "verified_fixed_count": 2,
  "breach_count": 3, "top_categories": [{"category_key": "garbage/waste", "count": 5}],
  "verification_prompts": [{"proof_id": "uuid", "complaint_id": "uuid", "message": "Was this issue fixed?"}]
}
```
**Status codes:** `200`, `401`, `404`.

### POST `/abuse-reports`
**Auth:** citizen (officer/admin also permitted).  
**Request**
```json
{"target_type": "complaint", "target_id": "uuid", "reason_code": "personal_information", "detail": "Phone number visible in image"}
```
**Response 201**
```json
{"id": "uuid", "state": "open", "created_at": "2026-08-20T08:10:00Z"}
```
**Status codes:** `201`, `400`, `401`, `404`, `409`, `429`.

## 7. Public/open endpoints
### GET `/public/issues.geojson`
**Auth:** none.  
**Query:** `bbox=minLng,minLat,maxLng,maxLat` or `ward_id`; optional `category_key`, `status`, `since`, `limit`, `cursor`. Active status is default.

**Response 200**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature", "id": "public-id",
    "geometry": {"type": "Point", "coordinates": [73.8567, 18.5204]},
    "properties": {"public_id": "abc", "category_key": "pothole/road", "department_name": "Roads Department", "status": "open", "age_days": 2, "supporter_count": 4, "h3_cell": "demo"}
  }],
  "next_cursor": null, "generated_at": "2026-08-20T08:10:00Z"
}
```
**Status codes:** `200`, `400`, `429`.

### GET `/public/complaints/{public_id}`
**Auth:** none.  
**Response 200**
```json
{
  "complaint": {
    "public_id": "abc", "category_key": "pothole/road", "department": {"name": "Roads Department"},
    "ward": {"code": "W-01", "name": "Demo Ward 1"}, "status": "claimed_resolved", "age_days": 4,
    "location": {"type": "coarsened_point", "coordinates": [73.8567, 18.5204]}, "supporter_count": 4,
    "description_redacted": "Large pothole near the bus stop", "media": [{"id": "uuid", "kind": "complaint_before", "thumbnail_url": "url", "redaction_state": "ready"}],
    "timeline": [{"to_status": "open", "occurred_at": "2026-08-16T00:00:00Z"}, {"to_status": "claimed_resolved", "occurred_at": "2026-08-19T00:00:00Z", "reason": "Proof submitted"}],
    "proof": {"state": "claimed_resolved", "media": [{"id": "uuid", "kind": "proof_after", "thumbnail_url": "url"}], "automated_check": "evidence check pending or advisory"}
  }
}
```
**Status codes:** `200`, `404`, `429`.

### GET `/public/wards/{ward_id}/scorecard`
**Auth:** none. **Query:** optional `window=30d|90d`.  
**Response 200**
```json
{"scope": "ward", "ward": {"id": "uuid", "name": "Demo Ward 1"}, "snapshot": {"generated_at": "2026-08-20T00:00:00Z", "window_start": "2026-07-21T00:00:00Z", "method_version": "m6-v0", "metrics": {"complaints_received": 43, "sla_compliance_pct": 62.5, "median_days_to_first_response": 2.0, "reopen_pct": 8.0, "top_recurring_categories": []}, "flags": [{"type": "issue_spike", "explanation": "Above configured baseline"}]}}
```
**Status codes:** `200`, `404`, `429`.

### GET `/public/departments/{department_id}/scorecard`
**Auth:** none. Identical snapshot envelope with `scope: "department"` and department identity.  
**Status codes:** `200`, `404`, `429`.

### GET `/public/sla-breaches`
**Auth:** none. **Query:** optional `ward_id`, `department_id`, `category_key`, `limit`, `cursor`.  
**Response 200**
```json
{"items": [{"public_id": "abc", "category_key": "water supply", "ward_name": "Demo Ward 1", "department_name": "Water Department", "status": "in_progress", "age_hours": 100, "sla_resolution_hours": 72, "hours_over_sla": 28, "location": {"type": "coarsened_point", "coordinates": [73.8567, 18.5204]}}], "next_cursor": null}
```
**Status codes:** `200`, `400`, `429`.

### GET `/public/forgotten-issues`
**Auth:** none. **Query:** optional `ward_id`, `limit`, `cursor`.  
**Response 200**
```json
{"items": [{"public_id": "abc", "category_key": "drainage/sewage", "status": "reopened", "age_days": 32, "supporter_count": 11, "priority": {"rank": 1, "explanation": "Configured harm, age, and supporter inputs"}}], "method_version": "forgotten-v0", "next_cursor": null}
```
**Status codes:** `200`, `429`.

### GET `/public/open-data/export`
**Auth:** none. **Query:** `format=csv|json`, optional `from`, `to`, `ward_id`, `category_key`. Result may be a direct stream for a small export or a temporary download URL for a generated snapshot.

**Response 200 (JSON example)**
```json
{"data_version": "export-20260820", "generated_at": "2026-08-20T08:10:00Z", "rows": [{"public_id": "abc", "category_key": "pothole/road", "ward_code": "W-01", "department_name": "Roads Department", "status": "open", "submitted_date": "2026-08-18", "h3_cell": "demo", "supporter_count": 4}]}
```
**Status codes:** `200`, `400`, `413`, `429`.

## 8. Officer endpoints
### GET `/officer/queue`
**Auth:** officer/admin.  
**Query:** `status`, `ward_id`, `department_id`, `category_key`, `assigned_to=me|unassigned|user_id`, `sort=urgency|age|sla`, `limit`, `cursor`.

**Response 200**
```json
{"items": [{"id": "uuid", "public_id": "abc", "category_key": "streetlight/electrical", "status": "triaged", "ward": {"name": "Demo Ward 1"}, "urgency": {"tier": 3, "explanation": "AI suggestion; review required"}, "sla": {"due_at": "2026-08-21T00:00:00Z", "is_breached": false}, "assignment": null, "ai": {"duplicate_candidate_count": 2, "analysis_state": "completed"}}], "next_cursor": null}
```
**Status codes:** `200`, `401`, `403`, `422`.

### POST `/officer/complaints/{id}/assignments`
**Auth:** officer/admin. `Idempotency-Key` required.  
**Request**
```json
{"assigned_to_user_id": "uuid", "department_id": "uuid", "note": "Route repair crew review"}
```
**Response 201**
```json
{"assignment": {"id": "uuid", "complaint_id": "uuid", "assigned_to_user_id": "uuid", "assigned_at": "2026-08-20T08:20:00Z", "is_current": true}, "complaint": {"id": "uuid", "status": "assigned"}}
```
The service may make the `triaged -> assigned` transition atomically; it appends an event.
**Status codes:** `201`, `401`, `403`, `404`, `409`, `422`.

### POST `/officer/complaints/{id}/status-events`
**Auth:** officer/admin. `Idempotency-Key` required.  
**Request**
```json
{"to_status": "in_progress", "reason": "Field work started", "metadata": {"source": "officer_console"}}
```
For `rejected` and `duplicate_merged`, `reason` is required. For `claimed_resolved`, an active proof must already exist. The service rejects forbidden lifecycle transitions.

**Response 201**
```json
{"event": {"id": "uuid", "sequence_no": 4, "from_status": "assigned", "to_status": "in_progress", "occurred_at": "2026-08-20T08:25:00Z", "event_hash": "64-hex"}, "complaint": {"id": "uuid", "status": "in_progress"}}
```
**Status codes:** `201`, `400`, `401`, `403`, `404`, `409`, `422`.

### POST `/officer/complaints/{id}/proofs`
**Auth:** officer/admin. `Idempotency-Key` required.  
**Request**
```json
{
  "media_ids": ["uuid"], "note": "After photo taken after repair", "claimed_captured_at": "2026-08-20T08:30:00Z",
  "claimed_location": {"latitude": 18.5204, "longitude": 73.8567}, "transition_to_claimed_resolved": true
}
```
All media IDs must be complete `proof_after` media uploaded by/for the authorized officer. If `transition_to_claimed_resolved` is true, an atomic proof record and status event are created.

**Response 201**
```json
{"proof": {"id": "uuid", "complaint_id": "uuid", "submitted_at": "2026-08-20T08:31:00Z", "m5_analysis_state": "pending", "risk_level": null}, "complaint": {"id": "uuid", "status": "claimed_resolved"}}
```
**Status codes:** `201`, `400`, `401`, `403`, `404`, `409`, `422`, `429`.

## 9. Admin endpoints
### POST `/admin/complaints/{id}/merge`
**Auth:** admin. `Idempotency-Key` required.  
**Request**
```json
{"canonical_complaint_id": "uuid", "reason": "Same pothole after admin review", "transfer_supporters": true}
```
The source complaint becomes `duplicate_merged`; it retains media, predictions, events, and audit trail. The canonical complaint is not overwritten; supporters are transferred only where unique constraints allow.

**Response 200**
```json
{"source_complaint_id": "uuid", "canonical_complaint_id": "uuid", "source_status": "duplicate_merged", "transferred_supporter_count": 3, "event_id": "uuid"}
```
**Status codes:** `200`, `400`, `401`, `403`, `404`, `409`, `422`.

### PATCH `/admin/abuse-reports/{id}`
**Auth:** admin.  
**Request**
```json
{"state": "actioned", "moderation_reason": "Public derivative withheld pending review", "action": "withhold_public_media"}
```
`state` is `reviewing`, `actioned`, or `dismissed`. Supported actions are controlled allow-list values such as `none`, `withhold_public_media`, `deactivate_user`, `restore_public_media`; no arbitrary SQL or status mutation is accepted.

**Response 200**
```json
{"id": "uuid", "state": "actioned", "reviewed_by_user_id": "uuid", "reviewed_at": "2026-08-20T08:40:00Z", "moderation_reason": "Public derivative withheld pending review"}
```
**Status codes:** `200`, `400`, `401`, `403`, `404`, `409`.

### POST `/admin/scorecards/recompute`
**Auth:** admin. `Idempotency-Key` required.  
**Request**
```json
{"scope": "all", "window_start": "2026-07-21T00:00:00Z", "window_end": "2026-08-20T00:00:00Z", "method_version": "m6-v0", "force": false}
```
`scope` may be `all`, `ward`, or `department`; a scoped request supplies `ward_id` or `department_id`.

**Response 202**
```json
{"job_id": "uuid", "state": "queued", "deduplicated": false, "requested_at": "2026-08-20T08:45:00Z"}
```
**Status codes:** `202`, `400`, `401`, `403`, `409`, `429`.

## 10. Field redaction rules
| Field/class | Public endpoints | Owner-visible citizen endpoints | Officer/admin endpoints |
|---|---|---|---|
| Reporter identity, phone hash, OTP/session | Never | Owner sees own account only, not hashes | Only minimum operational identity; admin audit as required. |
| Exact device/manual location | Never | May view own submitted pin where consented | Authorized routing/verification only. |
| Public location | Coarsened point/H3/street segment only | Coarsened by default; own exact pin only in private edit view | Exact if role/scope authorized. |
| Original media/key/EXIF/GPS | Never | Own private media through short-lived access; metadata warning only | Authorized private evidence view. |
| Public media | Redacted derivative only, may be withheld | Same plus own original | Redacted and private original where authorized. |
| Description | Redacted/length-limited and moderation filtered | Full own text | Operational full text where authorized. |
| Timeline actor names/private notes | No actor identity or private note | Own relevant non-private history | Role-appropriate internal detail. |
| AI predictions | Simple public advisory label only if published | Own suggestions/confidence/explanation | Detailed model/version/explanation and failure state. |
| Votes/supporters | Aggregate counts only | Own vote/support state plus aggregate | Voter identity only when required for moderation/audit. |

## 11. API validation notes
- Coordinates must be valid WGS84 latitude/longitude. The API determines ward/H3/public geometry; client-provided ward/H3 is advisory only.
- User-entered category corrections take priority for workflow while all AI suggestions remain historical records.
- `verified_fixed` is not accepted as a normal officer transition. It is reached through the verification policy/manual reviewed workflow.
- `duplicate_merged` cannot point to itself and needs a canonical complaint plus reason.
- Media uploads use a two-step intent/upload/finalize pattern; an object exists only after checksum/type verification. Unfinished uploads cannot be attached to a proof or complaint.
- Error messages remain plain language and never reveal whether another user’s phone or account exists.
