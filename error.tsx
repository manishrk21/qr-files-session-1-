'use client';
// app/error.tsx
// Global error boundary for the Next.js App Router.
// Catches unhandled errors in the root layout segment.
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to error tracking service (e.g. Sentry) in production
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl text-sm transition"
          >
            Go Home
          </a>
        </div>
      </div>
    </main>
  );
}
