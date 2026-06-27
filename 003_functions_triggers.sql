-- ============================================================
-- 003_functions_triggers.sql
-- Database functions and triggers.
-- Note: Jarvis AI removed — no ai_* functions needed.
-- Loyalty triggers only fire for non-guest customers.
-- ============================================================

-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_tables_updated_at
  BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── ORDER TOTAL VALIDATION ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_order_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF ABS((NEW.subtotal * (1 + NEW.tax_rate_snapshot / 100)) - NEW.total_amount) > 0.02 THEN
    RAISE EXCEPTION
      'Order total mismatch: subtotal=% tax_rate=% expected≈% got=%',
      NEW.subtotal, NEW.tax_rate_snapshot,
      ROUND(NEW.subtotal * (1 + NEW.tax_rate_snapshot / 100), 2),
      NEW.total_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_order_totals
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_totals();

-- ─── ORDER STATUS TIMESTAMP STAMPS ───────────────────────────────────────────
-- Automatically stamps lifecycle timestamps as status transitions happen.
CREATE OR REPLACE FUNCTION stamp_order_status_times()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at = NOW();
  END IF;
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    NEW.ready_at = NOW();
  END IF;
  IF NEW.status = 'served' AND OLD.status != 'served' THEN
    NEW.served_at = NOW();
  END IF;
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at = NOW();
    NEW.payment_status = 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stamp_order_status_times
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION stamp_order_status_times();

-- ─── LOYALTY VISIT INSERTION ──────────────────────────────────────────────────
-- Fires when an order reaches 'served' or 'paid'.
-- Skips guest customers (is_guest = true) — they cannot earn loyalty.
CREATE OR REPLACE FUNCTION record_loyalty_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_is_guest BOOLEAN;
BEGIN
  IF NEW.status IN ('served', 'paid')
     AND OLD.status NOT IN ('served', 'paid')
     AND NEW.customer_id IS NOT NULL
  THEN
    -- Only non-guest customers earn loyalty
    SELECT is_guest INTO v_is_guest
    FROM customers WHERE id = NEW.customer_id;

    IF NOT v_is_guest THEN
      INSERT INTO loyalty_visits (customer_id, restaurant_id, order_id, visit_date)
      VALUES (NEW.customer_id, NEW.restaurant_id, NEW.id, CURRENT_DATE)
      ON CONFLICT (customer_id, restaurant_id, visit_date) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_record_loyalty_visit
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION record_loyalty_visit();

-- ─── LOYALTY REWARD ISSUANCE ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION maybe_issue_loyalty_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_streak_target INT;
  v_reward_desc   TEXT;
  v_visit_count   INT;
  v_cycle         INT;
BEGIN
  SELECT loyalty_streak_target, loyalty_reward_description
  INTO v_streak_target, v_reward_desc
  FROM restaurants WHERE id = NEW.restaurant_id;

  SELECT COUNT(*) INTO v_visit_count
  FROM loyalty_visits
  WHERE customer_id = NEW.customer_id
    AND restaurant_id = NEW.restaurant_id;

  IF v_visit_count % v_streak_target = 0 THEN
    v_cycle := v_visit_count / v_streak_target;
    INSERT INTO loyalty_rewards (customer_id, restaurant_id, streak_cycle, reward_description)
    VALUES (
      NEW.customer_id, NEW.restaurant_id, v_cycle,
      COALESCE(v_reward_desc, 'Loyalty reward for completing the streak!')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_maybe_issue_loyalty_reward
  AFTER INSERT ON loyalty_visits
  FOR EACH ROW EXECUTE FUNCTION maybe_issue_loyalty_reward();

-- ─── CLEANUP (called by worker cron) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
  DELETE FROM otp_requests WHERE expires_at < NOW();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
  DELETE FROM customer_sessions WHERE expires_at < NOW();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_events()
RETURNS void AS $$
  DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '24 hours';
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── COMPUTED LOYALTY STREAK ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_loyalty_streak(
  p_customer_id   UUID,
  p_restaurant_id UUID
)
RETURNS TABLE (
  total_visits        INT,
  streak_target       INT,
  current_cycle_visits INT,
  is_streak_complete  BOOLEAN
) AS $$
DECLARE
  v_streak_target INT;
BEGIN
  SELECT loyalty_streak_target INTO v_streak_target
  FROM restaurants WHERE id = p_restaurant_id;

  RETURN QUERY
  SELECT
    COUNT(*)::INT                                            AS total_visits,
    v_streak_target                                          AS streak_target,
    (COUNT(*) % v_streak_target)::INT                        AS current_cycle_visits,
    (COUNT(*) % v_streak_target = 0 AND COUNT(*) > 0)        AS is_streak_complete
  FROM loyalty_visits
  WHERE customer_id = p_customer_id
    AND restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─── ORDER STATE MACHINE VALIDATION ──────────────────────────────────────────
-- Returns allowed next statuses for a given current status (used in API layer).
CREATE OR REPLACE FUNCTION allowed_next_statuses(current_status TEXT)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE current_status
    WHEN 'pending'          THEN ARRAY['accepted', 'cancelled']
    WHEN 'accepted'         THEN ARRAY['preparing', 'cancelled']
    WHEN 'preparing'        THEN ARRAY['ready']
    WHEN 'ready'            THEN ARRAY['served']
    WHEN 'served'           THEN ARRAY['paid']
    WHEN 'paid'             THEN ARRAY[]::TEXT[]
    WHEN 'cancelled'        THEN ARRAY[]::TEXT[]
    WHEN 'cancel_requested' THEN ARRAY['cancelled', 'accepted']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
