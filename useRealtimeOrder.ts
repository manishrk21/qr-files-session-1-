// hooks/useRealtimeOrder.ts
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/types/domain';

interface RealtimeOrderState {
  status: OrderStatus | null;
  updatedAt: string | null;
}

export function useRealtimeOrder(orderId: string, initialStatus: OrderStatus) {
  const [state, setState] = useState<RealtimeOrderState>({
    status: initialStatus,
    updatedAt: null,
  });

  useEffect(() => {
    if (!orderId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`order:${orderId}`)
      .on('broadcast', { event: 'status_update' }, (payload) => {
        setState({
          status: payload.payload.status as OrderStatus,
          updatedAt: new Date().toISOString(),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return state;
}
