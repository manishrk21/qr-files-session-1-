// app/api/restaurants/[slug]/menu/route.ts
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ok, err, toResponse } from '@/lib/api/response';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    // Validate customer session via header set by middleware
    const restaurantId = request.headers.get('x-restaurant-id');
    if (!restaurantId) return err('UNAUTHORIZED', 'No active session', 401);

    const supabase = createAdminClient();

    // Verify slug matches session's restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('slug', params.slug)
      .eq('id', restaurantId)
      .single();

    if (!restaurant) return err('NOT_FOUND', 'Restaurant not found', 404);

    // Fetch categories with items
    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select(`
        id, name, display_order, is_active,
        menu_items (
          id, name, description, price, image_url,
          food_type, is_available, is_featured,
          allergens, preparation_time_minutes, display_order
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) throw error;

    const formatted = (categories ?? []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      displayOrder: cat.display_order,
      items: (cat.menu_items as any[])
        .filter((i) => !i.deleted_at)
        .sort((a, b) => a.display_order - b.display_order)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.image_url,
          foodType: item.food_type,
          isAvailable: item.is_available,
          isFeatured: item.is_featured,
          allergens: item.allergens ?? [],
          preparationTimeMinutes: item.preparation_time_minutes,
        })),
    }));

    return ok({ categories: formatted });
  } catch (e) {
    return toResponse(e);
  }
}
