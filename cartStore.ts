// stores/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@/types/domain';

interface CartState {
  restaurantId: string | null;
  items: CartItem[];
  specialInstructions: string;

  // Actions
  setRestaurant: (restaurantId: string) => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  setSpecialInstructions: (text: string) => void;
  clearCart: () => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      items: [],
      specialInstructions: '',

      setRestaurant: (restaurantId) => {
        // Clear cart if switching restaurants
        if (get().restaurantId && get().restaurantId !== restaurantId) {
          set({ restaurantId, items: [], specialInstructions: '' });
        } else {
          set({ restaurantId });
        }
      },

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.menuItemId === item.menuItemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        })),

      updateQuantity: (menuItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.menuItemId !== menuItemId) };
          }
          return {
            items: state.items.map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity } : i,
            ),
          };
        }),

      setSpecialInstructions: (text) => set({ specialInstructions: text }),

      clearCart: () => set({ items: [], specialInstructions: '' }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),

      subtotal: () =>
        Number(
          get()
            .items.reduce((s, i) => s + i.price * i.quantity, 0)
            .toFixed(2),
        ),
    }),
    {
      name: 'mf-cart',
      // Only persist items and restaurantId — clear on page reload is fine for instructions
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        items: state.items,
      }),
    },
  ),
);
