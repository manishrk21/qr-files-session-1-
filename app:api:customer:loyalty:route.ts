// app/api/customer/loyalty/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const customerId = request.headers.get('x-customer-id');
    const restaurantId = request.headers.get('x-restaurant-id');
    if (!customerId || !restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const supabase = createAdminClient();

    // Check if this is a guest session — guests cannot earn loyalty
    const { data: customer } = await supabase
      .from('customers')
      .select('id, is_guest, name, auth_provider')
      .eq('id', customerId)
      .single();

    if (!customer) return err('NOT_FOUND', 'Customer not found', 404);

    if (customer.is_guest) {
      // Return a sentinel that the UI uses to show the "Login to reveal rewards" prompt
      return ok({ isGuest: true, customerId });
    }

    // Compute streak via DB function
    const { data: streak, error: streakErr } = await supabase
      .rpc('get_customer_loyalty_streak', {
        p_customer_id: customerId,
        p_restaurant_id: restaurantId,
      })
      .single();

    if (streakErr) throw streakErr;

    // Fetch pending (unredeemed) rewards
    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('id, streak_cycle, reward_description, is_redeemed, issued_at')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurantId)
      .eq('is_redeemed', false)
      .order('issued_at', { ascending: true });

    const completedCycles = streak
      ? Math.floor(streak.total_visits / streak.streak_target)
      : 0;

    return ok({
      isGuest: false,
      customerId,
      totalVisits: streak?.total_visits ?? 0,
      streakTarget: streak?.streak_target ?? 5,
      currentCycleVisits: streak?.current_cycle_visits ?? 0,
      isStreakComplete: streak?.is_streak_complete ?? false,
      completedCycles,
      pendingRewards: rewards ?? [],
    });
  } catch (e) {
    return toResponse(e);
  }
}
