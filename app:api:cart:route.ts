// app/api/cart/route.ts
// Validates cart items are still available and returns the customer's current tableId.
// Called before placing an order from the cart page.
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { ValidateCartSchema } from '@/validations/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const customerId = request.headers.get('x-customer-id');
    const restaurantId = request.headers.get('x-restaurant-id');
    const tableId = request.headers.get('x-table-id') || null;
    if (!customerId || !restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const body = await request.json();
    const parsed = ValidateCartSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid cart payload', 422, parsed.error.flatten());
    }

    // Validate restaurantId matches session
    if (parsed.data.restaurantId !== restaurantId) {
      return err('FORBIDDEN', 'Restaurant mismatch', 403);
    }

    const supabase = createAdminClient();

    // Fetch and validate all menu items
    const menuItemIds = parsed.data.items.map((i) => i.menuItemId);
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('id, name, price, food_type, is_available')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null);

    if (error) throw error;

    const itemMap = new Map((menuItems ?? []).map((m) => [m.id, m]));
    const unavailable: string[] = [];
    const notFound: string[] = [];

    const validatedItems = parsed.data.items.map((i) => {
      const mi = itemMap.get(i.menuItemId);
      if (!mi) { notFound.push(i.menuItemId); return null; }
      if (!mi.is_available) { unavailable.push(mi.name); return null; }
      return {
        menuItemId: mi.id,
        name: mi.name,
        price: mi.price,
        foodType: mi.food_type,
        quantity: i.quantity,
        subtotal: Number((mi.price * i.quantity).toFixed(2)),
      };
    });

    if (notFound.length > 0) {
      return err('NOT_FOUND', `Menu items not found: ${notFound.join(', ')}`, 404);
    }
    if (unavailable.length > 0) {
      return err('VALIDATION_ERROR', `Items no longer available: ${unavailable.join(', ')}`, 422);
    }

    const subtotal = Number(
      (validatedItems as NonNullable<typeof validatedItems[0]>[])
        .reduce((s, i) => s + i!.subtotal, 0)
        .toFixed(2),
    );

    return ok({
      tableId,
      items: validatedItems,
      subtotal,
    });
  } catch (e) {
    return toResponse(e);
  }
}
