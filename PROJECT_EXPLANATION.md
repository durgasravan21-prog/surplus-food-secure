# Annayog — Complete Codebase & Architecture Guide
**AI-Matched Surplus Food Rescue Network — Engineering & Judge Presentation Reference**  
*Team Annayog | August 2026*

---

## 1. Executive Summary (The 30-Second Pitch)
> "Every day, tons of fresh, edible food from commercial kitchens and events are thrown away while local shelters face acute meal shortages. Existing platforms rely on manual listing boards where food spoils while waiting for volunteers.
>
> **Annayog** is a **verification-gated, AI-matched surplus food rescue platform**. When a restaurant lists surplus food, our deterministic distance-and-perishability AI engine automatically matches it to the nearest verified NGO that has declared capacity. The moment the NGO accepts, a verified delivery partner is auto-assigned with a full chain-of-custody photo audit trail. It is secure by default: OAuth 2.0 only, zero secrets in source code, strict RBAC middleware, and row-level locks preventing race conditions."

---

## 2. Core Stakeholders & Roles
Annayog supports 4 distinct user roles plus Platform Admin:

| Role | Responsibility | Verification Requirement | Key UI Actions |
|---|---|---|---|
| **`RESTAURANT`** | Licensed commercial kitchens with bulk surplus | FSSAI License Number + Certificate Document | Create listing, view status tracker, impact metrics |
| **`INDIVIDUAL_DONOR`** | Residential donors with home surplus | Phone OTP + Address + Mandatory Food Safety Checklist | Create listing (<50 meals cap), food safety acknowledgement |
| **`NGO`** | Shelters, community kitchens, food banks | 80G/12A/Trust Reg No. + Service Radius & Daily Capacity declaration | Toggle Auto-Match ON/OFF, accept/decline match offers, browse board, confirm receipt |
| **`DELIVERY_PARTNER`** | Volunteer drivers and riders | Government Photo ID + Live in-app selfie (liveness check) | Online/Offline toggle, accept delivery offers, upload pickup/dropoff photos, report no-shows |
| **`ADMIN`** | Platform stewards & verifiers | Seeded internally | Review verification queue, resolve disputes, suspend/reinstate users, override stuck matches |

---

## 3. High-Level System Architecture

```
                                  +-----------------------+
                                  |     Google OAuth      |
                                  |  (Identity Anchor)    |
                                  +-----------+-----------+
                                              |
                                              v
+------------------------------------------------------------------------------------+
|                                  Annayog Backend                                   |
|                                                                                    |
|  +--------------------+    +--------------------+    +--------------------------+  |
|  |  RBAC Middleware   | -> |  Postgres / MySQL  | -> |   AI Matching Engine     |  |
|  |  verifyJWT         |    |  Row-Level Locks   |    |   Eligibility Filter     |  |
|  |  loadCurrentUser   |    |  AuditLog Table    |    |   Haversine Distance     |  |
|  |  requireRole       |    +--------------------+    |   Perishability Weight   |  |
|  |  requireVerified   |                              |   Capacity Fit           |  |
|  |  requireOwnership  |                              +------------+-------------+  |
|  +--------------------+                                           |                |
|                                                                   v                |
|                                                      +--------------------------+  |
|                                                      |  Delivery Auto-Assign    |  |
|                                                      |  Pickup/Dropoff Stepper  |  |
|                                                      +--------------------------+  |
+------------------------------------------------------------------------------------+
                                              |
                                              v
+------------------------------------------------------------------------------------+
|                              Annayog Frontend App                                  |
|   (Vite + React Router v6 + Google Stitch Design System + Live Demo Mode)          |
+------------------------------------------------------------------------------------+
```

---

## 4. Codebase Structure & File-by-File Explanation

