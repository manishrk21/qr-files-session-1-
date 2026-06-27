'use client';
// app/(admin)/admin/[restaurantSlug]/settings/page.tsx
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Settings {
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  taxRate: number;
  isAcceptingOrders: boolean;
  loyaltyStreakTarget: number;
  loyaltyRewardDescription: string | null;
  branding: {
    primary_color: string;
    accent_color: string;
    font_family: string;
  } | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((res) => { if (res.success) setSettings(res.data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          pincode: settings.pincode,
          taxRate: settings.taxRate,
          isAcceptingOrders: settings.isAcceptingOrders,
          loyaltyStreakTarget: settings.loyaltyStreakTarget,
          loyaltyRewardDescription: settings.loyaltyRewardDescription,
          branding: settings.branding
            ? {
                primaryColor: settings.branding.primary_color,
                accentColor: settings.branding.accent_color,
                fontFamily: settings.branding.font_family,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success('Settings saved');
      else toast.error(data.error?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Accepting orders toggle */}
        <Section title="Operations">
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-gray-200 text-sm font-medium">Accepting Orders</p>
              <p className="text-gray-500 text-xs mt-0.5">Toggle to open or close ordering for customers</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((s) => s && { ...s, isAcceptingOrders: !s.isAcceptingOrders })}
              className="flex-shrink-0"
            >
              {settings.isAcceptingOrders
                ? <ToggleRight size={36} className="text-green-400" />
                : <ToggleLeft size={36} className="text-gray-600" />}
            </button>
          </div>
        </Section>

        {/* Restaurant info */}
        <Section title="Restaurant Info">
          <Field label="Name">
            <input
              value={settings.name}
              onChange={(e) => setSettings((s) => s && { ...s, name: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              value={settings.description ?? ''}
              onChange={(e) => setSettings((s) => s && { ...s, description: e.target.value })}
              className={`${INPUT_CLASS} h-20 resize-none`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                value={settings.phone ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, phone: e.target.value })}
                className={INPUT_CLASS}
                type="tel"
              />
            </Field>
            <Field label="Email">
              <input
                value={settings.email ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, email: e.target.value })}
                className={INPUT_CLASS}
                type="email"
              />
            </Field>
          </div>
          <Field label="Address">
            <input
              value={settings.address ?? ''}
              onChange={(e) => setSettings((s) => s && { ...s, address: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="City">
              <input
                value={settings.city ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, city: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="State">
              <input
                value={settings.state ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, state: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Pincode">
              <input
                value={settings.pincode ?? ''}
                onChange={(e) => setSettings((s) => s && { ...s, pincode: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </Section>

        {/* Tax */}
        <Section title="Tax & Pricing">
          <Field label="GST Rate (%)">
            <input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={settings.taxRate}
              onChange={(e) => setSettings((s) => s && { ...s, taxRate: parseFloat(e.target.value) || 0 })}
              className={INPUT_CLASS}
            />
          </Field>
        </Section>

        {/* Loyalty */}
        <Section title="Loyalty Program">
          <Field label="Visits per Streak Cycle">
            <input
              type="number"
              min="2"
              max="20"
              value={settings.loyaltyStreakTarget}
              onChange={(e) =>
                setSettings((s) => s && { ...s, loyaltyStreakTarget: parseInt(e.target.value, 10) || 5 })
              }
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Reward Description">
            <input
              value={settings.loyaltyRewardDescription ?? ''}
              onChange={(e) =>
                setSettings((s) => s && { ...s, loyaltyRewardDescription: e.target.value })
              }
              className={INPUT_CLASS}
              placeholder="e.g. Free coffee on your next visit!"
            />
          </Field>
        </Section>

        {/* Branding */}
        {settings.branding && (
          <Section title="Branding">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary Color">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.branding.primary_color}
                    onChange={(e) =>
                      setSettings((s) =>
                        s && { ...s, branding: s.branding && { ...s.branding, primary_color: e.target.value } },
                      )
                    }
                    className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
                  />
                  <input
                    value={settings.branding.primary_color}
                    onChange={(e) =>
                      setSettings((s) =>
                        s && { ...s, branding: s.branding && { ...s.branding, primary_color: e.target.value } },
                      )
                    }
                    className={`${INPUT_CLASS} flex-1`}
                    placeholder="#000000"
                  />
                </div>
              </Field>
              <Field label="Accent Color">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.branding.accent_color}
                    onChange={(e) =>
                      setSettings((s) =>
                        s && { ...s, branding: s.branding && { ...s.branding, accent_color: e.target.value } },
                      )
                    }
                    className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer"
                  />
                  <input
                    value={settings.branding.accent_color}
                    onChange={(e) =>
                      setSettings((s) =>
                        s && { ...s, branding: s.branding && { ...s.branding, accent_color: e.target.value } },
                      )
                    }
                    className={`${INPUT_CLASS} flex-1`}
                    placeholder="#f59e0b"
                  />
                </div>
              </Field>
            </div>
            <Field label="Font Family">
              <select
                value={settings.branding.font_family}
                onChange={(e) =>
                  setSettings((s) =>
                    s && { ...s, branding: s.branding && { ...s.branding, font_family: e.target.value } },
                  )
                }
                className={INPUT_CLASS}
              >
                {['Inter', 'Poppins', 'Playfair Display', 'Roboto', 'Lato', 'Montserrat'].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>
          </Section>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-white font-semibold text-sm mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500';
