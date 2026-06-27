'use client';
// app/(admin)/admin/[restaurantSlug]/tables/page.tsx
import { useEffect, useState, useCallback } from 'react';
import { QrCode, Plus, Download, Loader2, Table2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: string;
  label: string;
  capacity: number | null;
  is_active: boolean;
  qr_code_url: string | null;
  created_at: string;
}

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [selectedQr, setSelectedQr] = useState<{ label: string; url: string } | null>(null);

  const fetchTables = useCallback(async () => {
    const res = await fetch('/api/admin/tables');
    const data = await res.json();
    if (data.success) setTables(data.data.tables);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          capacity: newCapacity ? parseInt(newCapacity, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Table "${newLabel}" created`);
        setNewLabel('');
        setNewCapacity('');
        setShowForm(false);
        fetchTables();
      } else {
        toast.error(data.error?.message ?? 'Failed to create table');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Tables & QR Codes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{tables.length} table{tables.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Table
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4">New Table</h2>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1.5 block">Table Label *</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Table 1, Patio A"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="w-28">
              <label className="text-gray-400 text-xs mb-1.5 block">Capacity</label>
              <input
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                placeholder="4"
                type="number"
                min="1"
                max="50"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Tables grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Table2 size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-400">No tables yet</p>
          <p className="text-gray-600 text-sm mt-1">Add tables to generate QR codes for customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-gray-900 border rounded-2xl p-4 flex flex-col items-center gap-3 ${
                table.is_active ? 'border-gray-800' : 'border-gray-800 opacity-60'
              }`}
            >
              {/* QR preview */}
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {table.qr_code_url ? (
                  <img src={table.qr_code_url} alt={`QR for ${table.label}`} className="w-full h-full object-cover" />
                ) : (
                  <QrCode size={32} className="text-gray-400" />
                )}
              </div>

              <div className="text-center">
                <p className="text-white font-semibold text-sm">{table.label}</p>
                {table.capacity && (
                  <p className="text-gray-500 text-xs mt-0.5">Seats {table.capacity}</p>
                )}
              </div>

              <div className="flex gap-2 w-full">
                {table.qr_code_url && (
                  <a
                    href={table.qr_code_url}
                    download={`qr-${table.label}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-2 rounded-xl transition"
                  >
                    <Download size={12} />
                    Download
                  </a>
                )}
                <button
                  onClick={() => table.qr_code_url && setSelectedQr({ label: table.label, url: table.qr_code_url! })}
                  disabled={!table.qr_code_url}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs py-2 rounded-xl transition disabled:opacity-40"
                >
                  <QrCode size={12} />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR modal */}
      {selectedQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setSelectedQr(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-900 font-bold text-lg">{selectedQr.label}</p>
            <img src={selectedQr.url} alt={selectedQr.label} className="w-64 h-64 object-contain" />
            <div className="flex gap-3">
              <a
                href={selectedQr.url}
                download={`qr-${selectedQr.label}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                <Download size={15} />
                Download
              </a>
              <button
                onClick={() => setSelectedQr(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
