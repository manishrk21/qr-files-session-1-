'use client';
// app/(admin)/admin/[restaurantSlug]/categories/page.tsx
// Full CRUD for menu categories with inline reordering.
import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Pencil, Trash2, GripVertical, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOrder, setNewOrder] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/admin/menu/categories');
    const data = await res.json();
    if (data.success) setCategories(data.data.categories);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          displayOrder: newOrder ? parseInt(newOrder, 10) : categories.length,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Category "${newName}" created`);
        setNewName('');
        setNewOrder('');
        setShowCreate(false);
        fetchCategories();
      } else {
        toast.error(data.error?.message ?? 'Failed to create category');
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditOrder(String(cat.display_order));
  }

  async function handleUpdate(catId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/menu/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          displayOrder: parseInt(editOrder, 10) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Category updated');
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error(data.error?.message ?? 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(catId: string, name: string) {
    if (!confirm(`Delete category "${name}"? All items in this category must be moved first.`)) return;
    const res = await fetch(`/api/admin/menu/categories/${catId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast.success('Category deleted');
      fetchCategories();
    } else {
      toast.error(data.error?.message ?? 'Delete failed');
    }
  }

  async function toggleActive(cat: Category) {
    const res = await fetch(`/api/admin/menu/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.is_active }),
    });
    const data = await res.json();
    if (data.success) {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: !cat.is_active } : c)),
      );
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Menu Categories</h1>
          <p className="text-gray-500 text-sm mt-0.5">{categories.length} categories</p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-5 mb-5">
          <h2 className="text-white font-semibold text-sm mb-4">New Category</h2>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-gray-400 text-xs mb-1.5 block">Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Chai & Beverages"
                required
                className={INPUT}
              />
            </div>
            <div className="w-28">
              <label className="text-gray-400 text-xs mb-1.5 block">Display Order</label>
              <input
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                type="number"
                min="0"
                placeholder={String(categories.length)}
                className={INPUT}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-amber-500 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <FolderOpen size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-400">No categories yet</p>
          <p className="text-gray-600 text-sm mt-1">Create a category to start adding menu items.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-8"></th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Order</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3">
                    <GripVertical size={14} className="text-gray-700 cursor-grab" />
                  </td>
                  <td className="px-4 py-3">
                    {editingId === cat.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-800 border border-amber-500 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none w-48"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(cat.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className={`text-sm font-medium ${cat.is_active ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                        {cat.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {editingId === cat.id ? (
                      <input
                        value={editOrder}
                        onChange={(e) => setEditOrder(e.target.value)}
                        type="number"
                        className="bg-gray-800 border border-amber-500 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none w-20"
                      />
                    ) : (
                      <span className="text-gray-500 text-xs">{cat.display_order}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(cat)}>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cat.is_active ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-500'
                      }`}>
                        {cat.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === cat.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(cat.id)}
                            disabled={saving}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-lg transition"
                          >
                            {saving ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-gray-400 text-xs rounded-lg border border-gray-700 hover:border-gray-600"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-gray-700 text-xs mt-4">
        Tip: Set display order to control the sequence on the customer menu.
      </p>
    </div>
  );
}
