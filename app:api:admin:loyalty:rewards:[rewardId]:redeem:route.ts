// app/api/admin/loyalty/rewards/[rewardId]/redeem/route.ts
// Staff marks a customer's pending reward as redeemed (shown the screen at the table).
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { rewardId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    // Any staff member can redeem — they're the ones standing at the table
    if (!hasPermission(role, 'orders:update_status')) {
      return err('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const supabase = createAdminClient();

    const { data: reward } = await supabase
      .from('loyalty_rewards')
      .select('id, is_redeemed, restaurant_id')
      .eq('id', params.rewardId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!reward) return err('NOT_FOUND', 'Reward not found', 404);
    if (reward.is_redeemed) return err('CONFLICT', 'Reward already redeemed', 409);

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', params.rewardId)
      .eq('restaurant_id', restaurantId)
      .select('id, is_redeemed, redeemed_at')
      .single();

    if (error || !data) throw error ?? new Error('Redeem failed');

    return ok(data);
  } catch (e) {
    return toResponse(e);
  }
}
