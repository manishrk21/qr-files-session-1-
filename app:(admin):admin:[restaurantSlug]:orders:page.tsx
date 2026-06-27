'use client';
// app/(admin)/admin/[restaurantSlug]/orders/page.tsx
// Live orders board. Subscribes to Supabase Realtime for new_order events,
// and allows inline status transitions via the state machine.
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Clock, CheckCircle, ChefHat, Bell, CreditCard,
  RefreshCw, Filter, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus =
  | 'pending' | 'accepted' | 'preparing'
  | 'ready' | 'served' | 'paid' | 'cancelled' | 'cancel_requested';

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  item_food_type: 'veg' | 'non_veg' | 'egg';
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  status: OrderStatus;
  table_label: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:          ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  preparing:        ['ready'],
  ready:            ['served'],
  served:           ['paid'],
  cancel_requested: ['cancelled', 'accepted'],
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  paid: 'Paid',
  cancelled: 'Cancelled',
  cancel_requested: 'Cancel Req.',
};

const STATUS_COLOR: Record<string, string> = {
  pending:          'bg-amber-500/20 text-amber-300 border-amber-500/30',
  accepted:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
  preparing:        'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ready:            'bg-green-500/20 text-green-300 border-green-500/30',
  served:           'bg-teal-500/20 text-teal-300 border-teal-500/30',
  paid:             'bg-gray-500/20 text-gray-400 border-gray-500/30',
  cancelled:        'bg-red-500/20 text-red-400 border-red-500/30',
  cancel_requested: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const ACTION_LABEL: Record<string, string> = {
  accepted: 'Accept',
  preparing: 'Start Preparing',
  ready: 'Mark Ready',
  served: 'Mark Served',
  paid: 'Mark Paid',
  cancelled: 'Cancel',
};

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'cancel_requested'];
const DONE_STATUSES: OrderStatus[] = ['served', 'paid', 'cancelled'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const params = useParams<{ restaurantSlug: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const restaurantIdRef = useRef<string | null>(null);

  // ── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const statusParam = filter === 'active'
        ? ACTIVE_STATUSES.join(',')
        : filter === 'done'
        ? DONE_STATUSES.join(',')
        : '';

      const url = `/api/admin/orders?limit=50${statusParam ? `&status=${filter === 'active' ? 'active' : ''}` : ''}`;
      // Use list endpoint — fetch all for board view
      const res = await fetch('/api/admin/orders?limit=50');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
        // Cache restaurant ID from first order (needed for realtime channel)
        if (data.data.orders.length > 0 && !restaurantIdRef.current) {
          // We get it from headers set by middleware — read from a meta endpoint
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Get restaurant ID for realtime ─────────────────────────────────────────
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch restaurant info via the public slug endpoint
    fetch(`/api/restaurants/${params.restaurantSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRestaurantId(d.data.id);
      });
  }, [params.restaurantSlug]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`restaurant:${restaurantId}:orders`)
      .on('broadcast', { event: 'new_order' }, (payload) => {
        toast.success(`New order — ${payload.payload.tableLabel}`, {
          description: `₹${payload.payload.total}`,
          duration: 8000,
        });
        // Play notification sound if available
        audioRef.current?.play().catch(() => {});
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, fetchOrders]);

  // ── Status transition ───────────────────────────────────────────────────────
  async function handleTransition(orderId: string, newStatus: string) {
    if (newStatus === 'paid') {
      setShowPaymentModal(orderId);
      return;
    }
    await doTransition(orderId, newStatus, undefined);
  }

  async function doTransition(orderId: string, newStatus: string, method?: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(method ? { paymentMethod: method } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: data.data.status, updated_at: data.data.updatedAt }
              : o,
          ),
        );
        toast.success(`Order ${STATUS_LABEL[newStatus].toLowerCase()}`);
      } else {
        toast.error(data.error?.message ?? 'Status update failed');
      }
    } finally {
      setUpdatingId(null);
      setShowPaymentModal(null);
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return ACTIVE_STATUSES.includes(o.status as OrderStatus);
    if (filter === 'done') return DONE_STATUSES.includes(o.status as OrderStatus);
    return true;
  });

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status as OrderStatus)).length;

  // ── Elapsed time helper ─────────────────────────────────────────────────────
  function elapsed(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Live Orders</h1>
          {activeCount > 0 && (
            <p className="text-sm text-amber-400 mt-0.5">{activeCount} active order{activeCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
            {(['active', 'done', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filter === f ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'done' ? 'Completed' : 'All'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOrders}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="text-amber-500 animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ClipboardList size={48} className="text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">No orders yet</p>
          <p className="text-gray-600 text-sm mt-1">New orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const transitions = STATUS_TRANSITIONS[order.status] ?? [];
              const isUpdating = updatingId === order.id;
              return (
                <div
                  key={order.id}
                  className={`bg-gray-900 border rounded-2xl p-4 flex flex-col gap-3 ${
                    order.status === 'pending' ? 'border-amber-500/50' : 'border-gray-800'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold text-base">
                        {order.table_label ?? 'Unknown Table'}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        #{order.id.slice(-8).toUpperCase()} · {elapsed(order.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLOR[order.status]}`}
                    >
                      {STATUS_LABEL[order.status]}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">
                          <span className="text-gray-500 mr-1.5">{item.quantity}×</span>
                          {item.item_name}
                        </span>
                        <span className="text-gray-400">₹{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Special instructions */}
                  {order.special_instructions && (
                    <div className="flex gap-2 bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-2">
                      <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">{order.special_instructions}</p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-800">
                    <span className="text-gray-500 text-xs">Total</span>
                    <span className="text-white font-bold">₹{Number(order.total_amount).toFixed(2)}</span>
                  </div>

                  {/* Action buttons */}
                  {transitions.length > 0 && (
                    <div className="flex gap-2">
                      {transitions.filter((t) => t !== 'cancelled').map((nextStatus) => (
                        <button
                          key={nextStatus}
                          onClick={() => handleTransition(order.id, nextStatus)}
                          disabled={isUpdating}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-xl transition"
                        >
                          {isUpdating ? (
                            <Loader2 size={12} className="animate-spin mx-auto" />
                          ) : (
                            ACTION_LABEL[nextStatus] ?? nextStatus
                          )}
                        </button>
                      ))}
                      {transitions.includes('cancelled') && (
                        <button
                          onClick={() => handleTransition(order.id, 'cancelled')}
                          disabled={isUpdating}
                          className="px-3 py-2 text-red-400 hover:bg-red-900/30 disabled:opacity-50 text-xs font-medium rounded-xl transition border border-red-900/40"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment method modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80">
            <h2 className="text-white font-bold text-base mb-4">Select Payment Method</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(['cash', 'upi', 'card', 'other'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                    paymentMethod === m
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => doTransition(showPaymentModal, 'paid', paymentMethod)}
                disabled={!!updatingId}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {updatingId ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
