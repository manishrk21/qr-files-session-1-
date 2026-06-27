// hooks/useRealtimeMenu.ts
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AvailabilityChange {
  itemId: string;
  isAvailable: boolean;
}

type OnChangeCallback = (change: AvailabilityChange) => void;

export function useRealtimeMenu(restaurantId: string, onChange: OnChangeCallback) {
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`restaurant:${restaurantId}:menu`)
      .on('broadcast', { event: 'availability_changed' }, (payload) => {
        onChange(payload.payload as AvailabilityChange);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, onChange]);
}