### 4.1 Configuration & Constants (`src/config/constants.js`)
- Contains authoritative constants matching the API Contract v1.0.
- `ROLES`: Enums for `RESTAURANT`, `INDIVIDUAL_DONOR`, `NGO`, `DELIVERY_PARTNER`, `ADMIN`.
- `VERIFICATION_STATUS`: `PENDING_VERIFICATION`, `PENDING`, `APPROVED`, `REJECTED`, `RESUBMIT_REQUIRED`.
- `LISTING_STATUS`: State machine states from `LISTED` to `DELIVERED`.
- `PERISHABILITY`: `HIGHLY_PERISHABLE`, `MODERATE`, `PACKAGED_SHELF_STABLE`.

### 4.2 API Services Layer (`src/services/`)
- **`api.js`**: Core Axios client configured with `https://api.annayog.app/v1` base URL, automatic Bearer JWT injection, and automatic token refresh interceptor on 401.
- **`auth.js`**: Methods for `googleCallback`, `selectRole`, `refresh`, and `logout`.
- **`listings.js`**: `create`, `getMine`, `getById`, `cancel`, `getBoard`, `claim`, `confirmReceipt`.
- **`matching.js`**: `getMatched`, `accept` (with `Idempotency-Key`), `decline`, `toggleAutoMatch`.
- **`delivery.js`**: `getPendingOffers`, `acceptOffer`, `updateStatus`, `uploadPhoto`, `reportNoShow`, `selfArrange`.
- **`verification.js`**: Document submission, status polling, admin review queue.
- **`uploads.js`**: Requests presigned S3 PUT URLs via `POST /uploads/presign` and executes direct client-to-storage upload (server never handles raw multipart files).
- **`stats.js`**: User-specific and global environmental impact statistics (`meals_rescued`, `kg_saved`, `co2e_kg_estimate`).
- **`websocket.js`**: WebSocket manager with auto-reconnection and event listeners for real-time dispatch alerts.

### 4.3 Context & Security Guards (`src/context/`, `src/components/`)
- **`AuthContext.jsx`**: Centralized authentication state, persistent localStorage caching, and mock session simulation for judge demos.
- **`ProtectedRoute.jsx`**: Multi-layer security gate:
  1. Checks if user is authenticated (redirects to `/login`).
  2. Checks if user completed role selection (redirects to `/select-role`).
  3. Validates role against route `allowedRoles` (redirects to `/unauthorized`).
  4. Enforces `requireVerified` status when needed (redirects to `/verification-pending`).
- **`VerificationBanner.jsx`**: Dynamic notification banner displayed across the dashboard when an account is unverified or pending admin review.

### 4.4 Portals & Views (`src/pages/`)
- **`LoginPage.jsx`**: Google OAuth authentication screen styled after Google Stitch design guidelines.
- **`SelectRolePage.jsx`**: Mandatory, irreversible one-time role selection screen preventing identity manipulation.
- **`VerificationSubmitPage.jsx`**: Role-adaptive onboarding forms:
  - FSSAI License entry for Restaurants.
  - Organization Registration + Radius (km) + Daily Capacity for NGOs.
  - Government ID + In-app Live Selfie for Delivery Partners.
- **`DonorDashboard.jsx` & `CreateListingPage.jsx`**:
  - Live impact scorecards (Meals Rescued, Food Saved, CO2e Avoided).
  - Listing creation form with geolocation lookup and perishability timer calculator.
  - My Listings tracker with real-time state badge updates.
- **`NGODashboard.jsx` & `BrowseBoardPage.jsx`**:
  - NGO Auto-Match Toggle (`PATCH /ngo/auto-match`) allowing shelters to pause incoming flow when at capacity.
  - Incoming Match Offer cards with real-time 10-minute accept countdown timers.
  - Public browse board for voluntary claim of unmatched listings.
- **`DeliveryOffersPage.jsx` & `ActiveDeliveryPage.jsx`**:
  - Volunteer delivery assignment offers with accept/decline actions.
  - 4-stage sequential delivery lifecycle stepper with mandatory photo verification before marking `DELIVERED`.
