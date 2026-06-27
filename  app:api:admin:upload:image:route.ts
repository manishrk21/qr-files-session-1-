// app/api/admin/upload/image/route.ts
// Returns a signed URL for direct browser → Supabase Storage upload.
// After the client uploads, it sends back the public URL for the menu item.
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

const Schema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  // What the upload is for — 'menu-item' | 'logo' | 'banner'
  purpose: z.enum(['menu-item', 'logo', 'banner']).default('menu-item'),
});

export async function POST(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'menu:update')) return err('FORBIDDEN', 'Insufficient permissions', 403);

    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid upload request', 422, parsed.error.flatten());
    }

    const { contentType, purpose } = parsed.data;
    const ext = contentType.split('/')[1]; // jpeg, png, webp, gif
    const objectPath = `${restaurantId}/${purpose}/${nanoid(12)}.${ext}`;

    const supabase = createAdminClient();

    // Create a signed upload URL — client uploads directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from('menu-images')
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error('[upload] Signed URL error:', error);
      return err('INTERNAL_ERROR', 'Could not create upload URL', 500);
    }

    // Derive the public URL (available after upload completes)
    const { data: urlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(objectPath);

    return ok({
      signedUrl: data.signedUrl,
      token: data.token,
      path: objectPath,
      publicUrl: urlData.publicUrl,
    });
  } catch (e) {
    return toResponse(e);
  }
}
