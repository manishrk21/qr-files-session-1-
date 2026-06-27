'use client';
// app/(admin)/admin/[restaurantSlug]/orders/[orderId]/page.tsx
// Full detail view for a single order. Linked from the live orders board.
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Loader2, User, Phone, CreditCard, Clock,
  CheckCircle, AlertCircle, ChefHat, Bell,
} from 'lucide-react';
import type { OrderStatus } from '@/types/domain';

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  item_food_type: 'veg' | 'non_veg' | 'egg';
  quantity: number;
  subtotal: number;
}

interface OrderDetail {
  orderId: string;
  status: OrderStatus;
  tableLabel: string | null;
  customer: { name: string | null; mobileNumber: string | null; isGuest: boolean } | null;
  items: OrderItem[];
  summary: { subtotal: number; taxAmount: number; taxRate: number; total: number };
  payment: { method: string | null; status: string };
  specialInstructions: string | null;
  notes: string | null;
  statusHistory: { status: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:          ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  preparing:        ['ready'],
  ready:            ['served'],
  served:           ['paid'],
  cancel_requested: ['cancelled', 'accepted'],
};

const ACTION_LABEL: Record<string, string> = {
  accepted:  'Accept',
  preparing: 'Start Preparing',
  ready:     'Mark Ready',
  served:    'Mark Served',
  paid:      'Mark Paid',
  cancelled: 'Cancel Order',
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

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:  <Clock size={14} />,
  accepted: <CheckCircle size={14} />,
  preparing: <ChefHat size={14} />,
  ready:    <Bell size={14} />,
  served:   <CheckCircle size={14} />,
  paid:     <CreditCard size={14} />,
  cancel_requested: <AlertCircle size={14} />,
};

const FOOD_TYPE_DOT: Record<string, string> = {
  veg:     'bg-green-500',
  non_veg: 'bg-red-500',
  egg:     'bg-yellow-500',
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ restaurantSlug: string; orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other'>('cash');

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/orders/${params.orderId}`);
    const data = await res.json();
    if (data.success) {
      setOrder(data.data);
    } else {
      toast.error(data.error?.message ?? 'Could not load order');
    }
    setLoading(false);
  }, [params.orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function handleTransition(newStatus: string) {
    if (newStatus === 'paid') {
      setShowPaymentModal(true);
      return;
    }
    await doTransition(newStatus);
  }

  async function doTransition(newStatus: string, method?: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(method ? { paymentMethod: method } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order marked as ${newStatus.replace('_', ' ')}`);
        fetchOrder();
      } else {
        toast.error(data.error?.message ?? 'Status update failed');
      }
    } finally {
      setUpdating(false);
      setShowPaymentModal(false);
    }
  }

  function elapsed(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 size={32} className="text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-gray-400 mb-4">Order not found.</p>
        <Link
          href={`/admin/${params.restaurantSlug}/orders`}
          className="text-amber-400 text-sm underline"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[order.status] ?? [];
  const isTerminal = ['paid', 'cancelled'].includes(order.status);

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/admin/${params.restaurantSlug}/orders`)}
          className="text-gray-400 hover:text-gray-200 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {order.tableLabel ?? 'Unknown Table'}
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            #{order.orderId.slice(-8).toUpperCase()} · placed {elapsed(order.createdAt)}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 flex-shrink-0 ${STATUS_COLOR[order.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
        >
          {STATUS_ICON[order.status]}
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="md:col-span-2 space-y-5">

          {/* Order items */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${FOOD_TYPE_DOT[item.item_food_type] ?? 'bg-gray-500'}`} />
                  <span className="text-gray-500 text-sm w-5 flex-shrink-0">{item.quantity}×</span>
                  <span className="text-gray-300 text-sm flex-1">{item.item_name}</span>
                  <span className="text-gray-400 text-sm">₹{Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>₹{Number(order.summary.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax ({order.summary.taxRate}%)</span>
                <span>₹{Number(order.summary.taxAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-1.5 border-t border-gray-800">
                <span>Total</span>
                <span>₹{Number(order.summary.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Special instructions */}
          {order.specialInstructions && (
            <div className="bg-amber-900/20 border border-amber-800/40 rounded-2xl p-4 flex gap-3">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-300 mb-1">Special Instructions</p>
                <p className="text-sm text-amber-200">{order.specialInstructions}</p>
              </div>
            </div>
          )}

          {/* Internal notes */}
          {order.notes && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-400 mb-1">Internal Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-line">{order.notes}</p>
            </div>
          )}

          {/* Status history timeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Status History</h2>
            <div className="space-y-3">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-gray-300 capitalize flex-1">
                    {h.status.replace('_', ' ')}
                  </span>
                  <span className="text-gray-500 text-xs">{formatDateTime(h.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Customer */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Customer</h2>
            {order.customer ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <User size={14} className="text-gray-500" />
                  {order.customer.isGuest ? (
                    <span className="text-gray-500 italic">Guest</span>
                  ) : (
                    order.customer.name ?? <span className="text-gray-500 italic">Unnamed</span>
                  )}
                </div>
                {order.customer.mobileNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone size={14} className="text-gray-500" />
                    {order.customer.mobileNumber}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No customer linked</p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Payment</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${order.payment.status === 'paid' ? 'text-green-400' : 'text-amber-300'}`}>
                  {order.payment.status}
                </span>
              </div>
              {order.payment.method && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Method</span>
                  <span className="text-gray-300 uppercase">{order.payment.method}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-bold">₹{Number(order.summary.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isTerminal && transitions.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2.5">
              <h2 className="text-white font-semibold text-sm mb-3">Actions</h2>
              {transitions.filter((t) => t !== 'cancelled').map((nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() => handleTransition(nextStatus)}
                  disabled={updating}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  {updating
                    ? <Loader2 size={14} className="animate-spin mx-auto" />
                    : ACTION_LABEL[nextStatus] ?? nextStatus}
                </button>
              ))}
              {transitions.includes('cancelled') && (
                <button
                  onClick={() => handleTransition('cancelled')}
                  disabled={updating}
                  className="w-full py-2.5 text-red-400 hover:bg-red-900/30 disabled:opacity-50 text-sm font-medium rounded-xl transition border border-red-900/40"
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}

          {isTerminal && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">
                This order is <span className="text-gray-300 font-medium">{order.status}</span>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment method modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
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
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => doTransition('paid', paymentMethod)}
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {updating ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
