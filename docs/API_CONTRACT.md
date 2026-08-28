# Annayog API Contract & Engineering Specification
**AI-Matched Surplus Food Rescue Network — Engineering Reference (v1.0, Hackathon Build)**  
*Team Annayog — August 2026*

---

## 0. How To Use This Document
This is the single source of truth for every request/response shape, status code, field name, and enum value in the Annayog backend. It exists so that frontend, backend, and matching-engine work can proceed in parallel without breaking each other.

### Rules for the team:
1. If it’s not in this contract, don’t ship it — add it here first, then build it. A 30-second Slack message (“adding POST /delivery/:id/no-show, updating doc now”) keeps everyone in sync.
2. Field names, casing (`snake_case` for JSON keys), and enum values below are final unless changed in this document.
3. Any breaking change to a shape already in use gets a new version note in §14, not a silent edit.
4. Mock servers / frontend stubs should return the exact example JSON shown per endpoint so integration is a non-event on demo day.

---

## 1. Conventions

### 1.1 Base URL & Versioning
- **Base URL:** `https://api.annayog.app/v1`
- **WebSocket URL:** `wss://api.annayog.app/v1/ws`

All routes below are relative to the base URL. The `v1` prefix is fixed for the hackathon; do not introduce `v2` routes mid-build.

### 1.2 Authentication
Every request except `POST /auth/google/callback` and `GET /health` requires:
```http
Authorization: Bearer <access_token>
```
`access_token` is a short-lived JWT issued after Google OAuth exchange (see §2). Cookies are not used for API auth; only for CSRF-protected browser session bootstrap if the frontend needs it.

