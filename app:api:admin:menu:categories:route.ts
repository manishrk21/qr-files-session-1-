// app/api/admin/menu/categories/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, created, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import { CreateMenuCategorySchema } from '@/validations/auth';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    if (!restaurantId) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .select('id, name, display_order, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return ok({ categories: data ?? [] });
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
    const parsed = CreateMenuCategorySchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid category data', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: parsed.data.name,
        display_order: parsed.data.displayOrder,
      })
      .select('id, name, display_order, is_active')
      .single();

    if (error) {
      if (error.code === '23505') {
        return err('CONFLICT', `Category "${parsed.data.name}" already exists`, 409);
      }
      throw error;
    }

    return created(data);
  } catch (e) {
    return toResponse(e);
  }
}
