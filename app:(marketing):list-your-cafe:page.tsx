'use client';
// app/(marketing)/list-your-cafe/page.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { ChefHat, CheckCircle } from 'lucide-react';

const STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
];

export default function ListYourCafePage() {
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
    tableCount: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Wire to email service / Supabase insert in production
    await new Promise((r) => setTimeout(r, 1200));
    setDone(true);
    setSubmitting(false);
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Left — pitch */}
          <div className="md:sticky md:top-24">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">For restaurants</p>
            <h1 className="text-4xl font-bold mb-6 leading-tight">
              Get your restaurant on MenuFlow
            </h1>
            <p className="text-gray-400 leading-relaxed mb-8">
              Fill in the form and our team will reach out within one business day to get you set
              up. No hardware, no contracts — you can be live within an hour.
            </p>
            <div className="space-y-3">
              {[
                'QR codes generated for every table',
                'Real-time order board for your kitchen',
                'Customer loyalty program built in',
                'Google & OTP login for customers',
                'Analytics and revenue dashboard',
              ].map((p) => (
                <div key={p} className="flex items-center gap-3 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div>
            {done ? (
              <div className="bg-gray-900 border border-green-700/40 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ChefHat size={28} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">We'll be in touch!</h2>
                <p className="text-gray-400 text-sm">
                  Thanks, {form.ownerName}. Expect a call or email from our team within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-bold text-lg mb-2">Restaurant details</h2>

                <Field label="Restaurant name *">
                  <input {...field('restaurantName')} required placeholder="Demo Café" className={INPUT} />
                </Field>
                <Field label="Your name *">
                  <input {...field('ownerName')} required placeholder="Full name" className={INPUT} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email *">
                    <input {...field('email')} type="email" required placeholder="you@cafe.com" className={INPUT} />
                  </Field>
                  <Field label="Mobile *">
                    <input {...field('mobile')} type="tel" required placeholder="+91..." className={INPUT} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City *">
                    <input {...field('city')} required placeholder="Mumbai" className={INPUT} />
                  </Field>
                  <Field label="State *">
                    <select {...field('state')} required className={INPUT}>
                      <option value="">Select state</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Number of tables">
                  <input {...field('tableCount')} type="number" min="1" max="200" placeholder="e.g. 12" className={INPUT} />
                </Field>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition mt-2"
                >
                  {submitting ? 'Submitting…' : 'Request onboarding'}
                </button>
                <p className="text-gray-600 text-xs text-center">
                  No contracts. No credit card needed to get started.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500';
