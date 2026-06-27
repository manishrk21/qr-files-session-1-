// app/(marketing)/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About MenuFlow',
  description: 'Learn why we built MenuFlow and what drives us.',
};

export default function AboutPage() {
  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">

        <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">About</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          We built the menu<br />we wished existed.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-12 max-w-xl">
          MenuFlow started from a simple frustration: waiting for a physical menu, finding it sticky,
          or having to flag down a waiter to find out if something was available. We built the tool
          we wanted as customers — and gave it to restaurants as the easiest way to modernise.
        </p>

        <div className="space-y-10 border-t border-gray-800 pt-12">
          {[
            {
              title: 'Built for India',
              body: 'We\'ve thought carefully about Indian dining — thali menus, chai counters, fast-casual dhabas, and fine-dining restaurants. Veg / non-veg / egg indicators, INR pricing, and OTP via Indian mobile numbers are all first-class concerns.',
            },
            {
              title: 'No app, no friction',
              body: 'The biggest blocker to contactless ordering has always been "download our app". We removed that. Customers scan a QR code, verify with a one-time OTP or Google login, and order in under 60 seconds.',
            },
            {
              title: 'Real-time at the core',
              body: 'Every order update — from "pending" to "served" — is pushed to the customer\'s phone the instant the kitchen acts. No polling, no refresh. Your staff sees the same live board.',
            },
            {
              title: 'Tenant-isolated by design',
              body: 'Every restaurant\'s data is isolated at the database level using Row-Level Security. Your customers\' data stays with you — we can\'t mix records across tenants, even accidentally.',
            },
          ].map((s) => (
            <div key={s.title}>
              <h2 className="text-white font-bold text-xl mb-3">{s.title}</h2>
              <p className="text-gray-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-12 border-t border-gray-800">
          <Link
            href="/list-your-cafe"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition"
          >
            List your restaurant
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
