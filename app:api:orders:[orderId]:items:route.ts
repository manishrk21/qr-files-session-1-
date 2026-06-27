// app/api/orders/[orderId]/items/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse, Errors } from '@/lib/api/response';
import { AddOrderItemsSchema } from '@/validations/auth';

export const runtime = 'nodejs';

const ADDABLE_STATUSES = ['pending', 'accepted'];

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const customerId = request.headers.get('x-customer-id');
    const restaurantId = request.headers.get('x-restaurant-id');
    if (!customerId || !restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const body = await request.json();
    const parsed = AddOrderItemsSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid items', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Fetch and verify order ownership + status
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, restaurant_id, total_amount, tax_rate_snapshot')
      .eq('id', params.orderId)
      .eq('customer_id', customerId)
      .single();

    if (!order) return err('NOT_FOUND', 'Order not found', 404);
    if (order.restaurant_id !== restaurantId) return err('FORBIDDEN', 'Restaurant mismatch', 403);
    if (!ADDABLE_STATUSES.includes(order.status)) {
      return err(
        'VALIDATION_ERROR',
        `Cannot add items to an order with status '${order.status}'`,
        422,
      );
    }

    // Validate and price the new items
    const menuItemIds = parsed.data.items.map((i) => i.menuItemId);
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name, price, food_type, is_available')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null);

    if (!menuItems) throw Errors.internal('Could not fetch menu items');
    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    const newItems = parsed.data.items.map((i) => {
      const mi = itemMap.get(i.menuItemId);
      if (!mi) throw Errors.notFound(`Menu item ${i.menuItemId}`);
      if (!mi.is_available) throw new Error(`${mi.name} is no longer available`);
      return {
        order_id: order.id,
        restaurant_id: restaurantId,
        menu_item_id: mi.id,
        item_name: mi.name,
        item_price: mi.price,
        item_food_type: mi.food_type,
        quantity: i.quantity,
        subtotal: Number((mi.price * i.quantity).toFixed(2)),
      };
    });

    const addedSubtotal = newItems.reduce((s, i) => s + i.subtotal, 0);

    // Insert new items
    const { error: insertErr } = await supabase.from('order_items').insert(newItems);
    if (insertErr) throw Errors.internal('Could not add items');

    // Recalculate order totals
    const { data: allItems } = await supabase
      .from('order_items')
      .select('subtotal')
      .eq('order_id', order.id);

    const newSubtotal = Number(
      (allItems ?? []).reduce((s, i) => s + Number(i.subtotal), 0).toFixed(2),
    );
    const taxAmount = Number((newSubtotal * (order.tax_rate_snapshot / 100)).toFixed(2));
    const newTotal = Number((newSubtotal + taxAmount).toFixed(2));

    await supabase
      .from('orders')
      .update({ subtotal: newSubtotal, tax_amount: taxAmount, total_amount: newTotal })
      .eq('id', order.id);

    return ok({
      orderId: order.id,
      addedItems: newItems.map(({ item_name, item_price, quantity, subtotal }) => ({
        name: item_name,
        price: item_price,
        quantity,
        subtotal,
      })),
      newTotal,
    });
  } catch (e) {
    return toResponse(e);
  }
}
