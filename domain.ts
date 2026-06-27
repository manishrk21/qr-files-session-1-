// types/domain.ts
// Business domain types. Keep in sync with the DB schema.

export type FoodType = 'veg' | 'non_veg' | 'egg';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'paid'
  | 'cancelled'
  | 'cancel_requested';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';
export type AdminRole = 'owner' | 'admin' | 'staff';
export type AuthProvider = 'otp' | 'google' | 'guest';

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  currency_code: string;
  tax_rate: number;
  logo_url: string | null;
  is_active: boolean;
  is_accepting_orders: boolean;
  loyalty_streak_target: number;
  loyalty_reward_description: string | null;
  branding?: RestaurantBranding;
}

export interface RestaurantBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  banner_url: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: FoodType;
  is_available: boolean;
  is_featured: boolean;
  allergens: string[];
  preparation_time_minutes: number | null;
  display_order: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  food_type: FoodType;
  image_url: string | null;
}

export interface OrderSummary {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  table_id: string | null;
  table_label: string | null;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  paid_at: string | null;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  menu_item_id: string | null;
  item_name: string;
  item_price: number;
  item_food_type: FoodType;
  quantity: number;
  subtotal: number;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  mobile_number: string | null;
  google_sub: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  auth_provider: AuthProvider;
  is_guest: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface LoyaltyStatus {
  customer_id: string;
  total_visits: number;
  streak_target: number;
  current_cycle_visits: number;
  is_streak_complete: boolean;
  pending_rewards: LoyaltyReward[];
  completed_cycles: number;
}

export interface LoyaltyReward {
  id: string;
  streak_cycle: number;
  reward_description: string;
  is_redeemed: boolean;
  issued_at: string;
}

// Customer session context (attached to request headers by middleware)
export interface CustomerContext {
  customerId: string;
  restaurantId: string;
  tableId: string | null;
  isGuest: boolean;
}

export interface AdminContext {
  userId: string;
  restaurantId: string;
  role: AdminRole;
}
