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

  // Notify each affected order's customer + admin board
  for (const order of stale) {
    await supabase.channel(`order:${order.id}`).send({
      type: 'broadcast',
      event: 'status_update',
      payload: { orderId: order.id, status: 'accepted' },
    });
  }

  return { reverted: stale.length };
}