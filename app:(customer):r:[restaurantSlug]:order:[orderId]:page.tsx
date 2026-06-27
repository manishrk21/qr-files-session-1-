'use client';
// app/(customer)/r/[restaurantSlug]/order/[orderId]/page.tsx
// Real-time order status tracker for customers.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRealtimeOrder } from '@/hooks/useRealtimeOrder';
import { ShoppingBag, CheckCircle, ChefHat, Bell, CreditCard, Clock, ArrowLeft } from 'lucide-react';
import type { OrderStatus } from '@/types/domain';

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  item_food_type: string;
  quantity: number;
  subtotal: number;
}

interface OrderData {
  orderId: string;
  status: OrderStatus;
  tableLabel: string | null;
  items: OrderItem[];
  summary: { subtotal: number; taxAmount: number; total: number };
  specialInstructions: string | null;
  createdAt: string;
  statusHistory: { status: string; at: string }[];
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: 'pending',
    label: 'Order Placed',
    icon: <ShoppingBag size={20} />,
    desc: 'Your order is waiting to be accepted',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    icon: <CheckCircle size={20} />,
    desc: 'Restaurant has accepted your order',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    icon: <ChefHat size={20} />,
    desc: 'Your food is being prepared',
  },
  {
    key: 'ready',
    label: 'Ready',
    icon: <Bell size={20} />,
    desc: 'Your order is ready to be served!',
  },
  {
    key: 'served',
    label: 'Served',
    icon: <CheckCircle size={20} />,
    desc: 'Enjoy your meal!',
  },
];

const STATUS_INDEX: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  served: 4,
  paid: 4,
};

// Orders can only be customer-cancelled before the kitchen starts preparing them —
// matches CANCELLABLE_STATUSES in /api/orders/[orderId]/cancel/route.ts
const CANCELLABLE_STATUSES: OrderStatus[] = ['pending', 'accepted'];

export default function OrderTrackingPage() {
  const params = useParams<{ restaurantSlug: string; orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${params.orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrder(data.data);
        else setError('Order not found');
      })
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [params.orderId]);

  // Subscribe to realtime status updates
  const realtimeState = useRealtimeOrder(
    params.orderId,
    (order?.status ?? 'pending') as OrderStatus,
  );

  // Sync realtime status back to order state
  useEffect(() => {
    if (realtimeState.status && order && realtimeState.status !== order.status) {
      setOrder((prev) => prev && { ...prev, status: realtimeState.status! });
    }
  }, [realtimeState.status]);

  async function handleCancelRequest() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${params.orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev) => prev && { ...prev, status: data.data.status });
        setShowCancelConfirm(false);
      } else {
        // Surface the backend's specific reason (e.g. "kitchen already started preparing")
        setCancelError(data.error?.message ?? 'Could not request cancellation');
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading your order…</div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-gray-500">{error ?? 'Order not found'}</p>
        <Link
          href={`/r/${params.restaurantSlug}/menu`}
          className="mt-4 text-sm text-gray-900 underline"
        >
          Back to menu
        </Link>
      </main>
    );
  }

  const currentStatus = order.status;
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'cancel_requested';
  const isPaid = currentStatus === 'paid';
  const currentStep = STATUS_INDEX[currentStatus] ?? 0;
  const canCancel = CANCELLABLE_STATUSES.includes(currentStatus);

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link href={`/r/${params.restaurantSlug}/menu`}>
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="font-bold text-gray-900 text-base">Order Tracking</h1>
          <p className="text-xs text-gray-500">#{order.orderId.slice(-8).toUpperCase()}</p>
        </div>
        {order.tableLabel && (
          <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {order.tableLabel}
          </span>
        )}
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Status banner */}
        {isCancelled ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-700 font-semibold text-base">
              {currentStatus === 'cancel_requested' ? 'Cancellation Requested' : 'Order Cancelled'}
            </p>
            <p className="text-red-500 text-sm mt-1">
              {currentStatus === 'cancel_requested'
                ? 'The restaurant is reviewing your cancellation request'
                : 'Your order has been cancelled'}
            </p>
          </div>
        ) : isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-bold text-base">All done!</p>
            <p className="text-green-600 text-sm mt-1">Thank you for dining with us</p>
          </div>
        ) : (
          /* Progress stepper */
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-5">
              {STATUS_STEPS[currentStep]?.desc ?? 'Processing your order'}
            </p>
            <div className="relative">
              {/* Track line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
              <div
                className="absolute left-4 top-4 w-0.5 bg-amber-400 transition-all duration-700"
                style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
              />

              <div className="space-y-6">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx < currentStep;
                  const active = idx === currentStep;
                  return (
                    <div key={step.key} className="flex items-center gap-4 relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                          done
                            ? 'bg-amber-400 text-white'
                            : active
                            ? 'bg-amber-400 text-white shadow-lg shadow-amber-200'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {step.icon}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            done || active ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        {active && (
                          <p className="text-xs text-amber-600 mt-0.5 animate-pulse">In progress…</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Order</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  <span className="text-gray-400 mr-1.5">{item.quantity}×</span>
                  {item.item_name}
                </span>
                <span className="text-gray-700 font-medium">₹{Number(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>₹{Number(order.summary.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax</span>
              <span>₹{Number(order.summary.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 mt-1">
              <span>Total</span>
              <span>₹{Number(order.summary.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Special instructions */}
        {order.specialInstructions && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <p className="text-xs font-medium text-amber-700 mb-0.5">Special Instructions</p>
            <p className="text-sm text-amber-800">{order.specialInstructions}</p>
          </div>
        )}

        {/* Add more items + cancel CTAs (only when pending/accepted) */}
        {canCancel && (
          <>
            <Link
              href={`/r/${params.restaurantSlug}/menu`}
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm font-medium text-gray-500 hover:border-amber-300 hover:text-amber-600 transition"
            >
              <ShoppingBag size={16} />
              Add more items
            </Link>

            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center justify-center w-full text-sm font-medium text-gray-400 hover:text-red-500 py-2 transition"
            >
              Cancel this order
            </button>
          </>
        )}

        {/* Back to menu */}
        {(isPaid || isCancelled) && (
          <Link
            href={`/r/${params.restaurantSlug}/menu`}
            className="flex items-center justify-center w-full bg-gray-900 text-white rounded-2xl py-3.5 text-sm font-semibold"
          >
            Back to Menu
          </Link>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-gray-900 text-base mb-2">Cancel this order?</h2>
            <p className="text-sm text-gray-500 mb-4">
              We'll ask the restaurant to confirm. If they've already started preparing
              your food, they may not be able to cancel it.
            </p>
            {cancelError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Keep order
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition"
              >
                {cancelling ? 'Requesting…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
