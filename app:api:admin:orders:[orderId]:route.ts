// app/api/admin/orders/[orderId]/route.ts
// GET full order detail for admin view.
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, status, table_label, table_id,
        subtotal, tax_amount, total_amount, tax_rate_snapshot,
        payment_method, payment_status,
        special_instructions, notes,
        created_at, updated_at, accepted_at, ready_at, served_at, paid_at,
        customer_id,
        order_items (
          id, item_name, item_price, item_food_type, quantity, subtotal
        )
      `)
      .eq('id', params.orderId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !order) return err('NOT_FOUND', 'Order not found', 404);

    // Optionally attach customer info
    let customer: { name: string | null; mobileNumber: string | null; isGuest: boolean } | null = null;
    if (order.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('name, mobile_number, is_guest')
        .eq('id', order.customer_id)
        .single();
      if (cust) {
        customer = {
          name: cust.name,
          mobileNumber: cust.is_guest ? null : cust.mobile_number,
          isGuest: cust.is_guest,
        };
      }
    }

    const history = [{ status: 'pending', at: order.created_at }];
    if (order.accepted_at) history.push({ status: 'accepted', at: order.accepted_at });
    if (order.ready_at) history.push({ status: 'ready', at: order.ready_at });
    if (order.served_at) history.push({ status: 'served', at: order.served_at });
    if (order.paid_at) history.push({ status: 'paid', at: order.paid_at });

    return ok({
      orderId: order.id,
      status: order.status,
      tableLabel: order.table_label,
      customer,
      items: order.order_items,
      summary: {
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        taxRate: order.tax_rate_snapshot,
        total: order.total_amount,
      },
      payment: {
        method: order.payment_method,
        status: order.payment_status,
      },
      specialInstructions: order.special_instructions,
      notes: order.notes,
      statusHistory: history,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    });
  } catch (e) {
    return toResponse(e);
  }
}
