'use client';
// app/(customer)/r/[restaurantSlug]/cart/page.tsx
// Cart review before placing order. Validates items server-side before submission.
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

export default function CartPage() {
  const params = useParams<{ restaurantSlug: string }>();
  const router = useRouter();

  const { items, updateQuantity, clearCart, subtotal, restaurantId } = useCartStore();
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [placing, setPlacing] = useState(false);

  // Derive tax from a local estimate — server recalculates authoritatively
  // We don't know taxRate here without another fetch; show subtotal only.
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setPlacing(true);
    try {
      // First validate cart items are still available
      const validateRes = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        }),
      });
      const validateData = await validateRes.json();
      if (!validateData.success) {
        toast.error(validateData.error?.message ?? 'Some items are no longer available');
        return;
      }

      // Place order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tableId: validateData.data.tableId,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          specialInstructions: specialInstructions.trim() || undefined,
        }),
      });
      const orderData = await orderRes.json();

      if (orderData.success) {
        clearCart();
        router.push(`/r/${params.restaurantSlug}/order/${orderData.data.orderId}`);
      } else {
        toast.error(orderData.error?.message ?? 'Could not place order');
      }
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag size={48} className="text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 text-sm mb-6">Add some items from the menu to get started.</p>
        <Link
          href={`/r/${params.restaurantSlug}/menu`}
          className="bg-gray-900 text-white font-semibold text-sm px-6 py-3 rounded-xl"
        >
          Browse menu
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/r/${params.restaurantSlug}/menu`}>
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="font-bold text-gray-900 text-base">Your Cart</h1>
        <span className="ml-auto text-xs text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={item.menuItemId}
              className={`flex items-start gap-3 px-4 py-3.5 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Food type dot */}
              <div className={`mt-1 w-3 h-3 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                item.food_type === 'veg' ? 'border-green-600' :
                item.food_type === 'non_veg' ? 'border-red-600' : 'border-yellow-500'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  item.food_type === 'veg' ? 'bg-green-600' :
                  item.food_type === 'non_veg' ? 'bg-red-600' : 'bg-yellow-500'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 leading-snug">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">₹{item.price.toFixed(2)} each</p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                >
                  {item.quantity === 1 ? <Trash2 size={12} className="text-red-400" /> : <Minus size={12} />}
                </button>
                <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                >
                  <Plus size={12} />
                </button>
              </div>

              <p className="text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Special instructions */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Special instructions
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Allergies, no spice, extra sauce…"
            className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{specialInstructions.length}/300</p>
        </div>

        {/* Bill summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Bill summary</h2>
          {items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between text-xs text-gray-500">
              <span>{item.quantity}× {item.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
            <span>Subtotal</span>
            <span>₹{subtotal().toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">+ applicable taxes (calculated at checkout)</p>
        </div>
      </div>

      {/* Sticky place order bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl px-4 py-3.5 transition"
        >
          <span className="text-sm font-medium bg-white/10 rounded-lg px-2 py-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="text-sm font-semibold flex items-center gap-2">
            {placing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Placing order…
              </>
            ) : (
              'Place Order'
            )}
          </span>
          <span className="text-sm font-semibold">₹{subtotal().toFixed(2)}</span>
        </button>
      </div>
    </main>
  );
}
