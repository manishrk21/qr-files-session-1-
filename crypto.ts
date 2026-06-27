// lib/crypto.ts
// Table token generation/verification + Customer session JWT signing.
// Uses Node.js crypto (Edge-compatible subset).
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// ─── Table Tokens ─────────────────────────────────────────────────────────────
// Format: base64url(nonce:restaurantId:tableId).base64url(HMAC-SHA256)
// Stored in table_tokens.token and verified on every QR scan.

const TABLE_SECRET = () => {
  const s = process.env.TABLE_TOKEN_SECRET;
  if (!s) throw new Error('TABLE_TOKEN_SECRET is not set');
  return s;
};

export function generateTableToken(restaurantId: string, tableId: string): string {
  const nonce = randomBytes(16).toString('hex');
  const payload = `${nonce}:${restaurantId}:${tableId}`;
  const sig = createHmac('sha256', TABLE_SECRET())
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyTableToken(
  token: string,
): { restaurantId: string; tableId: string } | null {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const payload = Buffer.from(payloadB64, 'base64url').toString();
  const expectedSig = createHmac('sha256', TABLE_SECRET())
    .update(payload)
    .digest('base64url');

  // Constant-time comparison
  const aSig = Buffer.from(sig);
  const bSig = Buffer.from(expectedSig);
  if (aSig.length !== bSig.length) return null;
  if (!timingSafeEqual(aSig, bSig)) return null;

  const parts = payload.split(':');
  // parts: [nonce(hex=32chars), restaurantId, tableId]
  // nonce has no colons; UUIDs have 4 colons each — safe to slice
  const restaurantId = parts[1];
  const tableId = parts[2];
  if (!restaurantId || !tableId) return null;

  return { restaurantId, tableId };
}

// ─── Customer Session Tokens ──────────────────────────────────────────────────
// Lightweight signed payload (not a full JWT, but JWT-like).
// Stored in customer_sessions table for server-side revocation.

const SESSION_SECRET = () => {
  const s = process.env.CUSTOMER_SESSION_SECRET;
  if (!s) throw new Error('CUSTOMER_SESSION_SECRET is not set');
  return s;
};

export interface CustomerSessionPayload {
  cid: string;        // customer_id
  rid: string;        // restaurant_id
  tid: string | null; // table_id
  iss: 'brand';
  iat: number;
  exp: number;
}

export function signCustomerSession(payload: Omit<CustomerSessionPayload, 'iss' | 'iat' | 'exp'>, expiresInMs: number): string {
  const full: CustomerSessionPayload = {
    ...payload,
    iss: 'brand',
    iat: Date.now(),
    exp: Date.now() + expiresInMs,
  };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = createHmac('sha256', SESSION_SECRET()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyCustomerSession(token: string): CustomerSessionPayload | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const data = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const expectedSig = createHmac('sha256', SESSION_SECRET()).update(data).digest('base64url');
    const aSig = Buffer.from(sig);
    const bSig = Buffer.from(expectedSig);
    if (aSig.length !== bSig.length) return null;
    if (!timingSafeEqual(aSig, bSig)) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as CustomerSessionPayload;

    if (payload.iss !== 'brand') return null;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
