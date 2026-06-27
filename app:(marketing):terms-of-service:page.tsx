// app/(marketing)/terms-of-service/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — MenuFlow',
};

const LAST_UPDATED = 'June 1, 2025';

export default function TermsPage() {
  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">Legal</p>
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-12">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-400 leading-relaxed text-sm">
          <section>
            <h2 className="text-white font-semibold text-lg mb-3">1. Acceptance</h2>
            <p>
              By accessing or using MenuFlow (the "Service"), you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">2. Description of service</h2>
            <p>
              MenuFlow provides a software platform that enables restaurants ("Restaurant Partners")
              to manage their menus and receive orders from customers via QR code scanning.
              MenuFlow is not a restaurant and does not prepare or deliver food.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">3. Restaurant Partner obligations</h2>
            <p>Restaurant Partners agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate menu information including allergen details.</li>
              <li>Fulfil orders placed by customers in a timely manner.</li>
              <li>Not use the platform for any unlawful purpose.</li>
              <li>Maintain the confidentiality of their admin credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">4. Customer obligations</h2>
            <p>
              Customers agree to provide accurate personal information during authentication and
              to place only genuine orders. Fraudulent orders or misuse of the OTP system may
              result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">5. Limitation of liability</h2>
            <p>
              MenuFlow is provided "as is". We are not liable for any direct, indirect, or
              consequential damages arising from your use of the Service, including losses
              resulting from order failures, service downtime, or data breaches caused by
              third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">6. Governing law</h2>
            <p>
              These Terms are governed by the laws of India. Disputes shall be subject to the
              exclusive jurisdiction of the courts of Maharashtra.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">7. Changes to terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-lg mb-3">8. Contact</h2>
            <p>
              Email{' '}
              <a href="mailto:legal@menuflow.in" className="text-amber-400 hover:text-amber-300">
                legal@menuflow.in
              </a>{' '}
              for legal enquiries.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
