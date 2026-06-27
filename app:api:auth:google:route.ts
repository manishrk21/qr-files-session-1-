// app/api/auth/google/route.ts
// Verifies a Google ID token (from the client-side Google Identity Services popup),
// then upserts a customer record and issues a mf-customer-session cookie.
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTableToken, signCustomerSession } from '@/lib/crypto';
import { ok, err, toResponse } from '@/lib/api/response';
import { GoogleAuthSchema } from '@/validations/auth';

export const runtime = 'nodejs';

const SESSION_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  exp: number;
}

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  // Verify against Google's public keys using the tokeninfo endpoint
  // (simpler than manual JWK verification; suitable for server-side use)
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  if (!res.ok) throw new Error('Google token verification failed');

  const payload = (await res.json()) as GoogleTokenPayload & { error?: string };
  if (payload.error) throw new Error(`Google error: ${payload.error}`);

  // Verify audience matches our client ID
  if (payload.aud !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    throw new Error('Token audience mismatch');
  }

  // Verify token is not expired
  if (payload.exp * 1000 < Date.now()) {
    throw new Error('Google token expired');
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GoogleAuthSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid request body', 422, parsed.error.flatten());
    }

    const { idToken, restaurantId, tableToken } = parsed.data;

    // 1. Verify table token
    const tokenData = verifyTableToken(tableToken);
    if (!tokenData || tokenData.restaurantId !== restaurantId) {
      return err('UNAUTHORIZED', 'Invalid table token', 401);
    }

    const supabase = createAdminClient();

    // 2. Verify table token active in DB
    const { data: dbToken } = await supabase
      .from('table_tokens')
      .select('table_id')
      .eq('token', tableToken)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (!dbToken) return err('UNAUTHORIZED', 'Table token is inactive', 401);

    // 3. Verify Google ID token
    let googlePayload: GoogleTokenPayload;
    try {
      googlePayload = await verifyGoogleToken(idToken);
    } catch (e) {
      return err('UNAUTHORIZED', 'Invalid Google token', 401);
    }

    // 4. Upsert customer by google_sub
    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .upsert(
        {
          restaurant_id: restaurantId,
          google_sub: googlePayload.sub,
          name: googlePayload.name ?? null,
          email: googlePayload.email,
          avatar_url: googlePayload.picture ?? null,
          auth_provider: 'google',
          is_guest: false,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id,google_sub', ignoreDuplicates: false },
      )
      .select('id, name')
      .single();

    if (customerErr || !customer) {
      console.error('Customer upsert error:', customerErr);
      return err('INTERNAL_ERROR', 'Could not create customer record', 500);
    }

    // 5. Issue session
    const sessionToken = signCustomerSession(
      { cid: customer.id, rid: restaurantId, tid: dbToken.table_id },
      SESSION_7_DAYS,
    );

    await supabase.from('customer_sessions').insert({
      customer_id: customer.id,
      restaurant_id: restaurantId,
      session_token: sessionToken,
      is_guest: false,
      table_id: dbToken.table_id,
      expires_at: new Date(Date.now() + SESSION_7_DAYS).toISOString(),
    });

    const { data: rest } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .single();

    const response = ok({
      customerId: customer.id,
      redirectTo: `/r/${rest?.slug ?? restaurantId}/menu`,
    });

    response.cookies.set('mf-customer-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (e) {
    return toResponse(e);
  }
}
