// app/api/admin/analytics/route.ts
// Aggregated revenue + order stats for the admin dashboard.
// All figures are scoped to the admin's restaurant.
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
    // period: 'today' | '7d' | '30d' | '90d'
    const period = searchParams.get('period') ?? '7d';

    const periodDays: Record<string, number> = {
      today: 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const days = periodDays[period] ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const supabase = createAdminClient();

    // ── Revenue & order counts ──────────────────────────────────────────────
    const { data: revData, error: revErr } = await supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', since)
      .not('status', 'in', '("cancelled")');

    if (revErr) throw revErr;

    const orders = revData ?? [];
    const totalRevenue = orders
      .filter((o) => ['served', 'paid'].includes(o.status))
      .reduce((s, o) => s + Number(o.total_amount), 0);

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => ['served', 'paid'].includes(o.status)).length;
    const pendingOrders = orders.filter((o) =>
      ['pending', 'accepted', 'preparing', 'ready'].includes(o.status),
    ).length;

    // ── Daily revenue breakdown (for chart) ────────────────────────────────
    const dailyMap: Record<string, number> = {};
    orders
      .filter((o) => ['served', 'paid'].includes(o.status))
      .forEach((o) => {
        const day = o.created_at.slice(0, 10); // YYYY-MM-DD
        dailyMap[day] = (dailyMap[day] ?? 0) + Number(o.total_amount);
      });

    const dailyRevenue = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }));

    // ── Top menu items ──────────────────────────────────────────────────────
    const { data: itemData, error: itemErr } = await supabase
      .from('order_items')
      .select('item_name, quantity, subtotal, orders!inner(restaurant_id, created_at, status)')
      .eq('orders.restaurant_id', restaurantId)
      .gte('orders.created_at', since)
      .not('orders.status', 'eq', 'cancelled');

    if (itemErr) throw itemErr;

    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    (itemData ?? []).forEach((row) => {
      const name = row.item_name;
      if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
      itemMap[name].quantity += row.quantity;
      itemMap[name].revenue += Number(row.subtotal);
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((i) => ({ ...i, revenue: Number(i.revenue.toFixed(2)) }));

    // ── Loyalty stats ───────────────────────────────────────────────────────
    const { count: loyaltyVisitsCount } = await supabase
      .from('loyalty_visits')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', since);

    const { count: activeCustomers } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_guest', false)
      .gte('last_seen_at', since);

    return ok({
      period,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        completedOrders,
        pendingOrders,
        activeCustomers: activeCustomers ?? 0,
        loyaltyVisits: loyaltyVisitsCount ?? 0,
      },
      dailyRevenue,
      topItems,
    });
  } catch (e) {
    return toResponse(e);
  }
}
