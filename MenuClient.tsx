// app/(customer)/r/[restaurantSlug]/menu/MenuClient.tsx
'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Leaf, Drumstick, Egg } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import { useRealtimeMenu } from '@/hooks/useRealtimeMenu';
import type { FoodType } from '@/types/domain';

// ─── Types (matching server page.tsx output) ──────────────────────────────────
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

// ─── Food type indicators ─────────────────────────────────────────────────────
function FoodTypeIndicator({ type }: { type: FoodType }) {
  if (type === 'veg') return (
    <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-green-600 rounded-sm">
      <span className="w-2 h-2 rounded-full bg-green-600" />
    </span>
  );
  if (type === 'non_veg') return (
    <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-red-600 rounded-sm">
      <span className="w-2 h-2 rounded-full bg-red-600" />
    </span>
  );
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 border-2 border-yellow-500 rounded-sm">
      <span className="w-2 h-2 rounded-full bg-yellow-500" />
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

  const { items, addItem, removeItem, updateQuantity, totalItems, subtotal, restaurantId, setRestaurant } = useCartStore();

  // Set this restaurant in the cart store
  if (restaurantId !== restaurant.id) setRestaurant(restaurant.id);

  // Live availability changes via Supabase Realtime
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

  // Cart quantity helpers
  const getQty = (id: string) => items.find((i) => i.menuItemId === id)?.quantity ?? 0;

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setPlacingOrder(true);
    try {
      const tableId = ''; // TODO: read from session cookie via context or API
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId, // Will be filled from server session
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/r/${restaurant.slug}/order/${data.data.orderId}`);
      } else {
        toast.error(data.error?.message ?? 'Could not place order');
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  const taxAmount = Number((subtotal() * (restaurant.taxRate / 100)).toFixed(2));
  const total = Number((subtotal() + taxAmount).toFixed(2));

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: restaurant.branding?.font_family ?? 'Inter' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: restaurant.branding?.primary_color ?? '#000' }}
      >
        <div className="flex items-center gap-3">
          {restaurant.logoUrl && (
            <img src={restaurant.logoUrl} alt={restaurant.name} className="h-8 w-8 rounded-full object-cover" />
          )}
          <span className="text-white font-semibold text-sm">{restaurant.name}</span>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 bg-white/20 text-white rounded-full px-3 py-1.5 text-sm"
        >
          <ShoppingCart size={16} />
          {totalItems() > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: restaurant.branding?.accent_color ?? '#f59e0b' }}
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              style={activeCategory === cat.id ? { backgroundColor: restaurant.branding?.primary_color ?? '#000' } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

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
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 mb-1">
                        <FoodTypeIndicator type={item.food_type} />
                        <span className="text-sm font-medium text-gray-900 leading-tight">{item.name}</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 leading-snug mb-1 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-sm font-semibold text-gray-900">₹{item.price.toFixed(2)}</p>
                      {!item.is_available && (
                        <span className="text-xs text-red-500 font-medium">Sold Out</span>
                      )}
                    </div>

                    {/* Image + Add button */}
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

                      {/* Quantity control */}
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
                              style={{ borderColor: restaurant.branding?.primary_color ?? '#000', color: restaurant.branding?.primary_color ?? '#000' }}
                            >
                              <Plus size={12} /> ADD
                            </button>
                          ) : (
                            <div
                              className="flex items-center gap-2 bg-white border-2 rounded-lg px-2 py-1 shadow-sm"
                              style={{ borderColor: restaurant.branding?.primary_color ?? '#000' }}
                            >
                              <button onClick={() => updateQuantity(item.id, qty - 1)} className="text-gray-700">
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-bold w-4 text-center" style={{ color: restaurant.branding?.primary_color ?? '#000' }}>
                                {qty}
                              </span>
                              <button onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price, food_type: item.food_type, image_url: item.image_url })} className="text-gray-700">
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
            style={{ backgroundColor: restaurant.branding?.primary_color ?? '#000' }}
          >
            <span className="text-sm font-medium bg-white/20 rounded-lg px-2 py-0.5">{totalItems()} item{totalItems() !== 1 ? 's' : ''}</span>
            <span className="text-sm font-semibold">View Cart</span>
            <span className="text-sm font-semibold">₹{subtotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-2">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 py-3 border-b border-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-16 text-right">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>₹{subtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST ({restaurant.taxRate}%)</span><span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full text-white rounded-xl py-3 text-sm font-semibold mt-2 disabled:opacity-50"
                style={{ backgroundColor: restaurant.branding?.primary_color ?? '#000' }}
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
