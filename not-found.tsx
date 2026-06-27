// app/not-found.tsx
import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ChefHat size={28} className="text-amber-400" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <p className="text-gray-400 text-lg mb-2">Page not found</p>
        <p className="text-gray-600 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
          >
            Back to Home
          </Link>
          <Link
            href="/admin/login"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl text-sm transition"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </main>
  );
}
