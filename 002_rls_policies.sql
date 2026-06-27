-- ============================================================
-- 002_rls_policies.sql
-- Row-Level Security for all tenant-scoped tables.
-- Admin reads go through Supabase JWT (auth.uid()).
-- Customer reads go through service-role API routes — not direct client.
-- ============================================================

ALTER TABLE restaurants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_branding   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables                ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_visits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards       ENABLE ROW LEVEL SECURITY;

-- ─── HELPER: current admin's restaurant_id ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id
  FROM tenant_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── RESTAURANTS ──────────────────────────────────────────────────────────────
CREATE POLICY "admins_select_own_restaurant"
  ON restaurants FOR SELECT
  USING (id = get_my_restaurant_id());

CREATE POLICY "admins_update_own_restaurant"
  ON restaurants FOR UPDATE
  USING (id = get_my_restaurant_id());

-- ─── RESTAURANT BRANDING ──────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_branding"
  ON restaurant_branding FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── TENANT MEMBERS ───────────────────────────────────────────────────────────
CREATE POLICY "members_select_own"
  ON tenant_members FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

-- ─── MENU CATEGORIES ──────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_categories"
  ON menu_categories FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── MENU ITEMS ───────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_items"
  ON menu_items FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── TABLES ───────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_tables"
  ON tables FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── TABLE TOKENS ─────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_table_tokens"
  ON table_tokens FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── CUSTOMERS ────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_customers"
  ON customers FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── CUSTOMER SESSIONS ────────────────────────────────────────────────────────
-- Only accessible via service role in API routes (no direct client access)
CREATE POLICY "admin_select_own_sessions"
  ON customer_sessions FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

-- ─── OTP REQUESTS ─────────────────────────────────────────────────────────────
CREATE POLICY "admin_select_own_otps"
  ON otp_requests FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_orders"
  ON orders FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────────
CREATE POLICY "admin_all_own_order_items"
  ON order_items FOR ALL
  USING (restaurant_id = get_my_restaurant_id());

-- ─── LOYALTY ──────────────────────────────────────────────────────────────────
CREATE POLICY "admin_select_own_loyalty_visits"
  ON loyalty_visits FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "admin_select_own_loyalty_rewards"
  ON loyalty_rewards FOR SELECT
  USING (restaurant_id = get_my_restaurant_id());

CREATE POLICY "admin_update_own_loyalty_rewards"
  ON loyalty_rewards FOR UPDATE
  USING (restaurant_id = get_my_restaurant_id());
