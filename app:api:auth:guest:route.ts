// app/api/auth/guest/route.ts
import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTableToken, signCustomerSession } from '@/lib/crypto';
import { ok, err, toResponse } from '@/lib/api/response';
import { GuestSessionSchema } from '@/validations/auth';

export const runtime = 'nodejs';

const SESSION_24H = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GuestSessionSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid request body', 422, parsed.error.flatten());
    }

    const { restaurantId, tableToken } = parsed.data;

    // Verify table token
    const tokenData = verifyTableToken(tableToken);
    if (!tokenData || tokenData.restaurantId !== restaurantId) {
      return err('UNAUTHORIZED', 'Invalid table token', 401);
    }

    const supabase = createAdminClient();

    const { data: dbToken } = await supabase
      .from('table_tokens')
      .select('table_id')
      .eq('token', tableToken)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (!dbToken) return err('UNAUTHORIZED', 'Table token is inactive', 401);

    // Create a pseudo-mobile for uniqueness (guests never share)
    const guestId = `guest_${nanoid(16)}`;

    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        mobile_number: guestId,   // unique placeholder; not a real number
        auth_provider: 'guest',
        is_guest: true,
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (customerErr || !customer) {
      return err('INTERNAL_ERROR', 'Could not create guest record', 500);
    }

    const sessionToken = signCustomerSession(
      { cid: customer.id, rid: restaurantId, tid: dbToken.table_id },
      SESSION_24H,
    );

    await supabase.from('customer_sessions').insert({
      customer_id: customer.id,
      restaurant_id: restaurantId,
      session_token: sessionToken,
      is_guest: true,
      table_id: dbToken.table_id,
      expires_at: new Date(Date.now() + SESSION_24H).toISOString(),
    });

    const { data: rest } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .single();

    const response = ok({ redirectTo: `/r/${rest?.slug ?? restaurantId}/menu` });

    response.cookies.set('mf-customer-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (e) {
    return toResponse(e);
  }
}
