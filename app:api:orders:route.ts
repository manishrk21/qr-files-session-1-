// app/api/orders/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse, Errors } from '@/lib/api/response';
import { CreateOrderSchema } from '@/validations/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Auth from middleware headers
    const customerId = request.headers.get('x-customer-id');
    const restaurantId = request.headers.get('x-restaurant-id');
    if (!customerId || !restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid order payload', 422, parsed.error.flatten());
    }

    const { tableId, items, specialInstructions } = parsed.data;

    // Validate restaurantId matches session
    if (parsed.data.restaurantId !== restaurantId) {
      return err('FORBIDDEN', 'Restaurant mismatch', 403);
    }

    const supabase = createAdminClient();

    // 1. Check restaurant is accepting orders
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, is_accepting_orders, tax_rate, currency_code')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) throw Errors.notFound('Restaurant');
    if (!restaurant.is_accepting_orders) throw Errors.restaurantClosed();

    // 2. Validate table belongs to this restaurant
    const { data: table } = await supabase
      .from('tables')
      .select('id, label')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!table) return err('NOT_FOUND', 'Table not found', 404);

    // 3. Fetch menu items and validate availability + prices (NEVER trust client)
    const menuItemIds = items.map((i) => i.menuItemId);
    const { data: menuItems, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, price, food_type, is_available')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null);

    if (menuErr || !menuItems) throw Errors.internal('Could not fetch menu items');

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));
    const unavailable: string[] = [];

    const orderItems = items.map((i) => {
      const mi = itemMap.get(i.menuItemId);
      if (!mi) throw Errors.notFound(`Menu item ${i.menuItemId}`);
      if (!mi.is_available) unavailable.push(mi.name);
      return {
        menu_item_id: mi.id,
        item_name: mi.name,
        item_price: mi.price,
        item_food_type: mi.food_type,
        quantity: i.quantity,
        subtotal: Number((mi.price * i.quantity).toFixed(2)),
      };
    });

    if (unavailable.length > 0) {
      return err('VALIDATION_ERROR', `Some items are unavailable: ${unavailable.join(', ')}`, 422);
    }

    // 4. Compute totals server-side
    const subtotal = Number(orderItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const taxRate = restaurant.tax_rate;
    const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // 5. Insert order + items in a transaction via RPC
    // (Supabase doesn't expose multi-table transactions directly; use a PG function or two inserts)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_id: customerId,
        table_id: tableId,
        table_label: table.label,
        status: 'pending',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        tax_rate_snapshot: taxRate,
        special_instructions: specialInstructions ?? null,
      })
      .select('id, created_at')
      .single();

    if (orderErr || !order) {
      console.error('Order insert error:', orderErr);
      throw Errors.internal('Could not create order');
    }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      orderItems.map((i) => ({
        order_id: order.id,
        restaurant_id: restaurantId,
        ...i,
      })),
    );

    if (itemsErr) {
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id);
      throw Errors.internal('Could not save order items');
    }

    // 6. Broadcast to admin via Supabase Realtime channel
    await supabase.channel(`restaurant:${restaurantId}:orders`).send({
      type: 'broadcast',
      event: 'new_order',
      payload: { orderId: order.id, tableLabel: table.label, total: totalAmount },
    });

    return ok(
      {
        orderId: order.id,
        status: 'pending',
        items: orderItems,
        summary: { subtotal, taxRate, taxAmount, total: totalAmount },
        createdAt: order.created_at,
      },
      201,
    );
  } catch (e) {
    return toResponse(e);
  }
}
