// app/(marketing)/privacy-policy/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — MenuFlow',
};

const LAST_UPDATED = 'June 1, 2025';

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Information we collect</h2>
            <p>
              When you use MenuFlow as a customer, we collect your mobile number (for OTP
              verification) or Google account information (name, email, profile picture) if you
              choose to log in with Google. We also collect your order history within the
              restaurant where you are ordering.
            </p>
            <p className="mt-3">
              Guest sessions do not collect any personally identifiable information beyond a
              randomly generated identifier that expires within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. How we use your information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Authenticate your session and associate orders with your account.</li>
              <li>Track your loyalty visit streak so you can earn rewards.</li>
              <li>Allow restaurant staff to view your order history within their restaurant.</li>
              <li>Send you OTP messages via SMS (if you use mobile login).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Data isolation</h2>
            <p>
              Your data is scoped to the restaurant where you placed orders. A customer record
              created at Restaurant A is not visible to Restaurant B. We use Row-Level Security at
              the database layer to enforce this isolation.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Data retention</h2>
            <p>
              Guest session data is automatically deleted after 24 hours. Authenticated customer
              data is retained for as long as you have an account. You may request deletion by
              contacting us at{' '}
              <a href="mailto:privacy@menuflow.in" className="text-amber-400 hover:text-amber-300">
                privacy@menuflow.in
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Third-party services</h2>
            <p>
              We use Supabase for database and authentication, MSG91 for SMS delivery, and Google
              OAuth for Google login. Each of these services has their own privacy policy. We do
              not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Contact</h2>
            <p>
              For privacy-related requests, email{' '}
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
