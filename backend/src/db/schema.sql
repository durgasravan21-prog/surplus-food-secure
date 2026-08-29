-- ============================================================================
-- ANNAYOG — SQLite Database Schema
-- AI-Matched Surplus Food Rescue Network
-- ============================================================================

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  google_sub      TEXT UNIQUE,
  email           TEXT UNIQUE,
  name            TEXT,
  picture         TEXT,
  role            TEXT CHECK(role IN ('RESTAURANT','INDIVIDUAL_DONOR','NGO','DELIVERY_PARTNER','ADMIN')),
  verification_status TEXT DEFAULT 'PENDING_VERIFICATION'
    CHECK(verification_status IN ('PENDING_VERIFICATION','PENDING','APPROVED','REJECTED','RESUBMIT_REQUIRED')),
  trust_score     INTEGER DEFAULT 100,
  suspended       INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL
);

-- ── Role-Specific Profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id),
  business_name   TEXT DEFAULT '',
  license_no      TEXT,
  address         TEXT DEFAULT '',
  lat             REAL DEFAULT 0,
  lng             REAL DEFAULT 0,
  verified_doc_url TEXT
);

CREATE TABLE IF NOT EXISTS ngo_profiles (
  user_id              TEXT PRIMARY KEY REFERENCES users(id),
  org_name             TEXT DEFAULT '',
  reg_no               TEXT,
  address              TEXT DEFAULT '',
  lat                  REAL DEFAULT 0,
  lng                  REAL DEFAULT 0,
  service_radius_km    INTEGER DEFAULT 10,
  daily_capacity       INTEGER DEFAULT 100,
  claimed_today        INTEGER DEFAULT 0,
  auto_match_enabled   INTEGER DEFAULT 1,
  operating_hours_open TEXT DEFAULT '08:00',
  operating_hours_close TEXT DEFAULT '21:00'
);

CREATE TABLE IF NOT EXISTS delivery_partner_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id),
  id_doc_url    TEXT,
  selfie_url    TEXT,
  vehicle_type  TEXT DEFAULT 'BIKE' CHECK(vehicle_type IN ('BIKE','ON_FOOT','CAR')),
  status        TEXT DEFAULT 'OFFLINE',
  current_lat   REAL DEFAULT 0,
  current_lng   REAL DEFAULT 0
);

-- ── Verification Documents ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_documents (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  doc_type      TEXT,
  file_url      TEXT,
  license_no    TEXT,
  reg_no        TEXT,
  status        TEXT DEFAULT 'PENDING'
    CHECK(status IN ('PENDING','APPROVED','REJECTED','RESUBMIT_REQUIRED')),
  review_reason TEXT,
  reviewed_by   TEXT REFERENCES users(id),
  submitted_at  TEXT,
  reviewed_at   TEXT
);

-- ── Food Listings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                  TEXT PRIMARY KEY,
  donor_id            TEXT REFERENCES users(id),
  food_type           TEXT NOT NULL,
  quantity_meals      INTEGER NOT NULL,
  perishability       TEXT CHECK(perishability IN ('HIGHLY_PERISHABLE','MODERATE','PACKAGED_SHELF_STABLE')),
  best_before_at      TEXT NOT NULL,
  pickup_window_start TEXT,
  pickup_window_end   TEXT,
  photo_url           TEXT,
  lat                 REAL,
  lng                 REAL,
  status              TEXT DEFAULT 'LISTED'
    CHECK(status IN ('LISTED','MATCHED_PENDING_NGO_ACCEPT','NGO_ACCEPTED','DELIVERY_ASSIGNED',
      'PARTNER_ARRIVED_PICKUP','PICKED_UP','DELIVERED','EXPIRED','CANCELLED')),
  safety_ack          INTEGER DEFAULT 0,
  cancel_reason       TEXT,
  created_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_donor ON listings(donor_id);
CREATE INDEX IF NOT EXISTS idx_listings_best_before ON listings(best_before_at);

-- ── Match Attempts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_attempts (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT REFERENCES listings(id),
  ngo_id        TEXT REFERENCES users(id),
  offered_at    TEXT,
  expires_at    TEXT,
  responded_at  TEXT,
  outcome       TEXT DEFAULT 'PENDING'
    CHECK(outcome IN ('PENDING','ACCEPTED','DECLINED','EXPIRED','CANCELLED')),
  distance_km   REAL
);

CREATE INDEX IF NOT EXISTS idx_matches_listing ON match_attempts(listing_id);
CREATE INDEX IF NOT EXISTS idx_matches_ngo ON match_attempts(ngo_id);
CREATE INDEX IF NOT EXISTS idx_matches_outcome ON match_attempts(outcome);

-- ── Delivery Assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id                TEXT PRIMARY KEY,
  listing_id        TEXT REFERENCES listings(id),
  match_ngo_id      TEXT REFERENCES users(id),
  partner_id        TEXT REFERENCES users(id),
  offered_at        TEXT,
  expires_at        TEXT,
  status            TEXT DEFAULT 'PENDING'
    CHECK(status IN ('PENDING','ACCEPTED','DECLINED','PARTNER_ARRIVED_PICKUP','PICKED_UP','DELIVERED','EXPIRED','SELF_ARRANGED')),
  pickup_photo_url  TEXT,
  dropoff_photo_url TEXT,
  metadata          TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_listing ON delivery_assignments(listing_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partner ON delivery_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_assignments(status);

-- ── Disputes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id                TEXT PRIMARY KEY,
  reporter_id       TEXT REFERENCES users(id),
  listing_id        TEXT REFERENCES listings(id),
  delivery_id       TEXT REFERENCES delivery_assignments(id),
  description       TEXT,
  photo_url         TEXT,
  outcome           TEXT,
  trust_score_delta INTEGER DEFAULT 0,
  target_user_id    TEXT REFERENCES users(id),
  resolved_by       TEXT REFERENCES users(id),
  created_at        TEXT,
  resolved_at       TEXT
);

-- ── Audit Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  actor_id      TEXT,
  action        TEXT,
  resource_type TEXT,
  resource_id   TEXT,
  metadata      TEXT,
  timestamp     TEXT
);

-- ── Refresh Tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token         TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  expires_at    TEXT
);

-- ── Idempotency Keys ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key           TEXT PRIMARY KEY,
  response      TEXT,
  created_at    TEXT
);

-- ── Seed Platform Admin ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO users (id, google_sub, email, name, picture, role, verification_status, trust_score, suspended, created_at)
VALUES (
  'admin-seed-001',
  'admin-google-sub',
  'admin@annayog.app',
  'Platform Admin',
  '',
  'ADMIN',
  'APPROVED',
  100,
  0,
  datetime('now')
);
