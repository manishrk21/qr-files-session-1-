// app/api/admin/tables/route.ts
import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateTableToken } from '@/lib/crypto';
import { ok, err, created, toResponse } from '@/lib/api/response';
import { CreateTableSchema } from '@/validations/auth';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    if (!restaurantId) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('tables')
      .select('id, label, capacity, is_active, qr_code_url, created_at')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('label', { ascending: true });

    if (error) throw error;
    return ok({ tables: data ?? [] });
  } catch (e) {
    return toResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'tables:*')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const body = await request.json();
    const parsed = CreateTableSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid table data', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Get restaurant slug for QR URL
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) return err('NOT_FOUND', 'Restaurant not found', 404);

    // Create the table
    const { data: table, error: tableErr } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        label: parsed.data.label,
        capacity: parsed.data.capacity ?? null,
      })
      .select('id')
      .single();

    if (tableErr || !table) {
      if (tableErr?.code === '23505') {
        return err('CONFLICT', `Table '${parsed.data.label}' already exists`, 409);
      }
      throw tableErr;
    }

    // Generate signed token
    const token = generateTableToken(restaurantId, table.id);

    // Store token in DB
    await supabase.from('table_tokens').insert({
      table_id: table.id,
      restaurant_id: restaurantId,
      token,
      is_active: true,
    });

    // Build the QR scan URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const scanUrl = `${baseUrl}/r/${restaurant.slug}?t=${encodeURIComponent(token)}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(scanUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
    });

    // Upload QR code to Supabase Storage
    const storagePath = `${restaurantId}/${table.id}/qr.png`;
    const { error: uploadErr } = await supabase.storage
      .from('qr-codes')
      .upload(storagePath, qrBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('QR upload error:', uploadErr);
    }

    const { data: urlData } = supabase.storage.from('qr-codes').getPublicUrl(storagePath);
    const qrCodeUrl = urlData.publicUrl;

    // Save QR URL back to table
    await supabase.from('tables').update({ qr_code_url: qrCodeUrl }).eq('id', table.id);

    return created({
      tableId: table.id,
      label: parsed.data.label,
      token,
      scanUrl,
      qrCodeUrl,
    });
  } catch (e) {
    return toResponse(e);
  }
}
