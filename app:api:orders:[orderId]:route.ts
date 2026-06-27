// app/api/orders/[orderId]/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const customerId = request.headers.get('x-customer-id');
    if (!customerId) return err('UNAUTHORIZED', 'No active session', 401);

    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, status, subtotal, tax_amount, total_amount,
        special_instructions, created_at, updated_at,
        accepted_at, ready_at, served_at, paid_at,
        table_label,
        order_items (
          id, item_name, item_price, item_food_type, quantity, subtotal
        )
      `)
      .eq('id', params.orderId)
      .eq('customer_id', customerId)  // customers can only see their own orders
      .single();

    if (error || !order) return err('NOT_FOUND', 'Order not found', 404);

    // Build status history from timestamps
    const history: { status: string; at: string }[] = [
      { status: 'pending', at: order.created_at },
    ];
    if (order.accepted_at) history.push({ status: 'accepted', at: order.accepted_at });
    if (order.ready_at) history.push({ status: 'ready', at: order.ready_at });
    if (order.served_at) history.push({ status: 'served', at: order.served_at });
    if (order.paid_at) history.push({ status: 'paid', at: order.paid_at });

    return ok({
      orderId: order.id,
      status: order.status,
      tableLabel: order.table_label,
      statusHistory: history,
      items: order.order_items,
      summary: {
        subtotal: order.subtotal,
        taxAmount: order.tax_amount,
        total: order.total_amount,
      },
      specialInstructions: order.special_instructions,
      createdAt: order.created_at,
    });
  } catch (e) {
    return toResponse(e);
  }
}
