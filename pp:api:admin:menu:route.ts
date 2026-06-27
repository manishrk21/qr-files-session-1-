// app/api/admin/menu/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, created, toResponse, Errors } from '@/lib/api/response';
import { CreateMenuItemSchema } from '@/validations/auth';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id, name, description, price, image_url,
        food_type, is_available, is_featured,
        allergens, preparation_time_minutes, display_order,
        category_id,
        menu_categories ( id, name )
      `)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return ok({ items: data ?? [] });
  } catch (e) {
    return toResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:create')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const body = await request.json();
    const parsed = CreateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid menu item', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Verify category belongs to this restaurant
    const { data: cat } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('id', parsed.data.categoryId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!cat) return err('NOT_FOUND', 'Category not found', 404);

    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        food_type: parsed.data.foodType,
        is_available: parsed.data.isAvailable,
        is_featured: parsed.data.isFeatured,
        allergens: parsed.data.allergens,
        preparation_time_minutes: parsed.data.preparationTimeMinutes ?? null,
        display_order: parsed.data.displayOrder,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Broadcast menu change via Realtime
    await supabase.channel(`restaurant:${restaurantId}:menu`).send({
      type: 'broadcast',
      event: 'menu_updated',
      payload: { action: 'created', itemId: item.id },
    });

    return created(item);
  } catch (e) {
    return toResponse(e);
  }
}
