// app/(marketing)/layout.tsx
import Link from 'next/link';
import { ChefHat } from 'lucide-react';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <ChefHat size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">MenuFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-gray-400 hover:text-white text-sm transition">About</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition">Contact</Link>
            <Link href="/list-your-cafe" className="text-gray-400 hover:text-white text-sm transition">List your café</Link>
          </nav>
          <Link
            href="/admin/login"
            className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <div className="pt-16">{children}</div>

      <footer className="bg-gray-950 border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                  <ChefHat size={14} className="text-white" />
                </div>
                <span className="text-white font-bold">MenuFlow</span>
              </div>
              <p className="text-gray-500 text-sm max-w-xs">
                Contactless QR ordering for restaurants. No app download required.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
              <div className="space-y-2">
                <p className="text-gray-400 font-medium mb-3">Product</p>
                <Link href="/list-your-cafe" className="block text-gray-500 hover:text-white transition">List your café</Link>
                <Link href="/about" className="block text-gray-500 hover:text-white transition">About</Link>
                <Link href="/contact" className="block text-gray-500 hover:text-white transition">Contact</Link>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 font-medium mb-3">Legal</p>
                <Link href="/privacy-policy" className="block text-gray-500 hover:text-white transition">Privacy Policy</Link>
                <Link href="/terms-of-service" className="block text-gray-500 hover:text-white transition">Terms of Service</Link>
                <Link href="/cookie-policy" className="block text-gray-500 hover:text-white transition">Cookie Policy</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} MenuFlow. All rights reserved.
            </p>
            <p className="text-gray-700 text-xs">Made with care in India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </>
  );
}
