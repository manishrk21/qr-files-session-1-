-- ============================================================
-- 001_initial_schema.sql
-- [BRAND] SaaS — Core Tables
-- Changes vs original architecture:
--   • customers.mobile_number is now nullable (Google-only users have no mobile)
--   • customers.google_sub TEXT UNIQUE — Google "sub" claim
--   • customers.auth_provider TEXT — 'otp' | 'google' | 'guest'
--   • No payment gateway columns (manual mark-as-paid only)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── RESTAURANTS (Tenants) ────────────────────────────────────────────────────
CREATE TABLE restaurants (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT          NOT NULL UNIQUE,
  name                  TEXT          NOT NULL,
  description           TEXT,
  phone                 TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               TEXT,
  currency_code         TEXT          NOT NULL DEFAULT 'INR',
  tax_rate              NUMERIC(5,2)  NOT NULL DEFAULT 5.00,
  logo_url              TEXT,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  is_accepting_orders   BOOLEAN       NOT NULL DEFAULT true,
  loyalty_streak_target INT           NOT NULL DEFAULT 5,
  loyalty_reward_description TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX idx_restaurants_slug ON restaurants(slug) WHERE deleted_at IS NULL;

-- ─── RESTAURANT BRANDING (1:1) ────────────────────────────────────────────────
CREATE TABLE restaurant_branding (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID        NOT NULL UNIQUE REFERENCES restaurants(id) ON DELETE CASCADE,
  primary_color   TEXT        NOT NULL DEFAULT '#000000',
  secondary_color TEXT        NOT NULL DEFAULT '#ffffff',
  accent_color    TEXT        NOT NULL DEFAULT '#f59e0b',
  font_family     TEXT        NOT NULL DEFAULT 'Inter',
  banner_url      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TENANT MEMBERS ───────────────────────────────────────────────────────────
CREATE TABLE tenant_members (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL,               -- Supabase auth.users.id
  role            TEXT        NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('owner', 'admin', 'staff')),
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, user_id)
);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id) WHERE is_active = true;

-- ─── MENU CATEGORIES ──────────────────────────────────────────────────────────
CREATE TABLE menu_categories (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  display_order   INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(restaurant_id, name)
);
CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id)
  WHERE deleted_at IS NULL;

-- ─── MENU ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE menu_items (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id             UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id               UUID          NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name                      TEXT          NOT NULL,
  description               TEXT,
  price                     NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url                 TEXT,
  food_type                 TEXT          NOT NULL DEFAULT 'veg'
                            CHECK (food_type IN ('veg', 'non_veg', 'egg')),
  is_available              BOOLEAN       NOT NULL DEFAULT true,
  is_featured               BOOLEAN       NOT NULL DEFAULT false,
  allergens                 TEXT[]        NOT NULL DEFAULT '{}',
  preparation_time_minutes  INT,
  display_order             INT           NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_category ON menu_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_availability ON menu_items(restaurant_id, is_available)
  WHERE deleted_at IS NULL;

-- ─── TABLES ───────────────────────────────────────────────────────────────────
CREATE TABLE tables (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label           TEXT        NOT NULL,
  capacity        INT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  qr_code_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(restaurant_id, label)
);
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id) WHERE deleted_at IS NULL;

-- ─── TABLE TOKENS ─────────────────────────────────────────────────────────────
CREATE TABLE table_tokens (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id        UUID        NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  token           TEXT        NOT NULL UNIQUE,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);
CREATE INDEX idx_table_tokens_token ON table_tokens(token) WHERE is_active = true;

