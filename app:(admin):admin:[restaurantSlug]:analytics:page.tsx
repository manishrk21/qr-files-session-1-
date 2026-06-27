'use client';
// app/(admin)/admin/[restaurantSlug]/analytics/page.tsx
import { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingBag, Users, Award,
  IndianRupee, Loader2,
} from 'lucide-react';

type Period = 'today' | '7d' | '30d' | '90d';

interface Analytics {
  period: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    activeCustomers: number;
    loyaltyVisits: number;
  };
  dailyRevenue: { date: string; revenue: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?period=${period}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [period]);

  const maxRevenue = data ? Math.max(...data.dailyRevenue.map((d) => d.revenue), 1) : 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === p ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Revenue"
              value={`₹${data.summary.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              accent="amber"
            />
            <StatCard
              icon={<ShoppingBag size={20} />}
              label="Orders"
              value={String(data.summary.totalOrders)}
              sub={`${data.summary.completedOrders} completed`}
              accent="blue"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Pending"
              value={String(data.summary.pendingOrders)}
              sub="in progress"
              accent="purple"
            />
            <StatCard
              icon={<Users size={20} />}
              label="Active Customers"
              value={String(data.summary.activeCustomers)}
              accent="green"
            />
            <StatCard
              icon={<Award size={20} />}
              label="Loyalty Visits"
              value={String(data.summary.loyaltyVisits)}
              accent="pink"
            />
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Avg Order Value"
              value={
                data.summary.completedOrders > 0
                  ? `₹${(data.summary.totalRevenue / data.summary.completedOrders).toFixed(2)}`
                  : '—'
              }
              accent="teal"
            />
          </div>

          {/* Revenue chart */}
          {data.dailyRevenue.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
              <h2 className="text-white font-semibold text-sm mb-4">Daily Revenue</h2>
              <div className="flex items-end gap-2 h-32">
                {data.dailyRevenue.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div className="w-full relative" style={{ height: '100px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-amber-500/30 hover:bg-amber-500/50 rounded-t-md transition"
                        style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 100)}px` }}
                        title={`₹${d.revenue}`}
                      />
                    </div>
                    <span className="text-gray-600 text-[10px] truncate w-full text-center">
                      {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top items */}
          {data.topItems.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4">Top Menu Items</h2>
              <div className="space-y-3">
                {data.topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-5 text-gray-600 text-xs font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-200 text-sm truncate">{item.name}</span>
                        <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
                          {item.quantity} sold · ₹{item.revenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(item.quantity / data.topItems[0].quantity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: 'amber' | 'blue' | 'purple' | 'green' | 'pink' | 'teal';
}) {
  const colors: Record<string, string> = {
    amber:  'bg-amber-500/10 text-amber-400',
    blue:   'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green:  'bg-green-500/10 text-green-400',
    pink:   'bg-pink-500/10 text-pink-400',
    teal:   'bg-teal-500/10 text-teal-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${colors[accent]}`}>{icon}</div>
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}
