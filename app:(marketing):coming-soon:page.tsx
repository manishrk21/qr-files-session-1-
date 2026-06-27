// app/(marketing)/coming-soon/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Coming Soon — MenuFlow',
  description: 'Something exciting is being prepared.',
};

export default function ComingSoonPage() {
  return (
    <main className="bg-gray-950 text-white min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ChefHat size={28} className="text-amber-400" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Something's cooking</h1>
        <p className="text-gray-400 leading-relaxed mb-8">
          This feature is being prepared with care. We'll have it ready soon.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-xl text-sm transition"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