-- ─── CUSTOMERS ────────────────────────────────────────────────────────────────
-- auth_provider: 'otp' | 'google' | 'guest'
-- mobile_number: nullable — Google-only users may have no mobile
-- google_sub: Google "sub" claim, globally unique across all restaurants
-- UNIQUE(restaurant_id, mobile_number) is partial (only when mobile is not null)
CREATE TABLE customers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  mobile_number   TEXT,                                -- E.164 format, nullable for Google users
  google_sub      TEXT,                                -- Google identity subject
  name            TEXT,
  email           TEXT,                                -- from Google profile
  avatar_url      TEXT,                                -- from Google profile
  auth_provider   TEXT        NOT NULL DEFAULT 'otp'
                  CHECK (auth_provider IN ('otp', 'google', 'guest')),
  is_guest        BOOLEAN     NOT NULL DEFAULT false,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A mobile number is unique per restaurant (skip nulls)
  CONSTRAINT uq_customer_mobile UNIQUE NULLS NOT DISTINCT (restaurant_id, mobile_number),
  -- A Google sub is unique per restaurant
  CONSTRAINT uq_customer_google UNIQUE NULLS NOT DISTINCT (restaurant_id, google_sub),
  -- Must have at least one identity
  CONSTRAINT chk_customer_identity CHECK (
    mobile_number IS NOT NULL OR google_sub IS NOT NULL OR is_guest = true
  )
);
CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_mobile ON customers(restaurant_id, mobile_number)
  WHERE mobile_number IS NOT NULL;
CREATE INDEX idx_customers_google ON customers(restaurant_id, google_sub)
  WHERE google_sub IS NOT NULL;

-- ─── CUSTOMER SESSIONS ────────────────────────────────────────────────────────
CREATE TABLE customer_sessions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  session_token   TEXT        NOT NULL UNIQUE,
  is_guest        BOOLEAN     NOT NULL DEFAULT false,
  table_id        UUID        REFERENCES tables(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX idx_customer_sessions_expires ON customer_sessions(expires_at);

-- ─── OTP REQUESTS ─────────────────────────────────────────────────────────────
CREATE TABLE otp_requests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile_number   TEXT        NOT NULL,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  otp_hash        TEXT        NOT NULL,
  attempts        INT         NOT NULL DEFAULT 0,
  is_used         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);
CREATE INDEX idx_otp_mobile ON otp_requests(mobile_number, restaurant_id);
CREATE INDEX idx_otp_expires ON otp_requests(expires_at);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id         UUID          NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  customer_id           UUID          REFERENCES customers(id) ON DELETE SET NULL,
  table_id              UUID          REFERENCES tables(id) ON DELETE SET NULL,
  table_label           TEXT,
  status                TEXT          NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'accepted', 'preparing',
                          'ready', 'served', 'paid',
                          'cancelled', 'cancel_requested'
                        )),
  subtotal              NUMERIC(10,2) NOT NULL,
  tax_amount            NUMERIC(10,2) NOT NULL,
  total_amount          NUMERIC(10,2) NOT NULL,
  tax_rate_snapshot     NUMERIC(5,2)  NOT NULL,
  -- Manual payment only — no gateway fields
  payment_method        TEXT          CHECK (payment_method IN ('cash', 'upi', 'card', 'other')),
  payment_status        TEXT          NOT NULL DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  special_instructions  TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  accepted_at           TIMESTAMPTZ,
  ready_at              TIMESTAMPTZ,
  served_at             TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_table ON orders(table_id, status);

-- ─── ORDER ITEMS (immutable snapshot) ────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id   UUID          NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  menu_item_id    UUID          REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name       TEXT          NOT NULL,
  item_price      NUMERIC(10,2) NOT NULL,
  item_food_type  TEXT          NOT NULL,
  quantity        INT           NOT NULL CHECK (quantity > 0),
  subtotal        NUMERIC(10,2) NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_restaurant ON order_items(restaurant_id);

-- ─── LOYALTY VISITS ───────────────────────────────────────────────────────────
CREATE TABLE loyalty_visits (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  visit_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, restaurant_id, visit_date)
);
CREATE INDEX idx_loyalty_visits_customer ON loyalty_visits(customer_id, restaurant_id);

-- ─── LOYALTY REWARDS ──────────────────────────────────────────────────────────
CREATE TABLE loyalty_rewards (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  streak_cycle        INT         NOT NULL DEFAULT 1,
  reward_description  TEXT        NOT NULL,
  is_redeemed         BOOLEAN     NOT NULL DEFAULT false,
  redeemed_at         TIMESTAMPTZ,
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loyalty_rewards_customer ON loyalty_rewards(customer_id, restaurant_id);

-- ─── RATE LIMIT LOG ───────────────────────────────────────────────────────────
CREATE TABLE rate_limit_events (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address      TEXT        NOT NULL,
  endpoint        TEXT        NOT NULL,
  restaurant_id   UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rate_limit_created ON rate_limit_events(created_at);