- **`AdminDashboardPage.jsx` & `VerificationQueuePage.jsx`**:
  - Real-time platform metrics (Match %, Delivery %, Expiry %, Avg Time to Match).
  - Document approval queue with duplicate license flagging and mandatory rejection reason capture.

---

## 5. The AI Matching Algorithm (Deterministic & Explainable)

When a restaurant publishes a listing, matching runs through a 5-step deterministic scoring pipeline:

1. **Eligibility Filter:**
   $$\text{Eligible}(NGO) = \text{Verified} \land (\text{AutoMatch} = \text{ON}) \land (\text{Dist} \le \text{Radius}) \land (\text{Cap}_{\text{rem}} \ge \text{Qty}) \land \text{IsOpen}$$
2. **Distance Scoring (Haversine Formula):**
   $$d = 2R \arcsin \left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
3. **Urgency & Perishability Boost:**
   - If `perishability == 'HIGHLY_PERISHABLE'` and $\text{best\_before} < 60\text{ min}$, listing jumps to the top of the global queue and effective search radius widens by $+2\text{ km}$.
4. **Assignment & Offer Lock:**
   - Top-scoring NGO receives match with 10-minute expiry (`MATCHED_PENDING_NGO_ACCEPT`).
5. **Anti-Race Conditional Update:**
   - Database update guarded by:
   ```sql
   UPDATE match_attempts 
   SET outcome = 'ACCEPTED' 
   WHERE id = :match_id AND outcome = 'PENDING';
   ```
   *If rows affected is 0, the offer has already been resolved or expired.*

---

## 6. Delivery Lifecycle State Machine

```
[LISTED] 
   │
   ▼ (AI Matching)
[MATCHED_PENDING_NGO_ACCEPT]
   │
   ▼ (NGO Accepts)
[NGO_ACCEPTED]
   │
   ▼ (Delivery Partner Assigned)
[DELIVERY_ASSIGNED] ──► (Partner navigates to restaurant)
   │
   ▼
[PARTNER_ARRIVED_PICKUP] ──► (Partner verifies food & uploads pickup photo)
   │
   ▼
[PICKED_UP] ──► (Partner navigates to NGO dropoff)
   │
   ▼
[DELIVERED] ──► (Partner uploads dropoff photo & NGO confirms receipt)
```

---

## 7. Security & Non-Negotiables Checklist

- [x] **No Hardcoded Secrets:** All credentials loaded via `.env` with placeholder `.env.example` committed.
- [x] **Server-Side Re-Validation:** Every protected write route re-checks `role` and `verification_status` in the database (never trusts client token payload alone).
- [x] **Presigned Storage Uploads:** Files upload directly to object storage via `/uploads/presign` with MIME-type allow-listing and EXIF stripping.
- [x] **Progressive Location Disclosure:** Exact donor and NGO addresses are obscured until a delivery partner formally accepts an offer.
- [x] **Idempotent State Changes:** All status updates require client-generated `Idempotency-Key` UUIDs.

---

## 8. Hackathon Judge Q&A Cheat Sheet

**Q: How do you prevent people from faking restaurant accounts?**  
> *"No user can create a listing without an `APPROVED` verification status. Restaurants must provide an FSSAI license number and document upload. Our backend checks license format checksums and runs duplicate-detection before human Admin review."*

**Q: What if an NGO is closed or overwhelmed with food?**  
> *"Each NGO has an explicit Auto-Match toggle in their dashboard. When switched OFF or when their daily capacity is reached, they are immediately excluded from the AI matching pool without interrupting active deliveries."*

**Q: What happens if two NGOs try to accept the same offer simultaneously?**  
> *"Our backend uses row-level conditional updates (`WHERE outcome = 'PENDING'`). Only the first write succeeds with HTTP 200; the second receives HTTP 409 `OFFER_ALREADY_RESOLVED`."*

**Q: Why not use a generic chatbot for matching?**  
> *"Food rescue requires deterministic speed, geographic constraints, capacity budgeting, and food safety windows. Our mathematical scoring model guarantees nearest-first allocation with 100% auditability for judge and regulatory review."*
