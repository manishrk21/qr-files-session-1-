// app/(customer)/r/[restaurantSlug]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableInfo {
  tableId: string;
  tableLabel: string;
  restaurantId: string;
  restaurantSlug: string;
}

type Step = 'entry' | 'otp_mobile' | 'otp_code';

const MobileSchema = z.object({
  mobile: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Use E.164 format, e.g. +919876543210'),
});
const OtpSchema = z.object({ otp: z.string().length(6) });

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerEntryPage({
  params,
}: {
  params: { restaurantSlug: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableToken = searchParams.get('t') ?? '';

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('entry');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState(0); // seconds remaining

  const mobileForm = useForm<z.infer<typeof MobileSchema>>({
    resolver: zodResolver(MobileSchema),
    defaultValues: { mobile: '' },
  });
  const otpForm = useForm<z.infer<typeof OtpSchema>>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { otp: '' },
  });

  // ── Verify table token on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!tableToken) {
      setTokenError('No table token found. Please scan the QR code again.');
      return;
    }
    fetch(`/api/restaurants/${params.restaurantSlug}/table/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tableToken }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTableInfo(data.data);
        else setTokenError('Invalid or expired QR code. Please scan again.');
      })
      .catch(() => setTokenError('Network error. Please try again.'));
  }, [tableToken, params.restaurantSlug]);

  // ── OTP countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (otpExpiry <= 0) return;
    const t = setInterval(() => setOtpExpiry((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [otpExpiry]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSendOtp(values: z.infer<typeof MobileSchema>) {
    if (!tableInfo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: values.mobile, restaurantId: tableInfo.restaurantId }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? 'Failed to send OTP');
        return;
      }
      setMobile(values.mobile);
      setOtpExpiry(data.data.expiresInSeconds);
      setStep('otp_code');
      toast.success(`OTP sent to ${data.data.maskedMobile}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(values: z.infer<typeof OtpSchema>) {
    if (!tableInfo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: mobile,
          otp: values.otp,
          restaurantId: tableInfo.restaurantId,
          tableToken,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        const remaining = data.error?.details?.attemptsRemaining;
        toast.error(
          remaining != null
            ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : data.error?.message ?? 'Invalid OTP',
        );
        return;
      }
      router.push(data.data.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!tableInfo) return;
    // Load Google Identity Services script
    const { google } = window as any;
    if (!google?.accounts?.id) {
      toast.error('Google login is not available. Please try another method.');
      return;
    }
    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        setLoading(true);
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken: response.credential,
              restaurantId: tableInfo.restaurantId,
              tableToken,
            }),
          });
          const data = await res.json();
          if (data.success) {
            router.push(data.data.redirectTo);
          } else {
            toast.error(data.error?.message ?? 'Google login failed');
          }
        } finally {
          setLoading(false);
        }
      },
    });
    google.accounts.id.prompt();
  }

  async function handleGuestLogin() {
    if (!tableInfo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: tableInfo.restaurantId, tableToken }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.data.redirectTo);
      } else {
        toast.error(data.error?.message ?? 'Could not start guest session');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (tokenError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold">Invalid QR Code</h1>
          <p className="text-gray-500 text-sm">{tokenError}</p>
        </div>
      </main>
    );
  }

  if (!tableInfo) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Verifying table…</div>
      </main>
    );
  }

  return (
    <>
      {/* Load Google Identity Services */}
      <script src="https://accounts.google.com/gsi/client" async defer />

      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              {tableInfo.tableLabel}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
            <p className="text-sm text-gray-500">Choose how you'd like to continue</p>
          </div>

          {step === 'entry' && (
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Mobile OTP */}
              <button
                onClick={() => setStep('otp_mobile')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <span>📱</span>
                Continue with Mobile OTP
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Guest */}
              <button
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition"
              >
                Continue as Guest
              </button>
              <p className="text-xs text-center text-gray-400">
                Guest sessions expire in 24 hours and don't earn loyalty rewards
              </p>
            </div>
          )}

          {step === 'otp_mobile' && (
            <form onSubmit={mobileForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  {...mobileForm.register('mobile')}
                  type="tel"
                  placeholder="+919876543210"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {mobileForm.formState.errors.mobile && (
                  <p className="text-xs text-red-500 mt-1">
                    {mobileForm.formState.errors.mobile.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep('entry')}
                className="w-full text-sm text-gray-500 py-1"
              >
                ← Back
              </button>
            </form>
          )}

          {step === 'otp_code' && (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
              <p className="text-sm text-gray-500 text-center">
                Enter the 6-digit code sent to{' '}
                <span className="font-medium text-gray-900">{mobile}</span>
              </p>
              <input
                {...otpForm.register('otp')}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="— — — — — —"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {otpExpiry > 0 && (
                <p className="text-xs text-center text-gray-400">
                  Code expires in {Math.floor(otpExpiry / 60)}:
                  {String(otpExpiry % 60).padStart(2, '0')}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify OTP'}
              </button>
              <div className="flex justify-between text-sm text-gray-500">
                <button type="button" onClick={() => setStep('otp_mobile')}>
                  ← Change number
                </button>
                {otpExpiry === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('otp_mobile');
                      mobileForm.setValue('mobile', mobile);
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
