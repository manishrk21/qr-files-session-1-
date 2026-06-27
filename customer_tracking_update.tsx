// app/(customer)/r/[restaurantSlug]/order/[orderId]/page.tsx
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

// NOTE: This snippet is intended to be integrated into the existing page component.

export function CustomerOrderTrackingIntegration() {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('pending'); // Example state
  const [order, setOrder] = useState<any>(null); // Example state
  const params = { restaurantSlug: 'cafe', orderId: '123' };

  async function handleCancelRequest() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${params.orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev: any) => prev && { ...prev, status: data.data.status });
        setShowCancelConfirm(false);
      } else {
        alert(data.error?.message ?? 'Could not request cancellation');
      }
    } finally {
      setCancelling(false);
    }
  }

  // JSX for buttons
  return (
    <>
      {['pending', 'accepted'].includes(currentStatus) && (
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

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-gray-900 text-base mb-2">Cancel this order?</h2>
            <p className="text-sm text-gray-500 mb-5">
              We'll ask the restaurant to confirm. If they've already started preparing
              your food, they may not be able to cancel it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
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
    </>
  );
}
