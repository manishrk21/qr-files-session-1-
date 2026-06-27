'use client';
// app/(admin)/admin/[restaurantSlug]/customers/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { Search, Users, Loader2, Star, Smartphone, Mail } from 'lucide-react';
import { useDebounce } from 'use-debounce';

interface Customer {
  id: string;
  name: string | null;
  mobileNumber: string | null;
  email: string | null;
  avatarUrl: string | null;
  authProvider: 'otp' | 'google' | 'guest';
  isGuest: boolean;
  totalVisits: number;
  lastSeenAt: string;
  joinedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<'all' | 'exclude' | 'only'>('exclude');
  const [page, setPage] = useState(1);

  const [debouncedSearch] = useDebounce(search, 400);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(guestFilter !== 'all' ? { guests: guestFilter } : {}),
      });
      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data.customers);
        setPagination(data.data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, guestFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, guestFilter]);

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const providerBadge = (p: string) => {
    const map: Record<string, string> = {
      otp:    'bg-blue-500/20 text-blue-300',
      google: 'bg-red-500/20 text-red-300',
      guest:  'bg-gray-500/20 text-gray-400',
    };
    return map[p] ?? 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Customers</h1>
          {pagination && (
            <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {(['exclude', 'all', 'only'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setGuestFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                guestFilter === f ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'exclude' ? 'Members' : f === 'only' ? 'Guests' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Users size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-400">No customers found</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Contact</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Auth</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Visits</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">
                            {c.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <span className="text-gray-200 text-sm font-medium">
                          {c.name ?? <span className="text-gray-600 italic">Unknown</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {c.mobileNumber && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Smartphone size={11} />
                            {c.mobileNumber}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Mail size={11} />
                            {c.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${providerBadge(c.authProvider)}`}>
                        {c.authProvider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        {c.totalVisits > 0 && <Star size={12} className="text-amber-400" />}
                        <span className={c.totalVisits > 0 ? 'text-amber-300 font-semibold' : 'text-gray-600'}>
                          {c.totalVisits}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{timeAgo(c.lastSeenAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-gray-500 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40 bg-gray-800 rounded-xl transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40 bg-gray-800 rounded-xl transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
