// app/api/admin/orders/[orderId]/status/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse, Errors } from '@/lib/api/response';
import { UpdateOrderStatusSchema } from '@/validations/auth';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

// Allowed transitions (mirrors the SQL function allowed_next_statuses)
const TRANSITIONS: Record<string, string[]> = {
  pending:          ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  preparing:        ['ready'],
  ready:            ['served'],
  served:           ['paid'],
  cancel_requested: ['cancelled', 'accepted'],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const adminRestaurantId = request.headers.get('x-admin-restaurant-id');
    const adminRole = request.headers.get('x-admin-role') as AdminRole | null;
    if (!adminRestaurantId || !adminRole) return err('UNAUTHORIZED', 'Admin session required', 401);

    if (!hasPermission(adminRole, 'orders:update_status')) {
      return err('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const parsed = UpdateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid status update', 422, parsed.error.flatten());
    }

    const { status: newStatus, paymentMethod, notes } = parsed.data;
    const supabase = createAdminClient();

    // Fetch order — must belong to admin's restaurant
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, restaurant_id, payment_status')
      .eq('id', params.orderId)
      .eq('restaurant_id', adminRestaurantId)
      .single();

    if (!order) return err('NOT_FOUND', 'Order not found', 404);

    // State machine validation
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return err(
        'VALIDATION_ERROR',
        `Cannot transition from '${order.status}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
        422,
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'paid') {
      if (!paymentMethod) {
        return err('VALIDATION_ERROR', 'paymentMethod is required when marking as paid', 422);
      }
      updatePayload.payment_method = paymentMethod;
      updatePayload.payment_status = 'paid';
      updatePayload.paid_at = new Date().toISOString();
    }

    if (notes !== undefined) updatePayload.notes = notes;

    const { data: updated, error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', params.orderId)
      .select('id, status, payment_status, updated_at')
      .single();

    if (updateErr || !updated) throw Errors.internal('Could not update order status');

    // Realtime broadcast to customer channel
    await supabase.channel(`order:${params.orderId}`).send({
      type: 'broadcast',
      event: 'status_update',
      payload: { orderId: params.orderId, status: newStatus },
    });

    return ok({
      orderId: updated.id,
      status: updated.status,
      paymentStatus: updated.payment_status,
      updatedAt: updated.updated_at,
    });
  } catch (e) {
    return toResponse(e);
  }
}
