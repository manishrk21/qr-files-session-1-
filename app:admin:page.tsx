// app/admin/page.tsx
// After Supabase login, the middleware doesn't know the slug yet.
// This Server Component fetches it and redirects.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminRootPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/admin/login');

  const adminClient = createAdminClient();
  const { data: member } = await adminClient
    .from('tenant_members')
    .select('restaurant_id, restaurants(slug)')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single();

  if (!member) redirect('/admin/login?error=no_access');

  const restaurant = Array.isArray(member.restaurants)
    ? member.restaurants[0]
    : member.restaurants;

  if (!restaurant?.slug) redirect('/admin/login?error=no_access');

  redirect(`/admin/${restaurant.slug}/orders`);
}