### 1.3 Standard Response Envelope
**Success:**
```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```
`meta` is present only for paginated or list endpoints (see §1.5).

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VERIFICATION_REQUIRED",
    "message": "Your account must be verified before publishing a listing.",
    "details": {}
  }
}
```
Never return a bare array or bare object at the top level. Never omit `success`.

### 1.4 HTTP Status Codes Used
| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET/PATCH/POST that doesn’t create a resource |
| `201` | Created | Successful POST that creates a resource |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Schema validation failure |
| `401` | Unauthorized | Missing/invalid/expired token |
| `403` | Forbidden | Valid token, insufficient role/ownership/verification |
| `404` | Not Found | Resource doesn’t exist or isn’t visible to this actor |
| `409` | Conflict | Race condition loss (e.g., offer already accepted), duplicate license/reg no. |
| `422` | Unprocessable Entity | Semantically invalid (e.g., `best_before_at` in the past) |
| `429` | Too Many Requests | Rate limit hit |
| `500` | Internal Server Error | Unhandled — log full stack, return generic message only |

*Never leak stack traces, SQL, or internal file paths in a 4xx/5xx body.*

### 1.5 Pagination
List endpoints accept `?page=1&limit=20` (default `limit=20`, max `100`) and return:
```json
{
  "success": true,
  "data": [ ],
  "meta": { "page": 1, "limit": 20, "total": 57, "has_more": true }
}
```

### 1.6 Timestamps & IDs
- All timestamps are ISO-8601 UTC strings: `"2026-08-28T14:32:00Z"`.
- All resource IDs are UUIDv4 strings, generated server-side. Never accept a client-supplied ID on create.
- Distances are in kilometers, floats, 2 decimal places (`"distance_km": 1.85`).

### 1.7 Idempotency
`POST /listings/:id/accept`, `POST /delivery/:id/accept`, and both `.../decline` endpoints require an `Idempotency-Key` header (client-generated UUID). Replaying the same key returns the original response instead of re-executing the action.

### 1.8 Error Code Registry
Use these exact `error.code` strings — the frontend switches UI copy off of them, not off `message`.

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No/invalid/expired token |
| `TOKEN_REVOKED` | 401 | Google access revoked mid-session |
| `ROLE_FORBIDDEN` | 403 | Wrong role for this action |
| `NOT_OWNER` | 403 | Resource exists but caller doesn’t own/isn’t assigned to it |
| `VERIFICATION_REQUIRED` | 403 | Action needs `verification_status = APPROVED` |
| `ACCOUNT_SUSPENDED` | 403 | Admin suspended this account |
| `NOT_FOUND` | 404 | Resource missing or hidden from this actor |
| `VALIDATION_ERROR` | 400 | Field-level schema failure (see `details`) |
| `DUPLICATE_LICENSE` | 409 | License/registration number already claimed |
| `OFFER_ALREADY_RESOLVED` | 409 | Someone else accepted/declined first (race) |
| `OFFER_EXPIRED` | 409 | Accept window passed |
| `CAPACITY_EXCEEDED` | 422 | NGO daily capacity would be exceeded |
| `LISTING_EXPIRED` | 422 | `best_before_at` has passed |
| `INVALID_STATE_TRANSITION` | 422 | e.g., trying to mark DELIVERED without a photo |
| `RATE_LIMITED` | 429 | Too many requests for this action/user/IP |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## 2. Auth & Session

### 2.1 POST /auth/google/callback
Exchanges a Google OAuth authorization code for an Annayog session. Public endpoint (no bearer token).

**Request:**
```json
{ "code": "4/0AeanS0...", "redirect_uri": "https://app.annayog.app/oauth/callback" }
```
Server MUST:
1. Exchange code with Google, verify the ID token’s signature and `aud` claim.
2. Look up User by `google_sub`. If not found, create with `status = PENDING_VERIFICATION`, `verified = false`, `role = null`.
3. If `role` is null, return `requires_role_selection: true` and skip issuing a full-scope token.

**Response — first-time user (201):**
```json
{
  "success": true,
  "data": {
    "user_id": "b1e2...",
    "email": "chef@saffronhouse.in",
    "requires_role_selection": true,
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

**Response — returning user (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "b1e2...",
    "role": "RESTAURANT",
    "verification_status": "APPROVED",
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

### 2.2 POST /auth/role — one-time role selection
Auth: any authenticated user with `role = null`.

**Request:**
```json
{ "role": "RESTAURANT" }
```
`role` enum: `RESTAURANT` | `INDIVIDUAL_DONOR` | `NGO` | `DELIVERY_PARTNER`. (`ADMIN` is never selectable here — seeded manually in DB.)

Server MUST reject with `409 VALIDATION_ERROR` if role is already set. This is permanent from the client’s side; only `PATCH /admin/users/:id/role` (Admin-only) can change it later.

**Response (200):**
```json
{ 
  "success": true, 
  "data": { 
    "user_id": "b1e2...", 
    "role": "RESTAURANT", 
    "verification_status": "PENDING_VERIFICATION" 
  } 
}
```

### 2.3 POST /auth/refresh
- **Request:** `{ "refresh_token": "eyJ..." }`
- **Response (200):** new `access_token` + rotated `refresh_token`. Old refresh token is invalidated on use.

### 2.4 POST /auth/logout
Invalidates the current refresh token server-side.
- **Response:** `204 No Content`.

### 2.5 JWT Payload Shape (reference)
```json
{
  "sub": "b1e2-user-id",
  "role": "NGO",
  "org_id": "f4a1-ngo-profile-id",
  "verification_status": "APPROVED",
  "iat": 1735300000,
  "exp": 1735300900
}
```
`verification_status` and `role` on the token are advisory only — every protected route re-reads current values from the DB before authorizing.

---

## 3. RBAC Middleware Contract

### 3.1 Middleware Order (apply in this order, every route)
1. `verifyJWT` — signature + expiry → 401 UNAUTHENTICATED on failure.
2. `loadCurrentUser` — re-fetch `role`, `verification_status`, `suspended` from DB by `sub`. → 403 ACCOUNT_SUSPENDED if suspended.
3. `requireRole([...])` — 403 ROLE_FORBIDDEN if role not in allow-list for this route.
4. `requireVerified` (route-specific) — 403 VERIFICATION_REQUIRED if not APPROVED.
5. `requireOwnership` (route-specific) — loads the resource, compares `resource.ngo_id === token.org_id` (or equivalent) → 403 NOT_OWNER.

*Return 404 NOT_FOUND instead of 403 NOT_OWNER when the caller has no legitimate reason to know the resource exists.*

### 3.2 RBAC Matrix (authoritative)
| Route | RESTAURANT | INDIVIDUAL_DONOR | NGO | DELIVERY_PARTNER | ADMIN |
|---|---|---|---|---|---|
| `POST /listings` | ✅ (if verified) | ✅ (if verified) | ❌ | ❌ | ✅ |
| `GET /listings/mine` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `GET /listings/matched` | ❌ | ❌ | ✅ (own only) | ❌ | ✅ |
| `GET /listings/board` | ❌ | ❌ | ✅ (verified only) | ❌ | ✅ |
| `POST /listings/:id/cancel` | ✅ (owner only) | ✅ (owner only) | ❌ | ❌ | ✅ |
| `POST /matches/:id/accept` | ❌ | ❌ | ✅ (offered-to NGO only) | ❌ | ✅ |
| `POST /matches/:id/decline` | ❌ | ❌ | ✅ (offered-to NGO only) | ❌ | ✅ |
| `PATCH /ngo/auto-match` | ❌ | ❌ | ✅ (own org only) | ❌ | ✅ |
| `POST /delivery-offers/:id/accept` | ❌ | ❌ | ❌ | ✅ (offered-to partner only) | ✅ |
| `POST /delivery-offers/:id/decline` | ❌ | ❌ | ❌ | ✅ (offered-to partner only) | ✅ |
| `POST /delivery/:id/status` | ❌ | ❌ | ❌ | ✅ (assigned partner only) | ✅ |
| `POST /delivery/:id/photo` | ❌ | ❌ | ❌ | ✅ (assigned partner only) | ✅ |
| `POST /verification/submit` | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ➖ |
| `POST /verification/:id/review` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /users/:id/contact` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `PATCH /admin/users/:id/role` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/users/:id/suspend` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `POST /admin/matches/:id/override` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Verification

### 4.1 POST /verification/submit
Auth: any role, own account only.

**Request (Restaurant/Donor):**
```json
{
  "doc_type": "FSSAI_LICENSE",
  "license_no": "12345678901234",
  "file_url": "s3://annayog-uploads/tmp/9f2a.jpg"
}
```

**Request (NGO):**
```json
{
  "doc_type": "NGO_REGISTRATION",
  "reg_no": "80G-2024-KA-004521",
  "org_name": "Anna Seva Trust",
  "address_place_id": "ChIJ...",
  "service_radius_km": 5,
  "daily_capacity": 120,
  "operating_hours": { "open": "08:00", "close": "21:00" },
  "file_url": "s3://annayog-uploads/tmp/7b1c.pdf"
}
```

**Request (Delivery Partner):**
```json
{
  "doc_type": "GOVT_ID",
  "vehicle_type": "BIKE",
  "id_file_url": "s3://annayog-uploads/tmp/1a2b.jpg",
  "selfie_file_url": "s3://annayog-uploads/tmp/liveness_1a2b.jpg"
}
```

**Response (201):**
```json
{ "success": true, "data": { "verification_id": "d9c1...", "status": "PENDING" } }
```

### 4.2 GET /verification/me
Returns caller’s verification record. `status` enum: `PENDING` | `APPROVED` | `REJECTED` | `RESUBMIT_REQUIRED`.
```json
{ "success": true, "data": { "status": "PENDING", "submitted_at": "2026-08-27T10:00:00Z", "reason": null } }
```

### 4.3 POST /verification/:id/review (Admin only)
**Request:**
```json
{ "decision": "REJECTED", "reason": "Certificate photo is cropped, license number not fully visible." }
```
`decision` enum: `APPROVED` | `REJECTED` | `RESUBMIT_REQUIRED`. `reason` mandatory when not `APPROVED`.

### 4.4 GET /admin/verification/queue (Admin only)
Paginated queue, filterable: `?status=PENDING&role=NGO&flagged_duplicate=true`.

---

## 5. Listings

### 5.1 State Machine
`LISTED` → `MATCHED_PENDING_NGO_ACCEPT` → `NGO_ACCEPTED` → `DELIVERY_ASSIGNED` → `PARTNER_ARRIVED_PICKUP` → `PICKED_UP` → `DELIVERED`  
*(any pre-DELIVERED state)* → `EXPIRED` | `CANCELLED`

Every transition is written to `AuditLog`.

### 5.2 POST /listings
Auth: RESTAURANT or INDIVIDUAL_DONOR, `verification_status = APPROVED`.

**Request:**
```json
{
  "food_type": "Cooked rice + dal, veg",
  "quantity_meals": 40,
  "perishability": "HIGHLY_PERISHABLE",
  "best_before_at": "2026-08-28T18:00:00Z",
  "pickup_window": { "start": "2026-08-28T15:30:00Z", "end": "2026-08-28T17:00:00Z" },
  "photo_url": "s3://annayog-uploads/listings/tmp/4f2c.jpg",
  "lat": 28.6139,
  "lng": 77.2090,
  "safety_ack": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "listing_id": "a71e...",
    "status": "LISTED",
    "flagged_for_review": false,
    "created_at": "2026-08-28T14:00:00Z"
  }
}
```

### 5.3 GET /listings/mine
Donor’s own listings, paginated, optional `?status=`.

### 5.4 GET /listings/:id
Owner, matched/assigned NGO, assigned partner, or Admin only. Location rounded to ~1km unless actor is assigned partner after `DELIVERY_ASSIGNED`.

### 5.5 POST /listings/:id/cancel
Auth: owner only. Request: `{ "reason": "..." }`. Releases any pending assignments.

### 5.6 GET /listings/board (manual browse)
Listings where no auto-match occurred. NGO role, verified only.

### 5.7 POST /listings/:id/claim (manual claim from board)
Auth: NGO, verified. Uses row-level lock conditional update.

---

## 6. AI Matching Engine

### 6.1 Internal Job Pipeline
Queue message: `{ "job": "match_listing", "listing_id": "a71e...", "attempt": 1 }`
1. **Eligibility filter:** NGO is verified `APPROVED`, `auto_match_enabled = true`, within `service_radius_km`, under `daily_capacity`, within `operating_hours`.
2. **Distance scoring:** Haversine ascending.
3. **Urgency/perishability weighting:** `HIGHLY_PERISHABLE` + `< 60 min` best-before jumps global queue and adds `+2km` effective radius for pass.
4. **Quantity fit:** Skip NGO if `daily_capacity_remaining < quantity_meals`.
5. **Assignment:** Offer sent to top-scoring NGO, 10 min expiry. Status → `MATCHED_PENDING_NGO_ACCEPT`.
6. **On Accept:** Status → `NGO_ACCEPTED`, enqueue `assign_delivery_partner`.
7. **On Decline/Timeout:** Cascade to next-nearest NGO, log `MatchAttempt`.

### 6.2 GET /listings/matched (NGO inbox)
**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "match_id": "m1a2...",
      "listing_id": "a71e...",
      "food_type": "Cooked rice + dal, veg",
      "quantity_meals": 40,
      "distance_km": 1.85,
      "best_before_at": "2026-08-28T18:00:00Z",
      "expires_at": "2026-08-28T14:10:00Z",
      "status": "PENDING"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "has_more": false }
}
```

### 6.3 POST /matches/:id/accept
Auth: NGO offered to. Header: `Idempotency-Key`.
Conditional update: `UPDATE match_attempts SET outcome='ACCEPTED' WHERE id=:id AND outcome='PENDING'`.

### 6.4 POST /matches/:id/decline
Sets `outcome='DECLINED'`, cascades to next-nearest NGO.

### 6.5 Delivery Partner Auto-Assignment
Pool: verified `APPROVED`, status `ONLINE`, within radius of pickup point, nearest-first. 3–5 min offer window.

### 6.6 GET /delivery-offers/pending & 6.7 POST /delivery-offers/:id/accept / decline
Mirrors match offer accept/decline for Delivery Partner.

### 6.8 PATCH /ngo/auto-match
Auth: NGO, verified. Request: `{ "enabled": true }`.

---

## 7. Delivery Lifecycle

### 7.1 State Machine
`DELIVERY_ASSIGNED` → `PARTNER_ARRIVED_PICKUP` → `PICKED_UP` → `DELIVERED`

### 7.2 POST /delivery/:id/status
Auth: DELIVERY_PARTNER assigned. Request: `{ "status": "PICKED_UP" }`.
- `-> PICKED_UP` requires `pickup_photo_url`.
- `-> DELIVERED` requires `dropoff_photo_url`.

### 7.3 POST /delivery/:id/photo
Request: `{ "stage": "PICKUP" | "DROPOFF", "file_url": "..." }`. Server strips EXIF and returns signed URL.

### 7.4 POST /delivery/:id/no-show
Request: `{ "flagged_role": "DELIVERY_PARTNER", "notes": "..." }`. Decrements trust score.

### 7.5 POST /delivery/:id/self-arrange
Auth: NGO assigned. Marks `self_arranged = true`.

### 7.6 POST /listings/:id/confirm-receipt
Auth: assigned NGO. Sets Listing status → `DELIVERED`, `delivered_at = now`.

---

## 8. Disputes & Trust

### 8.1 POST /disputes
Request: `{ "listing_id": "...", "against_role": "RESTAURANT", "reason": "SPOILED_FOOD", "notes": "...", "photo_urls": [...] }`.

### 8.2 Admin Dispute Resolution
`POST /admin/disputes/:id/resolve`: `{ "outcome": "UPHELD" | "DISMISSED", "trust_score_delta": -10 }`.

---

## 9. Cross-Cutting Endpoints

### 9.1 GET /stats/impact
Returns rescued meals, kg saved, CO2e estimate.

### 9.2 GET /admin/dashboard
Returns listings today, matched %, delivered %, expired %, avg time to match.

### 9.3 POST /uploads/presign
Request: `{ "purpose": "VERIFICATION_DOC" | "LISTING_PHOTO" | "DELIVERY_PROOF" | "LIVENESS_SELFIE", "mime_type": "image/jpeg" }`. Returns presigned upload URL.

### 9.4 POST /admin/users/:id/suspend / reinstate
Immediate removal from matching pool.

### 9.5 PATCH /admin/users/:id/role
Admin-only post-selection role change.

### 9.6 POST /admin/matches/:id/override
Force assign or force cancel stuck matches.

---

## 10. Realtime Events & Rate Limits

### 10.1 Realtime Events (WebSocket: `wss://api.annayog.app/v1/ws?token=<access_token>`)
Events: `MATCH_OFFER`, `MATCH_OFFER_EXPIRED`, `DELIVERY_OFFER`, `LISTING_STATUS_CHANGED`, `VERIFICATION_DECISION`, `NO_SHOW_FLAGGED`.
*Email fallback for critical events: `MATCH_OFFER`, `DELIVERY_OFFER`, `VERIFICATION_DECISION`.*

### 11. Rate Limits
- `POST /listings`: 10 / hour per user
- `POST /verification/submit`: 5 / day per user
- OTP request: 3 / 10 min per phone number
- `POST /matches/:id/accept|decline`: 30 / min per user
- `POST /delivery-offers/:id/accept|decline`: 30 / min per user
- Global: 100 / min per IP

---

## 12. Data Model Reference
- **User:** `id`, `google_sub`, `email`, `role`, `verification_status`, `suspended`, `trust_score`, `created_at`
- **RestaurantProfile / DonorProfile:** `user_id`, `business_name`, `license_no`, `address`, `lat`, `lng`, `verified_doc_url`
- **NGOProfile:** `user_id`, `org_name`, `reg_no`, `address`, `lat`, `lng`, `service_radius_km`, `daily_capacity`, `daily_capacity_remaining`, `auto_match_enabled`, `operating_hours`
- **DeliveryPartnerProfile:** `user_id`, `id_doc_url`, `vehicle_type`, `status`, `current_lat`, `current_lng`
- **Listing:** `id`, `donor_id`, `food_type`, `quantity_meals`, `perishability`, `best_before_at`, `status`, `lat`, `lng`, `flagged_for_review`, `created_at`, `delivered_at`
- **MatchAttempt:** `id`, `listing_id`, `ngo_id`, `offered_at`, `expires_at`, `responded_at`, `outcome`
- **DeliveryAssignment:** `id`, `listing_id`, `partner_id`, `offered_at`, `status`, `pickup_photo_url`, `dropoff_photo_url`
- **VerificationDocument:** `id`, `user_id`, `doc_type`, `file_url`, `status`, `reviewed_by`, `review_reason`, `flagged_duplicate`
- **AuditLog:** `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `timestamp`

---

## 13. Security Checklist
- [x] Every write route: `verifyJWT` -> `loadCurrentUser` -> `requireRole` -> `requireVerified` -> `requireOwnership`
- [x] Always re-read role & verification status from DB (never payload alone)
- [x] Parameterized SQL / ORM only
- [x] All uploads via `/uploads/presign`
- [x] Conditional updates (`WHERE outcome = 'PENDING'`) for accept/decline
- [x] Idempotency keys on state transitions
- [x] `.env` gitignored, `.env.example` with placeholders
- [x] Location precision reduced for non-assigned actors

---

## 14. Change Log
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-28 | Initial contract drafted covering Auth, RBAC, Verification, Listings, Matching, Delivery, Disputes, Realtime, Rate limits, Data model. |
