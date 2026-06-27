// apps/worker/src/index.ts
import express from 'express';
import helmet from 'helmet';
import cron from 'node-cron';
import { z } from 'zod';
import { sendOtpService, verifyOtpService } from './services/otp';
import { revertStaleCancelRequests } from './services/orders';
import { createClient } from './lib/supabase';

const app = express();
app.use(helmet());
app.use(express.json());

// ─── Auth middleware (shared secret between web app and worker) ───────────────
function requireWorkerSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const secret = req.headers['x-worker-secret'];
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── OTP: Send ────────────────────────────────────────────────────────────────
const SendSchema = z.object({
  mobileNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
  restaurantId: z.string().uuid(),
});

app.post('/otp/send', requireWorkerSecret, async (req, res) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const result = await sendOtpService(parsed.data.mobileNumber, parsed.data.restaurantId);

  if (result.rateLimited) {
    return res.status(429).json({
      message: result.error,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  return res.json({ success: true });
});

// ─── OTP: Verify ──────────────────────────────────────────────────────────────
const VerifySchema = z.object({
  mobileNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
  otp: z.string().length(6),
  restaurantId: z.string().uuid(),
});

app.post('/otp/verify', requireWorkerSecret, async (req, res) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const result = await verifyOtpService(
    parsed.data.mobileNumber,
    parsed.data.otp,
    parsed.data.restaurantId,
  );

  if (result.expired || result.alreadyUsed) {
    return res.status(410).json({ error: result.error });
  }

  if (!result.success) {
    return res.status(401).json({
      error: result.error,
      attemptsRemaining: result.attemptsRemaining,
      locked: result.locked,
    });
  }

  return res.json({ success: true });
});

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

// Every 5 minutes: clean expired OTPs
cron.schedule('*/5 * * * *', async () => {
  const supabase = createClient();
  const { error } = await supabase.rpc('cleanup_expired_otps');
  if (error) console.error('[cron] cleanup_expired_otps failed:', error);
  else console.log('[cron] Cleaned expired OTPs');
});

// Every 5 minutes: revert stale cancel_requested orders back to accepted
// (prevents a customer's cancellation request from silently blocking the kitchen
//  if staff never act on it within 15 minutes)
cron.schedule('*/5 * * * *', async () => {
  const { reverted } = await revertStaleCancelRequests();
  if (reverted > 0) {
    console.log(`[cron] Reverted ${reverted} stale cancel_requested order(s) → accepted`);
  }
});

// Every hour: clean expired customer sessions
cron.schedule('0 * * * *', async () => {
  const supabase = createClient();
  const { error } = await supabase.rpc('cleanup_expired_sessions');
  if (error) console.error('[cron] cleanup_expired_sessions failed:', error);
  else console.log('[cron] Cleaned expired sessions');
});

// Every 24 hours: clean old rate limit events
cron.schedule('0 0 * * *', async () => {
  const supabase = createClient();
  const { error } = await supabase.rpc('cleanup_old_rate_limit_events');
  if (error) console.error('[cron] cleanup_old_rate_limit_events failed:', error);
  else console.log('[cron] Cleaned rate limit events');
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`[worker] Listening on port ${PORT}`);
});

export default app;
