// app/api/admin/customers/route.ts
// Paginated customer list with loyalty stats for the admin dashboard.
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') ?? '';
    const guestFilter = searchParams.get('guests'); // 'exclude' | 'only' | null (all)

    const supabase = createAdminClient();

    let query = supabase
      .from('customers')
      .select(
        `
        id, name, mobile_number, email, avatar_url,
        auth_provider, is_guest, last_seen_at, created_at
      `,
        { count: 'exact' },
      )
      .eq('restaurant_id', restaurantId)
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (guestFilter === 'exclude') query = query.eq('is_guest', false);
    if (guestFilter === 'only') query = query.eq('is_guest', true);

    if (search) {
      // Search by name or mobile prefix
      query = query.or(
        `name.ilike.%${search}%,mobile_number.ilike.%${search}%,email.ilike.%${search}%`,
      );
    }

    const { data: customers, error, count } = await query;
    if (error) throw error;

    // Fetch loyalty visit counts for non-guest customers
    const nonGuestIds = (customers ?? [])
      .filter((c) => !c.is_guest)
      .map((c) => c.id);

    let loyaltyMap: Record<string, number> = {};
    if (nonGuestIds.length > 0) {
      const { data: visits } = await supabase
        .from('loyalty_visits')
        .select('customer_id')
        .eq('restaurant_id', restaurantId)
        .in('customer_id', nonGuestIds);

      (visits ?? []).forEach((v) => {
        loyaltyMap[v.customer_id] = (loyaltyMap[v.customer_id] ?? 0) + 1;
      });
    }

    const formatted = (customers ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      mobileNumber: c.mobile_number,
      email: c.email,
      avatarUrl: c.avatar_url,
      authProvider: c.auth_provider,
      isGuest: c.is_guest,
      totalVisits: loyaltyMap[c.id] ?? 0,
      lastSeenAt: c.last_seen_at,
      joinedAt: c.created_at,
    }));

    return ok({
      customers: formatted,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (e) {
    return toResponse(e);
  }
}
