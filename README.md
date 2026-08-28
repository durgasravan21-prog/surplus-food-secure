# Annayog — AI-Matched Surplus Food Rescue Network

Annayog connects three verified stakeholders — **Restaurants/Individual Donors**, **NGOs/Shelters**, and **Delivery Partners (volunteers)** — to rescue surplus food before it is wasted. 

A donor lists surplus food; an AI matching agent (toggle-controlled by each NGO) automatically assigns the listing to the nearest eligible, verified NGO; a nearby verified delivery partner is then auto-assigned to complete pickup and drop-off.

---

## 📚 Project Documentation
- **API Contract & Engineering Specification (v1.0):** [docs/API_CONTRACT.md](docs/API_CONTRACT.md)

---

## 🔑 Key Features
- **Verification-Gated Marketplace:** Identity verification required before any stakeholder can list, claim, or deliver.
- **Distance-First AI Matching Engine:** Distance + urgency + perishability scoring with NGO toggle control.
- **Pickup Lifecycle State Machine:** `LISTED` → `MATCHED` → `ACCEPTED` → `DELIVERY_ASSIGNED` → `PICKED_UP` → `DELIVERED`.
- **Security First:** OAuth 2.0, RBAC middleware on every route, signed URLs for proof photos, and rate limiting.

---

## 🛠 Tech Stack & Architecture
- **Auth:** Google OAuth 2.0 (OpenID Connect) + JWT with DB-revalidated role & verification status.
- **API:** REST (`/v1/`) & Realtime WebSockets (`/v1/ws`).
- **Database:** Relational storage with row-level locks on state transitions for race condition prevention.
