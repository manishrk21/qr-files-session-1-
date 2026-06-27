// app/api/auth/otp/send/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { Errors } from '@/lib/api/response';
import { SendOtpSchema } from '@/validations/auth';

export const runtime = 'nodejs'; // bcrypt needs Node

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid request body', 422, parsed.error.flatten());
    }

    const { mobileNumber, restaurantId } = parsed.data;
    const supabase = createAdminClient();

    // Verify restaurant exists and is active
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, is_active')
      .eq('id', restaurantId)
      .eq('is_active', true)
      .single();

    if (!restaurant) return err('NOT_FOUND', 'Restaurant not found', 404);

    // Forward to worker — which owns rate-limiting and MSG91 dispatch
    const workerRes = await fetch(`${process.env.WORKER_URL}/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.WORKER_SECRET!,
      },
      body: JSON.stringify({ mobileNumber, restaurantId }),
    });

    const workerData = await workerRes.json();

    if (workerRes.status === 429) {
      return err(
        'RATE_LIMITED',
        workerData.message ?? 'Too many OTP requests.',
        429,
        { retryAfterSeconds: workerData.retryAfterSeconds },
      );
    }

    if (!workerRes.ok) {
      throw Errors.internal('OTP dispatch failed');
    }

    const masked = maskMobile(mobileNumber);

    return ok({ expiresInSeconds: 600, maskedMobile: masked });
  } catch (e) {
    return toResponse(e);
  }
}

function maskMobile(mobile: string): string {
  // +919876543210 → +91 ****43210
  if (mobile.length < 6) return mobile;
  const last4 = mobile.slice(-4);
  const countryPrefix = mobile.slice(0, mobile.length - 10);
  return `${countryPrefix} ****${last4}`;
}
