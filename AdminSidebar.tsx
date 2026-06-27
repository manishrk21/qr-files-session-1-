'use client';
// app/(admin)/admin/[restaurantSlug]/_components/AdminSidebar.tsx
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList, BarChart2, Settings, Users,
  UtensilsCrossed, QrCode, LogOut, ChefHat, Circle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

interface Props {
  restaurantSlug: string;
  restaurantName: string;
  logoUrl: string | null;
  role: string;
  isAcceptingOrders: boolean;
}

const NAV_ITEMS = [
  { href: 'orders',    label: 'Live Orders',  icon: ClipboardList },
  { href: 'menu',      label: 'Menu',         icon: UtensilsCrossed },
  { href: 'tables',    label: 'Tables & QR',  icon: QrCode },
  { href: 'customers', label: 'Customers',    icon: Users },
  { href: 'analytics', label: 'Analytics',    icon: BarChart2 },
  { href: 'settings',  label: 'Settings',     icon: Settings },
];

export default function AdminSidebar({
  restaurantSlug, restaurantName, logoUrl, role, isAcceptingOrders,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  const base = `/admin/${restaurantSlug}`;

  return (
    <aside className="w-60 flex flex-col bg-gray-900 border-r border-gray-800 h-full flex-shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={restaurantName} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
              <ChefHat size={18} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{restaurantName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Circle
                size={6}
                className={isAcceptingOrders ? 'fill-green-400 text-green-400' : 'fill-red-400 text-red-400'}
              />
              <span className={`text-xs ${isAcceptingOrders ? 'text-green-400' : 'text-red-400'}`}>
                {isAcceptingOrders ? 'Accepting orders' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const fullHref = `${base}/${href}`;
          const active = pathname.startsWith(fullHref);
          return (
            <Link
              key={href}
              href={fullHref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="px-3 py-2 mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Role: {role}</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition disabled:opacity-50"
        >
          <LogOut size={18} />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
