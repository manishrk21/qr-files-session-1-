// app/api/admin/customers/[customerId]/loyalty/route.ts
// Lets staff look up a customer's streak + pending rewards before redeeming one.
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, is_guest')
      .eq('id', params.customerId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!customer) return err('NOT_FOUND', 'Customer not found', 404);
    if (customer.is_guest) return ok({ isGuest: true, pendingRewards: [] });

    const { data: streak } = await supabase
      .rpc('get_customer_loyalty_streak', {
        p_customer_id: params.customerId,
        p_restaurant_id: restaurantId,
      })
      .single();

    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('id, streak_cycle, reward_description, is_redeemed, issued_at, redeemed_at')
      .eq('customer_id', params.customerId)
      .eq('restaurant_id', restaurantId)
      .eq('is_redeemed', false)
      .order('issued_at', { ascending: true });

    return ok({
      isGuest: false,
      customerName: customer.name,
      totalVisits: streak?.total_visits ?? 0,
      streakTarget: streak?.streak_target ?? 5,
      pendingRewards: rewards ?? [],
    });
  } catch (e) {
    return toResponse(e);
  }
}
