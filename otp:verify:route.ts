// app/api/auth/otp/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTableToken, signCustomerSession } from '@/lib/crypto';
import { ok, err, toResponse } from '@/lib/api/response';
import { VerifyOtpSchema } from '@/validations/auth';

export const runtime = 'nodejs';

const SESSION_7_DAYS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = VerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid request body', 422, parsed.error.flatten());
    }

    const { mobileNumber, otp, restaurantId, tableToken } = parsed.data;

    // Verify table token
    const tokenData = verifyTableToken(tableToken);
    if (!tokenData || tokenData.restaurantId !== restaurantId) {
      return err('UNAUTHORIZED', 'Invalid table token', 401);
    }

    const supabase = createAdminClient();

    // Verify table token is active in DB
    const { data: dbToken } = await supabase
      .from('table_tokens')
      .select('table_id')
      .eq('token', tableToken)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (!dbToken) return err('UNAUTHORIZED', 'Table token is inactive or not found', 401);

    // Delegate OTP verification to worker
    const workerRes = await fetch(`${process.env.WORKER_URL}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.WORKER_SECRET!,
      },
      body: JSON.stringify({ mobileNumber, otp, restaurantId }),
    });

    const workerData = await workerRes.json();

    if (workerRes.status === 401) {
      return err('UNAUTHORIZED', 'Invalid OTP.', 401, {
        attemptsRemaining: workerData.attemptsRemaining,
      });
    }
    if (workerRes.status === 410) {
      return err('UNAUTHORIZED', 'OTP expired or already used.', 401);
    }
    if (!workerRes.ok) {
      return err('INTERNAL_ERROR', 'OTP verification failed', 500);
    }

    // Upsert customer
    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .upsert(
        {
          restaurant_id: restaurantId,
          mobile_number: mobileNumber,
          auth_provider: 'otp',
          is_guest: false,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id,mobile_number', ignoreDuplicates: false },
      )
      .select('id, name')
      .single();

    if (customerErr || !customer) {
      return err('INTERNAL_ERROR', 'Could not create customer record', 500);
    }

    // Sign session token
    const sessionToken = signCustomerSession(
      { cid: customer.id, rid: restaurantId, tid: dbToken.table_id },
      SESSION_7_DAYS,
    );

    // Persist session in DB (for revocation)
    await supabase.from('customer_sessions').insert({
      customer_id: customer.id,
      restaurant_id: restaurantId,
      session_token: sessionToken,
      is_guest: false,
      table_id: dbToken.table_id,
      expires_at: new Date(Date.now() + SESSION_7_DAYS).toISOString(),
    });

    // Get restaurant slug for redirect
    const { data: rest } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', restaurantId)
      .single();

    const response = ok({
      customerId: customer.id,
      isNewCustomer: !customer.name,
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
