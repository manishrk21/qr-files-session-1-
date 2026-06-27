// app/api/admin/tables/[tableId]/regenerate-qr/route.ts
// Rotates a table's token (invalidating the old QR code) and generates a fresh one.
// Use when a QR code is lost, damaged, or potentially compromised.
import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateTableToken } from '@/lib/crypto';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { tableId: string } },
) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'tables:*')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const supabase = createAdminClient();

    // Verify table exists, belongs to this restaurant, and isn't soft-deleted
    const { data: table } = await supabase
      .from('tables')
      .select('id, label')
      .eq('id', params.tableId)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single();

    if (!table) return err('NOT_FOUND', 'Table not found', 404);

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) return err('NOT_FOUND', 'Restaurant not found', 404);

    // 1. Deactivate every existing token for this table.
    //    Old QR codes printed/laminated at the table become dead links immediately.
    await supabase
      .from('table_tokens')
      .update({ is_active: false })
      .eq('table_id', params.tableId)
      .eq('restaurant_id', restaurantId);

    // 2. Issue a brand-new signed token
    const newToken = generateTableToken(restaurantId, params.tableId);

    await supabase.from('table_tokens').insert({
      table_id: params.tableId,
      restaurant_id: restaurantId,
      token: newToken,
      is_active: true,
    });

    // 3. Build the new scan URL and render a fresh QR PNG
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const scanUrl = `${baseUrl}/r/${restaurant.slug}?t=${encodeURIComponent(newToken)}`;

    const qrBuffer = await QRCode.toBuffer(scanUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
    });

    // 4. Overwrite the same storage path — old links to this path now show the new code,
    //    and we avoid orphaning the previous PNG in storage.
    const storagePath = `${restaurantId}/${params.tableId}/qr.png`;
    const { error: uploadErr } = await supabase.storage
      .from('qr-codes')
      .upload(storagePath, qrBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[regenerate-qr] Upload error:', uploadErr);
      return err('INTERNAL_ERROR', 'Could not upload new QR code', 500);
    }

    const { data: urlData } = supabase.storage.from('qr-codes').getPublicUrl(storagePath);

    // Cache-bust the public URL so the admin UI doesn't show a stale cached image
    // for the same path (Supabase Storage URLs are otherwise stable per path).
    const newQrCodeUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    await supabase
      .from('tables')
      .update({ qr_code_url: newQrCodeUrl })
      .eq('id', params.tableId);

    return ok({
      tableId: table.id,
      newQrCodeUrl,
    });
  } catch (e) {
    return toResponse(e);
  }
}
