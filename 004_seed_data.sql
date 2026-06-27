-- ============================================================
-- 004_seed_data.sql
-- Development seed — one demo restaurant.
-- Do NOT run in production.
-- ============================================================

DO $$
DECLARE
  v_restaurant_id UUID := uuid_generate_v4();
  v_cat_chai      UUID := uuid_generate_v4();
  v_cat_food      UUID := uuid_generate_v4();
  v_table1_id     UUID := uuid_generate_v4();
  v_table2_id     UUID := uuid_generate_v4();
BEGIN

  -- Restaurant
  INSERT INTO restaurants (
    id, slug, name, description, phone, email,
    city, state, currency_code, tax_rate,
    is_active, is_accepting_orders,
    loyalty_streak_target, loyalty_reward_description
  ) VALUES (
    v_restaurant_id,
    'demo-cafe',
    'Demo Café',
    'A friendly neighbourhood café for testing',
    '+919800000000',
    'owner@democafe.in',
    'Mumbai', 'Maharashtra', 'INR', 5.00,
    true, true,
    5, 'Free coffee on your next visit!'
  );

  -- Branding
  INSERT INTO restaurant_branding (restaurant_id, primary_color, accent_color, font_family)
  VALUES (v_restaurant_id, '#1a1a2e', '#f59e0b', 'Inter');

  -- Categories
  INSERT INTO menu_categories (id, restaurant_id, name, display_order)
  VALUES
    (v_cat_chai, v_restaurant_id, 'Chai & Beverages', 0),
    (v_cat_food, v_restaurant_id, 'Snacks & Bites', 1);

  -- Menu items
  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, food_type, allergens, preparation_time_minutes, is_featured)
  VALUES
    (v_restaurant_id, v_cat_chai, 'Masala Chai',      'Classic spiced chai',         49.00, 'veg',     ARRAY['dairy'], 5,  true),
    (v_restaurant_id, v_cat_chai, 'Cold Coffee',       'Iced coffee with milk',       89.00, 'veg',     ARRAY['dairy'], 3,  false),
    (v_restaurant_id, v_cat_chai, 'Fresh Lime Soda',   'Chilled lime with soda',      59.00, 'veg',     ARRAY[]::TEXT[], 2, false),
    (v_restaurant_id, v_cat_food, 'Veg Sandwich',      'Grilled veg sandwich',        99.00, 'veg',     ARRAY['gluten'], 8, true),
    (v_restaurant_id, v_cat_food, 'Chicken Puff',      'Flaky pastry with chicken',   79.00, 'non_veg', ARRAY['gluten'], 5, false),
    (v_restaurant_id, v_cat_food, 'Egg Bhurji Toast',  'Scrambled eggs on toast',     89.00, 'egg',     ARRAY['gluten','dairy'], 7, false);

  -- Tables
  INSERT INTO tables (id, restaurant_id, label, capacity, is_active)
  VALUES
    (v_table1_id, v_restaurant_id, 'Table 1', 4, true),
    (v_table2_id, v_restaurant_id, 'Table 2', 2, true);

  -- Table tokens (static for dev; regenerated in production via admin panel)
  INSERT INTO table_tokens (table_id, restaurant_id, token, is_active)
  VALUES
    (v_table1_id, v_restaurant_id, 'dev-token-table-1', true),
    (v_table2_id, v_restaurant_id, 'dev-token-table-2', true);

END $$;
