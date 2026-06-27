// app/api/admin/menu/categories/[categoryId]/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { categoryId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:update')) {
      return err('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid category update', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.displayOrder !== undefined) update.display_order = parsed.data.displayOrder;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;

    if (Object.keys(update).length === 0) {
      return err('VALIDATION_ERROR', 'No fields to update', 422);
    }

    const { data, error } = await supabase
      .from('menu_categories')
      .update(update)
      .eq('id', params.categoryId)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .select('id, name, display_order, is_active')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return err('CONFLICT', `Category "${parsed.data.name}" already exists`, 409);
      }
      return err('NOT_FOUND', 'Category not found', 404);
    }

    return ok(data);
  } catch (e) {
    return toResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { categoryId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:delete')) {
      return err('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const supabase = createAdminClient();

    // Check that no active (non-deleted) menu items reference this category
    const { count, error: countErr } = await supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', params.categoryId)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null);

    if (countErr) throw countErr;

    if ((count ?? 0) > 0) {
      return err(
        'CONFLICT',
        `Cannot delete this category — it still has ${count} active item${count === 1 ? '' : 's'}. Move or delete the items first.`,
        409,
      );
    }

    // Soft delete
    const { error } = await supabase
      .from('menu_categories')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', params.categoryId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    return ok({ deleted: true });
  } catch (e) {
    return toResponse(e);
  }
}
