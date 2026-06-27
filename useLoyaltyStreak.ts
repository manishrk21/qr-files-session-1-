// hooks/useLoyaltyStreak.ts
'use client';
import { useState, useEffect } from 'react';

interface LoyaltyStreak {
  isGuest: boolean;
  customerId?: string;
  totalVisits: number;
  streakTarget: number;
  currentCycleVisits: number;
  isStreakComplete: boolean;
  completedCycles: number;
  pendingRewards: Array<{
    id: string;
    reward_description: string;
    is_redeemed: boolean;
    issued_at: string;
  }>;
}

interface UseLoyaltyStreakResult {
  data: LoyaltyStreak | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLoyaltyStreak(): UseLoyaltyStreakResult {
  const [data, setData] = useState<LoyaltyStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStreak() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/customer/loyalty');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error?.message ?? 'Could not load loyalty data');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStreak();
  }, []);

  return { data, loading, error, refetch: fetchStreak };
}
