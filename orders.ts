// apps/worker/src/services/orders.ts
// Reverts orders stuck in 'cancel_requested' for too long back to 'accepted',
// so a customer's cancellation request can't silently block the kitchen forever
// if staff never act on it.
import { createClient } from '../lib/supabase';

const STALE_AFTER_MINUTES = 15;

export async function revertStaleCancelRequests(): Promise<{ reverted: number }> {
  const supabase = createClient();
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();

  const { data: stale, error: fetchErr } = await supabase
    .from('orders')
    .select('id, restaurant_id')
    .eq('status', 'cancel_requested')
    .lt('updated_at', cutoff);

  if (fetchErr) {
    console.error('[cron] Could not fetch stale cancel_requested orders:', fetchErr);
    return { reverted: 0 };
  }

  if (!stale || stale.length === 0) return { reverted: 0 };

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'accepted' })
    .in('id', stale.map((o) => o.id));

  if (updateErr) {
    console.error('[cron] Could not revert stale cancel_requested orders:', updateErr);
    return { reverted: 0 };
  }

  // Notify each affected order's customer tracking page and admin board.
  // We create a channel per-order, subscribe (required by Supabase before send),
  // broadcast, then immediately remove the channel.
  for (const order of stale) {
    // Customer order tracking channel
    const orderChannel = supabase.channel(`order:${order.id}`);
    await orderChannel.subscribe();
    await orderChannel.send({
      type: 'broadcast',
      event: 'status_update',
      payload: { orderId: order.id, status: 'accepted' },
    });
    await supabase.removeChannel(orderChannel);

    // Admin orders board channel
    const adminChannel = supabase.channel(`restaurant:${order.restaurant_id}:orders`);
    await adminChannel.subscribe();
    await adminChannel.send({
      type: 'broadcast',
      event: 'cancel_request_reverted',
      payload: { orderId: order.id, status: 'accepted' },
    });
    await supabase.removeChannel(adminChannel);
  }

  console.log(`[cron] Reverted ${stale.length} stale cancel_requested order(s) → accepted`);
  return { reverted: stale.length };
}
