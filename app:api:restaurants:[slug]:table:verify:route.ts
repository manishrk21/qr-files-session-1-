// app/api/restaurants/[slug]/table/verify/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTableToken } from '@/lib/crypto';
import { ok, err, toResponse } from '@/lib/api/response';

export const runtime = 'nodejs';

const Schema = z.object({ token: z.string().min(10) });

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return err('VALIDATION_ERROR', 'token is required', 422);

    const { token } = parsed.data;

    // Cryptographic verification first (fast, no DB hit)
    const decoded = verifyTableToken(token);
    if (!decoded) return err('UNAUTHORIZED', 'Invalid or tampered table token', 401);

    const supabase = createAdminClient();

    // DB verification: token must be active AND belong to the requested slug
    const { data } = await supabase
      .from('table_tokens')
      .select(`
        table_id,
        tables ( label, capacity ),
        restaurants ( id, slug )
      `)
      .eq('token', token)
      .eq('restaurant_id', decoded.restaurantId)
      .eq('is_active', true)
      .is('expires_at', null)  // or: .gt('expires_at', new Date().toISOString())
      .single();

    if (!data) return err('UNAUTHORIZED', 'Table token not found or inactive', 401);

    const restaurant = Array.isArray(data.restaurants)
      ? data.restaurants[0]
      : data.restaurants;
    const table = Array.isArray(data.tables) ? data.tables[0] : data.tables;

    if (restaurant?.slug !== params.slug) {
      return err('UNAUTHORIZED', 'Token does not match this restaurant', 401);
    }

    return ok({
      tableId: data.table_id,
      tableLabel: table?.label ?? 'Unknown Table',
      restaurantId: decoded.restaurantId,
      restaurantSlug: restaurant.slug,
    });
  } catch (e) {
    return toResponse(e);
  }
}
