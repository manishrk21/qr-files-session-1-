// app/(marketing)/cookie-policy/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — MenuFlow',
};

export default function CookiePolicyPage() {
  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl font-bold mb-3">Cookie Policy</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: June 1, 2025</p>

        <div className="space-y-8 text-gray-400 leading-relaxed text-sm">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">What cookies do we use?</h2>
            <p>MenuFlow uses a minimal number of cookies, all strictly necessary for the Service to function.</p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-300 pb-3 pr-6">Cookie name</th>
                    <th className="text-left text-gray-300 pb-3 pr-6">Purpose</th>
                    <th className="text-left text-gray-300 pb-3 pr-6">Duration</th>
                    <th className="text-left text-gray-300 pb-3">Type</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {[
                    ['mf-customer-session', 'Authenticates you as a customer at a restaurant', '7 days (OTP/Google) / 24h (Guest)', 'Strictly necessary'],
                    ['sb-*-auth-token', 'Supabase admin authentication (admin panel only)', 'Session', 'Strictly necessary'],
                  ].map(([name, purpose, duration, type]) => (
                    <tr key={name} className="border-b border-gray-800">
                      <td className="py-3 pr-6 font-mono text-amber-400">{name}</td>
                      <td className="py-3 pr-6 text-gray-400">{purpose}</td>
                      <td className="py-3 pr-6 text-gray-400 whitespace-nowrap">{duration}</td>
                      <td className="py-3 text-gray-400">{type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">No tracking or advertising cookies</h2>
            <p>
              We do not use analytics cookies, advertising cookies, or any third-party tracking
              scripts on MenuFlow. We do not run ads, and we do not share your cookie data with
              advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">How to control cookies</h2>
            <p>
              All cookies set by MenuFlow are HttpOnly and SameSite=Lax, meaning they cannot be
              accessed by JavaScript and are not sent on cross-site requests. You can clear them
              via your browser settings at any time. Doing so will sign you out of any active
              sessions.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">Questions</h2>
            <p>
              Email{' '}
              <a href="mailto:privacy@menuflow.in" className="text-amber-400 hover:text-amber-300">
                privacy@menuflow.in
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
