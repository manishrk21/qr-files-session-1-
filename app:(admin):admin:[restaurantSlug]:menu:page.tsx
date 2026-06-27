'use client';
// app/(admin)/admin/[restaurantSlug]/menu/page.tsx
// Full menu management: create/edit/delete items and toggle availability.
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Loader2, Pencil, Trash2, UtensilsCrossed,
  ToggleLeft, ToggleRight, Star,
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  food_type: 'veg' | 'non_veg' | 'egg';
  is_available: boolean;
  is_featured: boolean;
  allergens: string[];
  preparation_time_minutes: number | null;
  display_order: number;
  category_id: string;
  menu_categories: { id: string; name: string } | null;
}

const FOOD_TYPE_DOT: Record<string, string> = {
  veg:     'bg-green-500',
  non_veg: 'bg-red-500',
  egg:     'bg-yellow-500',
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    foodType: 'veg' as 'veg' | 'non_veg' | 'egg',
    isAvailable: true,
    isFeatured: false,
    allergens: '',
    preparationTimeMinutes: '',
    displayOrder: '0',
  });

  const fetchMenu = useCallback(async () => {
    const [itemsRes, catsRes] = await Promise.all([
      fetch('/api/admin/menu'),
      fetch('/api/admin/menu/categories'),
    ]);
    const [itemsData, catsData] = await Promise.all([itemsRes.json(), catsRes.json()]);
    if (itemsData.success) setItems(itemsData.data.items);
    if (catsData.success) setCategories(catsData.data.categories);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  function openCreate() {
    setEditingItem(null);
    setForm({
      categoryId: categories[0]?.id ?? '',
      name: '', description: '', price: '',
      foodType: 'veg', isAvailable: true, isFeatured: false,
      allergens: '', preparationTimeMinutes: '', displayOrder: '0',
    });
    setShowModal(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setForm({
      categoryId: item.category_id,
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      foodType: item.food_type,
      isAvailable: item.is_available,
      isFeatured: item.is_featured,
      allergens: item.allergens.join(', '),
      preparationTimeMinutes: item.preparation_time_minutes ? String(item.preparation_time_minutes) : '',
      displayOrder: String(item.display_order),
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description || undefined,
        price: parseFloat(form.price),
        foodType: form.foodType,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        allergens: form.allergens.split(',').map((a) => a.trim()).filter(Boolean),
        preparationTimeMinutes: form.preparationTimeMinutes
          ? parseInt(form.preparationTimeMinutes, 10)
          : undefined,
        displayOrder: parseInt(form.displayOrder, 10) || 0,
      };

      const res = editingItem
        ? await fetch(`/api/admin/menu/${editingItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (data.success) {
        toast.success(editingItem ? 'Item updated' : 'Item created');
        setShowModal(false);
        fetchMenu();
      } else {
        toast.error(data.error?.message ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(itemId: string, name: string) {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    const res = await fetch(`/api/admin/menu/${itemId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast.success('Item deleted');
      fetchMenu();
    } else {
      toast.error('Delete failed');
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.is_available }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_available: !item.is_available } : i)),
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  const filtered = activeCategory === 'all'
    ? items
    : items.filter((i) => i.category_id === activeCategory);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">{items.length} items</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition ${
            activeCategory === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition ${
              activeCategory === cat.id ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <UtensilsCrossed size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-400">No items in this category</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Item</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Price</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Available</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${FOOD_TYPE_DOT[item.food_type]}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-200 text-sm font-medium">{item.name}</span>
                          {item.is_featured && <Star size={12} className="text-amber-400 fill-amber-400" />}
                        </div>
                        {item.description && (
                          <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-500 text-xs">{item.menu_categories?.name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-200 text-sm font-semibold">₹{Number(item.price).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(item)}
                      disabled={togglingId === item.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {togglingId === item.id ? (
                        <Loader2 size={16} className="text-amber-500 animate-spin" />
                      ) : item.is_available ? (
                        <ToggleRight size={20} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={20} className="text-gray-600" />
                      )}
                      <span className={item.is_available ? 'text-green-400' : 'text-gray-600'}>
                        {item.is_available ? 'Yes' : 'No'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold">{editingItem ? 'Edit Item' : 'New Menu Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <ModalField label="Category *">
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required
                  className={MODAL_INPUT}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </ModalField>
              <ModalField label="Name *">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required className={MODAL_INPUT} placeholder="Masala Chai"
                />
              </ModalField>
              <ModalField label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${MODAL_INPUT} h-20 resize-none`}
                  placeholder="Optional description"
                />
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Price (₹) *">
                  <input
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    type="number" step="0.5" min="0" required className={MODAL_INPUT}
                  />
                </ModalField>
                <ModalField label="Food Type">
                  <select
                    value={form.foodType}
                    onChange={(e) => setForm((f) => ({ ...f, foodType: e.target.value as any }))}
                    className={MODAL_INPUT}
                  >
                    <option value="veg">Veg</option>
                    <option value="non_veg">Non-Veg</option>
                    <option value="egg">Egg</option>
                  </select>
                </ModalField>
              </div>
              <ModalField label="Allergens (comma-separated)">
                <input
                  value={form.allergens}
                  onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
                  className={MODAL_INPUT} placeholder="dairy, gluten"
                />
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Prep Time (mins)">
                  <input
                    value={form.preparationTimeMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, preparationTimeMinutes: e.target.value }))}
                    type="number" min="0" className={MODAL_INPUT}
                  />
                </ModalField>
                <ModalField label="Display Order">
                  <input
                    value={form.displayOrder}
                    onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                    type="number" min="0" className={MODAL_INPUT}
                  />
                </ModalField>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox" checked={form.isAvailable}
                    onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                    className="accent-amber-500"
                  />
                  Available
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox" checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                    className="accent-amber-500"
                  />
                  Featured
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const MODAL_INPUT =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500';
