// apps/worker/src/services/sms.ts
// MSG91 SMS adapter for India DLT-registered OTP messages.
// Docs: https://docs.msg91.com/p/mTjPZYSW-msg91-api

interface Msg91SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a 6-digit OTP via MSG91.
 * The OTP is embedded by MSG91 into the DLT-approved template.
 *
 * Environment variables required:
 *   MSG91_AUTH_KEY      — your MSG91 authentication key
 *   MSG91_TEMPLATE_ID   — DLT-approved template ID for OTP
 *   MSG91_SENDER_ID     — 6-char DLT sender ID (e.g. BRAND1)
 */
export async function sendOtpViaMSG91(
  mobileNumber: string,   // E.164, e.g. +919876543210
  otp: string,            // 6-digit string
): Promise<Msg91SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID ?? 'BRAND1';

  if (!authKey || !templateId) {
    console.error('[SMS] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set');
    return { success: false, error: 'SMS provider not configured' };
  }

  // MSG91 expects mobile without '+': 919876543210
  const mobile = mobileNumber.replace(/^\+/, '');

  const payload = {
    template_id: templateId,
    sender: senderId,
    short_url: '0',
    realTimeResponse: '1',
    mobiles: mobile,
    // Variables match the DLT-approved template placeholders
    VAR1: otp,
    VAR2: '10',  // expiry in minutes — matches template text
  };

  try {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { type: string; message: string; request_id?: string };

    if (data.type === 'success') {
      return { success: true, messageId: data.request_id };
    }

    console.error('[SMS] MSG91 error:', data);
    return { success: false, error: data.message ?? 'Unknown MSG91 error' };
  } catch (err) {
    console.error('[SMS] Network error:', err);
    return { success: false, error: 'Network error contacting MSG91' };
  }
}

/**
 * DEV FALLBACK: logs OTP to console instead of sending SMS.
 * Used when MSG91 is not configured (local dev).
 */
export async function sendOtpDev(mobileNumber: string, otp: string): Promise<Msg91SendResult> {
  console.log(`\n[DEV SMS] OTP for ${mobileNumber}: ${otp}\n`);
  return { success: true, messageId: 'dev-mock' };
}

export async function sendOtp(mobileNumber: string, otp: string): Promise<Msg91SendResult> {
  if (process.env.NODE_ENV !== 'production') {
    return sendOtpDev(mobileNumber, otp);
  }
  return sendOtpViaMSG91(mobileNumber, otp);
}
