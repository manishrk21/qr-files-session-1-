// Hand-written Supabase Database type, matching 001_initial_schema.sql.
// Regenerate with `supabase gen types typescript` once the schema stabilizes —
// this is kept in sync manually for now.
export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string; slug: string; name: string; description: string | null;
          phone: string | null; email: string | null; address: string | null;
          city: string | null; state: string | null; pincode: string | null;
          currency_code: string; tax_rate: number; logo_url: string | null;
          is_active: boolean; is_accepting_orders: boolean;
          loyalty_streak_target: number; loyalty_reward_description: string | null;
          created_at: string; updated_at: string; deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['restaurants']['Row']>;
        Update: Partial<Database['public']['Tables']['restaurants']['Row']>;
      };
      restaurant_branding: {
        Row: {
          id: string; restaurant_id: string; primary_color: string;
          secondary_color: string; accent_color: string; font_family: string;
          banner_url: string | null; updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['restaurant_branding']['Row']>;
        Update: Partial<Database['public']['Tables']['restaurant_branding']['Row']>;
      };
      tenant_members: {
        Row: {
          id: string; restaurant_id: string; user_id: string;
          role: 'owner' | 'admin' | 'staff'; is_active: boolean; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tenant_members']['Row']>;
        Update: Partial<Database['public']['Tables']['tenant_members']['Row']>;
      };
      menu_categories: {
        Row: {
          id: string; restaurant_id: string; name: string; display_order: number;
          is_active: boolean; created_at: string; updated_at: string; deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['menu_categories']['Row']>;
        Update: Partial<Database['public']['Tables']['menu_categories']['Row']>;
      };
      menu_items: {
        Row: {
          id: string; restaurant_id: string; category_id: string; name: string;
          description: string | null; price: number; image_url: string | null;
          food_type: 'veg' | 'non_veg' | 'egg'; is_available: boolean; is_featured: boolean;
          allergens: string[]; preparation_time_minutes: number | null; display_order: number;
          created_at: string; updated_at: string; deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['menu_items']['Row']>;
        Update: Partial<Database['public']['Tables']['menu_items']['Row']>;
      };
      tables: {
        Row: {
          id: string; restaurant_id: string; label: string; capacity: number | null;
          is_active: boolean; qr_code_url: string | null;
          created_at: string; updated_at: string; deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['tables']['Row']>;
        Update: Partial<Database['public']['Tables']['tables']['Row']>;
      };
      table_tokens: {
        Row: {
          id: string; table_id: string; restaurant_id: string; token: string;
          is_active: boolean; created_at: string; expires_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['table_tokens']['Row']>;
        Update: Partial<Database['public']['Tables']['table_tokens']['Row']>;
      };
      customers: {
        Row: {
          id: string; restaurant_id: string; mobile_number: string | null;
          google_sub: string | null; name: string | null; email: string | null;
          avatar_url: string | null; auth_provider: 'otp' | 'google' | 'guest';
          is_guest: boolean; last_seen_at: string; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['customers']['Row']>;
        Update: Partial<Database['public']['Tables']['customers']['Row']>;
      };
      customer_sessions: {
        Row: {
          id: string; customer_id: string; restaurant_id: string; session_token: string;
          is_guest: boolean; table_id: string | null; created_at: string; expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['customer_sessions']['Row']>;
        Update: Partial<Database['public']['Tables']['customer_sessions']['Row']>;
      };
      otp_requests: {
        Row: {
          id: string; mobile_number: string; restaurant_id: string; otp_hash: string;
          attempts: number; is_used: boolean; created_at: string; expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['otp_requests']['Row']>;
        Update: Partial<Database['public']['Tables']['otp_requests']['Row']>;
      };
      orders: {
        Row: {
          id: string; restaurant_id: string; customer_id: string | null;
          table_id: string | null; table_label: string | null;
          status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled' | 'cancel_requested';
          subtotal: number; tax_amount: number; total_amount: number; tax_rate_snapshot: number;
          payment_method: 'cash' | 'upi' | 'card' | 'other' | null;
          payment_status: 'unpaid' | 'paid' | 'refunded';
          special_instructions: string | null; notes: string | null;
          created_at: string; updated_at: string;
          accepted_at: string | null; ready_at: string | null;
          served_at: string | null; paid_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']>;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      order_items: {
        Row: {
          id: string; order_id: string; restaurant_id: string; menu_item_id: string | null;
          item_name: string; item_price: number; item_food_type: string;
          quantity: number; subtotal: number; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['order_items']['Row']>;
        Update: Partial<Database['public']['Tables']['order_items']['Row']>;
      };
      loyalty_visits: {
        Row: {
          id: string; customer_id: string; restaurant_id: string; order_id: string;
          visit_date: string; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['loyalty_visits']['Row']>;
        Update: Partial<Database['public']['Tables']['loyalty_visits']['Row']>;
      };
      loyalty_rewards: {
        Row: {
          id: string; customer_id: string; restaurant_id: string; streak_cycle: number;
          reward_description: string; is_redeemed: boolean;
          redeemed_at: string | null; issued_at: string;
        };
        Insert: Partial<Database['public']['Tables']['loyalty_rewards']['Row']>;
        Update: Partial<Database['public']['Tables']['loyalty_rewards']['Row']>;
      };
      rate_limit_events: {
        Row: {
          id: string; ip_address: string; endpoint: string;
          restaurant_id: string | null; created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rate_limit_events']['Row']>;
        Update: Partial<Database['public']['Tables']['rate_limit_events']['Row']>;
      };
    };
    Functions: {
      get_customer_loyalty_streak: {
        Args: { p_customer_id: string; p_restaurant_id: string };
        Returns: {
          total_visits: number; streak_target: number;
          current_cycle_visits: number; is_streak_complete: boolean;
        }[];
      };
      cleanup_expired_otps: { Args: Record<string, never>; Returns: undefined };
      cleanup_expired_sessions: { Args: Record<string, never>; Returns: undefined };
      cleanup_old_rate_limit_events: { Args: Record<string, never>; Returns: undefined };
    };
  };
}