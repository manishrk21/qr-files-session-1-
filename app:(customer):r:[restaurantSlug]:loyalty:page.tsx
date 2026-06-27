// app/(customer)/r/[restaurantSlug]/loyalty/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Gift, Star, Lock } from 'lucide-react';

interface LoyaltyData {
  isGuest: boolean;
  customerId?: string;
  totalVisits?: number;
  streakTarget?: number;
  currentCycleVisits?: number;
  isStreakComplete?: boolean;
  completedCycles?: number;
  pendingRewards?: Array<{
    id: string;
    reward_description: string;
    is_redeemed: boolean;
    issued_at: string;
  }>;
}

export default function LoyaltyPage() {
  const params = useParams<{ restaurantSlug: string }>();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/loyalty')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading rewards…</div>
      </main>
    );
  }

  // ── Guest gate — "Login to reveal rewards" ──────────────────────────────────
  if (!data || data.isGuest) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm text-center space-y-6">
          {/* Blurred preview */}
          <div className="relative">
            <div className="blur-sm select-none pointer-events-none">
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                      <Star size={16} className="text-amber-400" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">3 of 5 visits completed</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full w-3/5" />
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-amber-900">🎁 Free coffee on 5th visit!</p>
                </div>
              </div>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
              <Lock size={28} className="text-gray-500 mb-2" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900">Login to reveal your rewards</h2>
            <p className="text-sm text-gray-500">
              Track your loyalty streak and earn free items — only available to logged-in customers.
            </p>
          </div>

          <Link
            href={`/r/${params.restaurantSlug}`}
            className="block w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-medium text-center"
          >
            Login or sign up
          </Link>
        </div>
      </main>
    );
  }

  // ── Authenticated view ──────────────────────────────────────────────────────
  const { totalVisits = 0, streakTarget = 5, currentCycleVisits = 0, isStreakComplete, completedCycles = 0, pendingRewards = [] } = data;
  const progress = currentCycleVisits / streakTarget;

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Your Rewards</h1>

      {/* Streak card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">Visit Streak</span>
          <span className="text-xs text-gray-400">{totalVisits} total visits</span>
        </div>

        {/* Dots */}
        <div className="flex justify-between gap-2 mb-3">
          {Array.from({ length: streakTarget }).map((_, i) => {
            const filled = i < currentCycleVisits;
            return (
              <div
                key={i}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center transition ${
                  filled ? 'bg-amber-400' : 'bg-gray-100'
                }`}
              >
                {filled && <Star size={16} className="text-white" />}
                {!filled && <span className="text-xs text-gray-400">{i + 1}</span>}
              </div>
            );
          })}
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {isStreakComplete
            ? '🎉 Streak complete! Show this to your server.'
            : `${currentCycleVisits} of ${streakTarget} visits — ${streakTarget - currentCycleVisits} more to go!`}
        </p>
        {completedCycles > 0 && (
          <p className="text-xs text-amber-600 text-center mt-1">
            You've completed {completedCycles} cycle{completedCycles !== 1 ? 's' : ''}!
          </p>
        )}
      </div>

      {/* Pending rewards */}
      {pendingRewards.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Unclaimed Rewards</h2>
          {pendingRewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
            >
              <Gift size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">{reward.reward_description}</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Show this screen to your server to redeem.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingRewards.length === 0 && !isStreakComplete && (
        <div className="text-center mt-8 text-sm text-gray-400">
          <Gift size={32} className="mx-auto mb-3 text-gray-300" />
          Keep visiting to earn rewards!
        </div>
      )}
    </main>
  );
}
