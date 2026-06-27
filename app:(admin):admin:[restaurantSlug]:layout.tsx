// app/(admin)/admin/[restaurantSlug]/layout.tsx
// Persistent sidebar layout for the admin panel.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSidebar from './_components/AdminSidebar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { restaurantSlug: string };
}) {
  const requestHeaders = headers();
  const restaurantId = requestHeaders.get('x-admin-restaurant-id');
  const role = requestHeaders.get('x-admin-role');

  if (!restaurantId || !role) redirect('/admin/login');

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug, name, logo_url, is_accepting_orders')
    .eq('id', restaurantId)
    .eq('slug', params.restaurantSlug)
    .single();

  if (!restaurant) redirect('/admin/login?error=no_access');

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <AdminSidebar
        restaurantSlug={params.restaurantSlug}
        restaurantName={restaurant.name}
        logoUrl={restaurant.logo_url}
        role={role}
        isAcceptingOrders={restaurant.is_accepting_orders}
      />
      <main className="flex-1 overflow-y-auto bg-gray-950">
        {children}
      </main>
    </div>
  );
}
