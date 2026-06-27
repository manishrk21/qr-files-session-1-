// app/(marketing)/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  QrCode, Smartphone, ChefHat, BarChart2,
  Star, Shield, Zap, ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'MenuFlow — Contactless QR Ordering for Restaurants',
  description:
    'Let customers scan a QR code, browse your menu, and place orders — no app download, no friction. Real-time order management for restaurant owners.',
};

export default function HomePage() {
  return (
    <main className="bg-gray-950 text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-block text-amber-400 text-xs font-semibold tracking-widest uppercase mb-6 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-full">
              No app download required
            </span>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">
              Your menu,{' '}
              <span className="text-amber-400">one scan</span>{' '}
              away.
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-md">
              Customers scan a QR code at their table, browse your full menu, and order
              — all from their phone. You get live order updates the moment they tap
              "Place Order".
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/list-your-cafe"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition"
              >
                List your restaurant
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-6 py-3.5 rounded-xl text-sm transition"
              >
                How it works
              </Link>
            </div>
          </div>

          {/* Mock phone */}
          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="w-72 bg-gray-900 border border-gray-700 rounded-[2.5rem] p-4 shadow-2xl">
                {/* Phone top bar */}
                <div className="bg-amber-500 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <ChefHat size={12} className="text-white" />
                    </div>
                    <span className="text-white text-xs font-semibold">Demo Café</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center relative">
                    <span className="text-white text-xs">🛒</span>
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  </div>
                </div>
                {/* Category tabs */}
                <div className="flex gap-2 mb-3 overflow-hidden">
                  {['Chai', 'Snacks', 'Mains'].map((cat, i) => (
                    <span key={cat} className={`text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                      {cat}
                    </span>
                  ))}
                </div>
                {/* Menu items */}
                {[
                  { name: 'Masala Chai', price: '₹49', type: 'veg' },
                  { name: 'Veg Sandwich', price: '₹99', type: 'veg' },
                  { name: 'Cold Coffee', price: '₹89', type: 'veg' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3 py-2.5 border-b border-gray-800 last:border-0">
                    <div className="w-2 h-2 rounded-sm border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                      <div className="w-1 h-1 rounded-full bg-green-500" />
                    </div>
                    <span className="text-gray-200 text-xs flex-1">{item.name}</span>
                    <span className="text-gray-400 text-xs">{item.price}</span>
                    <div className="border border-amber-500 rounded-lg px-2 py-0.5 text-amber-500 text-[10px] font-bold">ADD</div>
                  </div>
                ))}
              </div>
              {/* Floating QR hint */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-3 shadow-xl">
                <QrCode size={48} className="text-gray-900" />
                <p className="text-gray-500 text-[10px] text-center mt-1 font-medium">Scan to order</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold">From QR scan to kitchen in seconds</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: <QrCode size={24} />, step: '01', title: 'Customer scans', desc: 'They scan the QR on their table. No app, no friction.' },
              { icon: <Smartphone size={24} />, step: '02', title: 'Browse & order', desc: 'Full menu with photos, allergens, and food-type indicators.' },
              { icon: <ChefHat size={24} />, step: '03', title: 'Kitchen gets it', desc: 'Order appears on your dashboard instantly with a sound alert.' },
              { icon: <BarChart2 size={24} />, step: '04', title: 'Track & analyze', desc: 'Live status updates, revenue charts, and loyalty insights.' },
            ].map((item) => (
              <div key={item.step} className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <span className="absolute top-4 right-4 text-gray-700 text-xs font-mono font-bold">{item.step}</span>
                <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold">Everything your restaurant needs</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Star size={20} />,
                title: 'Loyalty rewards',
                desc: 'Customers earn streak-based rewards. You set the target and the prize.',
              },
              {
                icon: <Zap size={20} />,
                title: 'Real-time orders',
                desc: 'Live order board with sound alerts. Accept, prepare, mark ready — all in one click.',
              },
              {
                icon: <Shield size={20} />,
                title: 'OTP + Google login',
                desc: 'Customers verify with mobile OTP or Google. No passwords, no friction.',
              },
              {
                icon: <QrCode size={20} />,
                title: 'Per-table QR codes',
                desc: 'Generate and download QR codes for every table. Regenerate anytime.',
              },
              {
                icon: <BarChart2 size={20} />,
                title: 'Analytics dashboard',
                desc: 'Daily revenue, top items, active customers — all in a clean chart.',
              },
              {
                icon: <ChefHat size={20} />,
                title: 'Full menu control',
                desc: 'Toggle availability live. Customers see "Sold Out" in real time.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                <div className="w-9 h-9 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to go contactless?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Set up your restaurant in minutes. No hardware required — just a phone with a camera.
          </p>
          <Link
            href="/list-your-cafe"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-8 py-4 rounded-xl text-sm transition"
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
          <p className="text-gray-600 text-xs mt-4">No credit card required</p>
        </div>
      </section>

    </main>
  );
}
