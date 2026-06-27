'use client';
// app/(marketing)/contact/page.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Simulated submission — wire to Resend / email service
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setSending(false);
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
  }

  return (
    <main className="bg-gray-950 text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">Contact</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Get in touch</h1>
        <p className="text-gray-400 text-lg mb-12">
          Questions, feedback, or just want to say hello — we read every message.
        </p>

        {sent ? (
          <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-white font-semibold text-lg mb-2">Message received</p>
            <p className="text-gray-400 text-sm">We'll reply to {form.email} within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Your name"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="you@example.com"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
                rows={5}
                placeholder="Tell us what's on your mind…"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
            >
              <Send size={15} />
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        <div className="mt-16 pt-10 border-t border-gray-800">
          <p className="text-gray-600 text-sm">
            Prefer email?{' '}
            <a href="mailto:hello@menuflow.in" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
              hello@menuflow.in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
