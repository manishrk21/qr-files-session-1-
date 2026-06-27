// app/api/admin/settings/route.ts
// Restaurant settings: name, hours, tax rate, loyalty config, branding colours.
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';
import { hasPermission } from '@/lib/auth/rbac';
import type { AdminRole } from '@/types/domain';

export const runtime = 'nodejs';

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    if (!restaurantId) return err('UNAUTHORIZED', 'Admin session required', 401);

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id, slug, name, description, phone, email,
        city, state, pincode, address,
        currency_code, tax_rate,
        is_active, is_accepting_orders,
        loyalty_streak_target, loyalty_reward_description,
        restaurant_branding (
          primary_color, secondary_color, accent_color, font_family, banner_url
        )
      `)
      .eq('id', restaurantId)
      .single();

    if (error || !data) return err('NOT_FOUND', 'Restaurant not found', 404);

    const branding = Array.isArray(data.restaurant_branding)
      ? data.restaurant_branding[0]
      : data.restaurant_branding;

    return ok({
      id: data.id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      currencyCode: data.currency_code,
      taxRate: data.tax_rate,
      isActive: data.is_active,
      isAcceptingOrders: data.is_accepting_orders,
      loyaltyStreakTarget: data.loyalty_streak_target,
      loyaltyRewardDescription: data.loyalty_reward_description,
      branding: branding ?? null,
    });
  } catch (e) {
    return toResponse(e);
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
const UpdateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  taxRate: z.number().min(0).max(50).optional(),
  isAcceptingOrders: z.boolean().optional(),
  loyaltyStreakTarget: z.number().int().min(2).max(20).optional(),
  loyaltyRewardDescription: z.string().max(200).optional().nullable(),
  branding: z
    .object({
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      fontFamily: z.string().max(60).optional(),
      bannerUrl: z.string().url().optional().nullable(),
    })
    .optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const restaurantId = request.headers.get('x-admin-restaurant-id');
    const role = request.headers.get('x-admin-role') as AdminRole | null;
    if (!restaurantId || !role) return err('UNAUTHORIZED', 'Admin session required', 401);
    if (!hasPermission(role, 'settings:update')) {
      return err('FORBIDDEN', 'Insufficient permissions', 403);
    }

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return err('VALIDATION_ERROR', 'Invalid settings payload', 422, parsed.error.flatten());
    }

    const supabase = createAdminClient();

    // Build restaurant update
    const restaurantUpdate: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) restaurantUpdate.name = parsed.data.name;
    if (parsed.data.description !== undefined) restaurantUpdate.description = parsed.data.description;
    if (parsed.data.phone !== undefined) restaurantUpdate.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) restaurantUpdate.email = parsed.data.email;
    if (parsed.data.address !== undefined) restaurantUpdate.address = parsed.data.address;
    if (parsed.data.city !== undefined) restaurantUpdate.city = parsed.data.city;
    if (parsed.data.state !== undefined) restaurantUpdate.state = parsed.data.state;
    if (parsed.data.pincode !== undefined) restaurantUpdate.pincode = parsed.data.pincode;
    if (parsed.data.taxRate !== undefined) restaurantUpdate.tax_rate = parsed.data.taxRate;
    if (parsed.data.isAcceptingOrders !== undefined)
      restaurantUpdate.is_accepting_orders = parsed.data.isAcceptingOrders;
    if (parsed.data.loyaltyStreakTarget !== undefined)
      restaurantUpdate.loyalty_streak_target = parsed.data.loyaltyStreakTarget;
    if (parsed.data.loyaltyRewardDescription !== undefined)
      restaurantUpdate.loyalty_reward_description = parsed.data.loyaltyRewardDescription;

    if (Object.keys(restaurantUpdate).length > 0) {
      const { error: restErr } = await supabase
        .from('restaurants')
        .update(restaurantUpdate)
        .eq('id', restaurantId);
      if (restErr) throw restErr;
    }

    // Upsert branding
    if (parsed.data.branding) {
      const b = parsed.data.branding;
      const brandingUpdate: Record<string, unknown> = { restaurant_id: restaurantId };
      if (b.primaryColor !== undefined) brandingUpdate.primary_color = b.primaryColor;
      if (b.secondaryColor !== undefined) brandingUpdate.secondary_color = b.secondaryColor;
      if (b.accentColor !== undefined) brandingUpdate.accent_color = b.accentColor;
      if (b.fontFamily !== undefined) brandingUpdate.font_family = b.fontFamily;
      if (b.bannerUrl !== undefined) brandingUpdate.banner_url = b.bannerUrl;

      const { error: brandErr } = await supabase
        .from('restaurant_branding')
        .upsert(brandingUpdate, { onConflict: 'restaurant_id' });
      if (brandErr) throw brandErr;
    }

    return ok({ updated: true });
  } catch (e) {
    return toResponse(e);
  }
}
