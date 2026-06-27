// app/(customer)/r/[restaurantSlug]/menu/page.tsx
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import MenuClient from './MenuClient';

// Server Component — fetches initial data, passes to client
export default async function MenuPage({
  params,
}: {
  params: { restaurantSlug: string };
}) {
  const requestHeaders = headers();
  const restaurantId = requestHeaders.get('x-restaurant-id');
  if (!restaurantId) notFound();

  const supabase = createAdminClient();

  // Fetch restaurant + branding
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`
      id, slug, name, description, logo_url,
      is_accepting_orders, currency_code, tax_rate,
      restaurant_branding ( primary_color, secondary_color, accent_color, font_family )
    `)
    .eq('id', restaurantId)
    .eq('slug', params.restaurantSlug)
    .single();

  if (!restaurant) notFound();

  // Fetch menu
  const { data: categories } = await supabase
    .from('menu_categories')
    .select(`
      id, name, display_order,
      menu_items (
        id, name, description, price, image_url,
        food_type, is_available, is_featured, allergens,
        preparation_time_minutes, display_order
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  const branding = Array.isArray(restaurant.restaurant_branding)
    ? restaurant.restaurant_branding[0]
    : restaurant.restaurant_branding;

  return (
    <MenuClient
      restaurant={{
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: restaurant.logo_url,
        isAcceptingOrders: restaurant.is_accepting_orders,
        currency: restaurant.currency_code,
        taxRate: restaurant.tax_rate,
        branding: branding ?? null,
      }}
      categories={(categories ?? []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        displayOrder: cat.display_order,
        items: (cat.menu_items as any[])
          .sort((a, b) => a.display_order - b.display_order),
      }))}
    />
  );
}
