// app/api/orders/[orderId]/cancel/route.ts
// Customer-initiated cancellation request.
// Customers can't cancel directly — they request it, and admin staff approve/deny
// via the existing /api/admin/orders/[orderId]/status transition (cancel_requested -> cancelled | accepted).
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse, Errors } from '@/lib/api/response';

export const runtime = 'nodejs';

// Only orders that haven't started being prepared can be cancel-requested.
// Once 'preparing' or beyond, the kitchen has already committed resources.
const CANCELLABLE_STATUSES = ['pending', 'accepted'];

const CancelRequestSchema = z.object({
  reason: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const customerId = request.headers.get('x-customer-id');
    const restaurantId = request.headers.get('x-restaurant-id');
    if (!customerId || !restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const body = await request.json().catch(() => ({}));
    const parsed = CancelRequestSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid cancellation request', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Ownership + restaurant scoping enforced via customer_id match
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, restaurant_id, notes')
      .eq('id', params.orderId)
      .eq('customer_id', customerId)
      .single();

    if (!order) return err('NOT_FOUND', 'Order not found', 404);
    if (order.restaurant_id !== restaurantId) return err('FORBIDDEN', 'Restaurant mismatch', 403);

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return err(
        'VALIDATION_ERROR',
        `This order can no longer be cancelled (current status: '${order.status}'). The kitchen has already started preparing it — please ask your server.`,
        422,
      );
    }

    const noteAppend = parsed.data.reason
      ? `[Cancellation requested by customer: ${parsed.data.reason}]`
      : '[Cancellation requested by customer]';
    const newNotes = order.notes ? `${order.notes}\n${noteAppend}` : noteAppend;

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'cancel_requested', notes: newNotes })
      .eq('id', order.id)
      .select('id, status, updated_at')
      .single();

    if (updateErr || !updated) throw Errors.internal('Could not request cancellation');

    // Notify the customer's own tracking page (in case multiple tabs/devices)
    await supabase.channel(`order:${order.id}`).send({
      type: 'broadcast',
      event: 'status_update',
      payload: { orderId: order.id, status: 'cancel_requested' },
    });

    // Notify the admin board so staff see it immediately — distinct event name
    // from new_order so the board can toast it differently.
    await supabase.channel(`restaurant:${restaurantId}:orders`).send({
      type: 'broadcast',
      event: 'cancel_requested',
      payload: { orderId: order.id },
    });

    return ok({
      orderId: updated.id,
      status: updated.status,
      updatedAt: updated.updated_at,
    });
  } catch (e) {
    return toResponse(e);
  }
}
