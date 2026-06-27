// stores/sessionStore.ts
// Client-side session context, populated from the verified cookie payload.
// Used for conditional rendering only — auth is always enforced server-side.
import { create } from 'zustand';

interface SessionState {
  customerId: string | null;
  restaurantId: string | null;
  tableId: string | null;
  isGuest: boolean;
  isHydrated: boolean;

  // Actions
  setSession: (payload: {
    customerId: string;
    restaurantId: string;
    tableId: string | null;
    isGuest: boolean;
  }) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  customerId: null,
  restaurantId: null,
  tableId: null,
  isGuest: false,
  isHydrated: false,

  setSession: (payload) =>
    set({
      customerId: payload.customerId,
      restaurantId: payload.restaurantId,
      tableId: payload.tableId,
      isGuest: payload.isGuest,
    }),

  clearSession: () =>
    set({
      customerId: null,
      restaurantId: null,
      tableId: null,
      isGuest: false,
    }),

  setHydrated: () => set({ isHydrated: true }),
}));
