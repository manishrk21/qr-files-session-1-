// apps/worker/src/services/otp.ts
import bcrypt from 'bcryptjs';
import { createClient } from '../lib/supabase';
import { redis } from '../lib/redis';
import { sendOtp } from './sms';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 600;         // 10 minutes
const RATE_LIMIT_MAX = 3;            // max OTPs per window
const RATE_LIMIT_WINDOW_SECONDS = 900; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 3;

function generateOtp(): string {
  // Cryptographically random 6-digit OTP
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function rateLimitKey(mobileNumber: string, restaurantId: string): string {
  return `otp:rate:${restaurantId}:${mobileNumber}`;
}

function attemptsKey(mobileNumber: string, restaurantId: string): string {
  return `otp:attempts:${restaurantId}:${mobileNumber}`;
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export interface SendResult {
  success: boolean;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  error?: string;
}

export async function sendOtpService(
  mobileNumber: string,
  restaurantId: string,
): Promise<SendResult> {
  const rlKey = rateLimitKey(mobileNumber, restaurantId);

  // Check rate limit
  const current = await redis.get(rlKey);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(rlKey);
    return { success: false, rateLimited: true, retryAfterSeconds: ttl, error: `Too many OTP requests. Try again in ${Math.ceil(ttl / 60)} minutes.` };
  }

  // Generate + hash OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  const supabase = createClient();

  // Invalidate previous unexpired OTPs for this mobile+restaurant
  await supabase
    .from('otp_requests')
    .update({ is_used: true })
    .eq('mobile_number', mobileNumber)
    .eq('restaurant_id', restaurantId)
    .eq('is_used', false);

  // Store new OTP
  const { error: insertErr } = await supabase.from('otp_requests').insert({
    mobile_number: mobileNumber,
    restaurant_id: restaurantId,
    otp_hash: otpHash,
    attempts: 0,
    is_used: false,
    expires_at: new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString(),
  });

  if (insertErr) {
    console.error('[OTP] Insert error:', insertErr);
    return { success: false, error: 'Could not store OTP' };
  }

  // Send SMS
  const smsResult = await sendOtp(mobileNumber, otp);
  if (!smsResult.success) {
    return { success: false, error: `SMS failed: ${smsResult.error}` };
  }

  // Increment rate limit counter
  await redis.set(rlKey, String(count + 1), 'EX', RATE_LIMIT_WINDOW_SECONDS);

  return { success: true };
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export interface VerifyResult {
  success: boolean;
  attemptsRemaining?: number;
  expired?: boolean;
  alreadyUsed?: boolean;
  locked?: boolean;
  error?: string;
}

export async function verifyOtpService(
  mobileNumber: string,
  otp: string,
  restaurantId: string,
): Promise<VerifyResult> {
  const supabase = createClient();

  // Fetch latest valid OTP for this mobile+restaurant
  const { data: record } = await supabase
    .from('otp_requests')
    .select('id, otp_hash, attempts, is_used, expires_at')
    .eq('mobile_number', mobileNumber)
    .eq('restaurant_id', restaurantId)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!record) {
    return { success: false, expired: true, error: 'OTP expired or not found' };
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, locked: true, error: 'Too many failed attempts. Request a new OTP.' };
  }

  // Increment attempt counter before verifying (prevents timing attacks)
  await supabase
    .from('otp_requests')
    .update({ attempts: record.attempts + 1 })
    .eq('id', record.id);

  const valid = await bcrypt.compare(otp, record.otp_hash);

  if (!valid) {
    const remaining = MAX_VERIFY_ATTEMPTS - (record.attempts + 1);
    return {
      success: false,
      attemptsRemaining: Math.max(0, remaining),
      error: 'Invalid OTP',
    };
  }

  // Mark as used
  await supabase.from('otp_requests').update({ is_used: true }).eq('id', record.id);

  // Clear attempts key in Redis
  await redis.del(attemptsKey(mobileNumber, restaurantId));

  return { success: true };
}
