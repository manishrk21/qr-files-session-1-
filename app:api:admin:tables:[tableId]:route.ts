// app/api/admin/tables/[tableId]/route.ts
// PUT — update table (label, capacity, active status)
// DELETE — soft-delete table and deactivate its tokens
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

const UpdateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { tableId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'tables:*')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const body = await request.json();
    const parsed = UpdateTableSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid table update', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    const update: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) update.label = parsed.data.label;
    if (parsed.data.capacity !== undefined) update.capacity = parsed.data.capacity;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;

    if (Object.keys(update).length === 0) {
      return err('VALIDATION_ERROR', 'No fields to update', 422);
    }

    const { data, error } = await supabase
      .from('tables')
      .update(update)
      .eq('id', params.tableId)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .select('id, label, capacity, is_active, qr_code_url')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return err('CONFLICT', `Table label '${parsed.data.label}' already exists`, 409);
      }
      return err('NOT_FOUND', 'Table not found', 404);
    }

    // If deactivating the table, also deactivate its tokens
    if (parsed.data.isActive === false) {
      await supabase
        .from('table_tokens')
        .update({ is_active: false })
        .eq('table_id', params.tableId)
        .eq('restaurant_id', restaurantId);
    }

    return ok(data);
  } catch (e) {
    return toResponse(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'tables:*')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const supabase = createAdminClient();

    // Deactivate all tokens first
    await supabase
      .from('table_tokens')
      .update({ is_active: false })
      .eq('table_id', params.tableId)
      .eq('restaurant_id', restaurantId);

    // Soft delete the table
    const { error } = await supabase
      .from('tables')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', params.tableId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    return ok({ deleted: true });
  } catch (e) {
    return toResponse(e);
  }
}
