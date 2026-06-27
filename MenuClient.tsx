// app/(customer)/r/[restaurantSlug]/menu/MenuClient.tsx
'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useRealtimeMenu } from '@/hooks/useRealtimeMenu';
import type { FoodType } from '@/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: FoodType;
  is_available: boolean;
  is_featured: boolean;
  allergens: string[];
  preparation_time_minutes: number | null;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItem[];
}

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isAcceptingOrders: boolean;
  currency: string;
  taxRate: number;
  branding: Branding | null;
}

// ─── Food type indicator ──────────────────────────────────────────────────────
function FoodTypeIndicator({ type }: { type: FoodType }) {
  const colors: Record<FoodType, string> = {
    veg:     'border-green-600',
    non_veg: 'border-red-600',
    egg:     'border-yellow-500',
  };
  const dotColors: Record<FoodType, string> = {
    veg:     'bg-green-600',
    non_veg: 'bg-red-600',
    egg:     'bg-yellow-500',
  };
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 ${colors[type]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColors[type]}`} />
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MenuClient({
  restaurant,
  categories: initialCategories,
}: {
  restaurant: Restaurant;
  categories: Category[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [cartOpen, setCartOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategories[0]?.id ?? '');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const {
    items,
    addItem,
    updateQuantity,
    totalItems,
    subtotal,
    restaurantId,
    setRestaurant,
  } = useCartStore();

  // Sync restaurant into cart store
  if (restaurantId !== restaurant.id) setRestaurant(restaurant.id);

  // Live availability updates via Supabase Realtime
  useRealtimeMenu(
    restaurant.id,
    useCallback((change) => {
      setCategories((cats) =>
        cats.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === change.itemId
              ? { ...item, is_available: change.isAvailable }
              : item,
          ),
        })),
      );
      if (!change.isAvailable) {
        toast.warning('An item in your cart is now unavailable.');
      }
    }, []),
  );

  const getQty = (id: string) => items.find((i) => i.menuItemId === id)?.quantity ?? 0;

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setPlacingOrder(true);
    try {
      // Step 1: Validate cart and retrieve server-side tableId from session
      const validateRes = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        }),
      });
      const validateData = await validateRes.json();
      if (!validateData.success) {
        toast.error(validateData.error?.message ?? 'Some items are no longer available');
        setPlacingOrder(false);
        return;
      }

      // Step 2: Place the order using the tableId returned from the session
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: validateData.data.tableId,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          specialInstructions: specialInstructions.trim() || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (orderData.success) {
        setCartOpen(false);
        router.push(`/r/${restaurant.slug}/order/${orderData.data.orderId}`);
      } else {
        toast.error(orderData.error?.message ?? 'Could not place order');
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  const taxAmount = Number((subtotal() * (restaurant.taxRate / 100)).toFixed(2));
  const total = Number((subtotal() + taxAmount).toFixed(2));
  const primaryColor = restaurant.branding?.primary_color ?? '#000000';
  const accentColor = restaurant.branding?.accent_color ?? '#f59e0b';

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: restaurant.branding?.font_family ?? 'Inter' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          {restaurant.logoUrl && (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <span className="text-white font-semibold text-sm">{restaurant.name}</span>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 bg-white/20 text-white rounded-full px-3 py-1.5 text-sm"
        >
          <ShoppingCart size={16} />
          {totalItems() > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: accentColor }}
            >
              {totalItems()}
            </span>
          )}
        </button>
      </header>

      {/* Category tabs */}
      <div className="sticky top-14 z-10 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition"
              style={
                activeCategory === cat.id
                  ? { backgroundColor: primaryColor, color: '#fff' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Closed banner */}
      {!restaurant.isAcceptingOrders && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          This restaurant is not accepting orders right now.
        </div>
      )}

      {/* Menu items */}
      <main className="pb-32">
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="px-4 pt-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">{cat.name}</h2>
            <div className="space-y-3">
              {cat.items.map((item) => {
                const qty = getQty(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 py-3 border-b border-gray-50 ${!item.is_available ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 mb-1">
                        <FoodTypeIndicator type={item.food_type} />
                        <span className="text-sm font-medium text-gray-900 leading-tight">
                          {item.name}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 leading-snug mb-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.allergens.length > 0 && (
                        <p className="text-xs text-gray-400 mb-1">
                          Contains: {item.allergens.join(', ')}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{item.price.toFixed(2)}
                      </p>
                      {!item.is_available && (
                        <span className="text-xs text-red-500 font-medium">Sold Out</span>
                      )}
                    </div>

                    <div className="relative flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-24 h-20 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-24 h-20 bg-gray-100 rounded-xl" />
                      )}

                      {item.is_available && restaurant.isAcceptingOrders && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          {qty === 0 ? (
                            <button
                              onClick={() =>
                                addItem({
                                  menuItemId: item.id,
                                  name: item.name,
                                  price: item.price,
                                  food_type: item.food_type,
                                  image_url: item.image_url,
                                })
                              }
                              className="flex items-center gap-1 bg-white border-2 rounded-lg px-3 py-1 text-xs font-bold shadow-sm"
                              style={{ borderColor: primaryColor, color: primaryColor }}
                            >
                              <Plus size={12} /> ADD
                            </button>
                          ) : (
                            <div
                              className="flex items-center gap-2 bg-white border-2 rounded-lg px-2 py-1 shadow-sm"
                              style={{ borderColor: primaryColor }}
                            >
                              <button
                                onClick={() => updateQuantity(item.id, qty - 1)}
                                className="text-gray-700"
                              >
                                <Minus size={12} />
                              </button>
                              <span
                                className="text-xs font-bold w-4 text-center"
                                style={{ color: primaryColor }}
                              >
                                {qty}
                              </span>
                              <button
                                onClick={() =>
                                  addItem({
                                    menuItemId: item.id,
                                    name: item.name,
                                    price: item.price,
                                    food_type: item.food_type,
                                    image_url: item.image_url,
                                  })
                                }
                                className="text-gray-700"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* View Cart sticky bar */}
      {totalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between text-white rounded-xl px-4 py-3"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-sm font-medium bg-white/20 rounded-lg px-2 py-0.5">
              {totalItems()} item{totalItems() !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-semibold">View Cart</span>
            <span className="text-sm font-semibold">₹{subtotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-xl leading-none">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-2">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 py-3 border-b border-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}

              {/* Special instructions */}
              <div className="py-3">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Special instructions <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Allergies, less spice, extra sauce…"
                  className="w-full text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST ({restaurant.taxRate}%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full text-white rounded-xl py-3 text-sm font-semibold mt-2 disabled:opacity-50 transition"
                style={{ backgroundColor: primaryColor }}
              >
                {placingOrder ? 'Placing order…' : `Place Order · ₹${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
