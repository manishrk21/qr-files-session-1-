// app/api/admin/menu/[itemId]/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse, Errors } from '@/lib/api/response';
import { UpdateMenuItemSchema } from '@/validations/auth';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:update')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const body = await request.json();
    const parsed = UpdateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid update payload', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Build update, mapping camelCase to snake_case
    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.price !== undefined) update.price = parsed.data.price;
    if (parsed.data.foodType !== undefined) update.food_type = parsed.data.foodType;
    if (parsed.data.isAvailable !== undefined) update.is_available = parsed.data.isAvailable;
    if (parsed.data.isFeatured !== undefined) update.is_featured = parsed.data.isFeatured;
    if (parsed.data.allergens !== undefined) update.allergens = parsed.data.allergens;
    if (parsed.data.preparationTimeMinutes !== undefined) update.preparation_time_minutes = parsed.data.preparationTimeMinutes;
    if (parsed.data.displayOrder !== undefined) update.display_order = parsed.data.displayOrder;
    if (parsed.data.categoryId !== undefined) update.category_id = parsed.data.categoryId;

    const { data, error } = await supabase
      .from('menu_items')
      .update(update)
      .eq('id', params.itemId)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) return err('NOT_FOUND', 'Menu item not found', 404);

    // Broadcast availability change (most common mutation from admin)
    if ('is_available' in update) {
      await supabase.channel(`restaurant:${restaurantId}:menu`).send({
        type: 'broadcast',
        event: 'availability_changed',
        payload: { itemId: data.id, isAvailable: data.is_available },
      });
    }

    return ok(data);
  } catch (e) {
    return toResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:delete')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const supabase = createAdminClient();

    // Soft delete
    const { error } = await supabase
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString(), is_available: false })
      .eq('id', params.itemId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    return ok({ deleted: true });
  } catch (e) {
    return toResponse(e);
  }
}
