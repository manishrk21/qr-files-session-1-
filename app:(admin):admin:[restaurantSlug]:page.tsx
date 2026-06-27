// app/(admin)/admin/[restaurantSlug]/page.tsx
// Dashboard home: shows a quick summary then auto-redirects to orders.
import { redirect } from 'next/navigation';

export default function AdminDashboardHome({
  params,
}: {
  params: { restaurantSlug: string };
}) {
  // The live orders board is the primary admin view.
  redirect(`/admin/${params.restaurantSlug}/orders`);
}
