// app/api/restaurants/[slug]/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id, slug, name, description, logo_url,
        is_active, is_accepting_orders,
        currency_code, tax_rate,
        loyalty_streak_target, loyalty_reward_description,
        restaurant_branding (
          primary_color, secondary_color, accent_color, font_family, banner_url
        )
      `)
      .eq('slug', params.slug)
      .eq('is_active', true)
      .is('deleted_at', null)
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
      logoUrl: data.logo_url,
      isAcceptingOrders: data.is_accepting_orders,
      currency: data.currency_code,
      taxRate: data.tax_rate,
      loyaltyStreakTarget: data.loyalty_streak_target,
      loyaltyRewardDescription: data.loyalty_reward_description,
      branding: branding
        ? {
            primaryColor: branding.primary_color,
            secondaryColor: branding.secondary_color,
            accentColor: branding.accent_color,
            fontFamily: branding.font_family,
            bannerUrl: branding.banner_url,
          }
        : null,
    });
  } catch (e) {
    return toResponse(e);
  }
}
