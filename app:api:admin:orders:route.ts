// app/api/admin/orders/route.ts
// Returns paginated order list for the admin's restaurant.
// Supports filtering by status and date range.
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
    const status = searchParams.get('status');            // single status filter
    const date = searchParams.get('date');                // YYYY-MM-DD (local restaurant date)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    let query = supabase
      .from('orders')
      .select(
        `
        id, status, table_label, subtotal, tax_amount, total_amount,
        payment_method, payment_status,
        special_instructions, notes, created_at, updated_at,
        accepted_at, ready_at, served_at, paid_at,
        order_items (
          id, item_name, item_price, item_food_type, quantity, subtotal
        )
      `,
        { count: 'exact' },
      )
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (date) {
      // Filter orders created on the given calendar date (UTC day boundary)
      const start = new Date(`${date}T00:00:00.000Z`).toISOString();
      const end = new Date(`${date}T23:59:59.999Z`).toISOString();
      query = query.gte('created_at', start).lte('created_at', end);
    }

    const { data: orders, error, count } = await query;

    if (error) throw error;

    return ok({
      orders: orders ?? [],
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
