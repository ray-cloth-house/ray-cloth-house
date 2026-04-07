'use client';

import { useEffect, useState, useCallback } from 'react';
import { FolderTree, Plus, Edit2, ChevronRight, ChevronDown, ToggleLeft, ToggleRight, FolderOpen, Folder } from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  parentId: string | null;
  measurementUnit: 'meter' | 'piece';
  isActive: boolean;
}

function CategoryNode({
  cat,
  categories,
  depth,
  expanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
}: {
  cat: Category;
  categories: Category[];
  depth: number;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onEdit: (cat: Category) => void;
  onToggleActive: (cat: Category) => void;
}) {
  const children = categories.filter(c => c.parentId === cat._id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded[cat._id] !== false;

  return (
    <div>
      <div
        className={`flex items-center justify-between py-3 hover:bg-gray-50/80 transition-colors ${depth === 0 ? 'px-5 py-4' : 'px-5'}`}
        style={{ paddingLeft: `${20 + depth * 28}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(cat._id)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            </span>
          )}

          {depth === 0 ? (
            hasChildren && isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-primary-500 flex-shrink-0" />
            )
          ) : null}

          <span className={`text-sm truncate ${depth === 0 ? 'font-semibold' : 'font-medium'} ${cat.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
            {cat.name}
          </span>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded ${depth === 0 ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
            {cat.measurementUnit}
          </span>
          {hasChildren && (
            <span className="flex-shrink-0 text-xs text-gray-400">
              ({children.length})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          <button onClick={() => onToggleActive(cat)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
            {cat.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => onEdit(cat)} className="text-gray-400 hover:text-primary-600 p-1 rounded hover:bg-gray-100 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className={depth === 0 ? 'border-l-2 border-primary-100 ml-7' : 'border-l border-gray-100 ml-7'} style={{ marginLeft: `${32 + depth * 28}px` }}>
          {children.map(child => (
            <CategoryNode
              key={child._id}
              cat={child}
              categories={categories}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFullPath(catId: string, categories: Category[]): string {
  const parts: string[] = [];
  let current = categories.find(c => c._id === catId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? categories.find(c => c._id === current!.parentId) : undefined;
  }
  return parts.join(' > ');
}

function buildOptionList(categories: Category[], parentId: string | null, depth: number, excludeId: string | null): { id: string; label: string; depth: number }[] {
  const result: { id: string; label: string; depth: number }[] = [];
  const children = categories.filter(c => c.parentId === parentId);
  for (const child of children) {
    if (child._id === excludeId) continue;
    result.push({ id: child._id, label: child.name, depth });
    result.push(...buildOptionList(categories, child._id, depth + 1, excludeId));
  }
  return result;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parentId: '', measurementUnit: 'meter' as 'meter' | 'piece' });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/categories/${editId}` : '/api/categories';
    const method = editId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, parentId: form.parentId || null }),
    });

    setShowForm(false);
    setEditId(null);
    setForm({ name: '', parentId: '', measurementUnit: 'meter' });
    fetchCategories();
  };

  const handleEdit = useCallback((cat: Category) => {
    setEditId(cat._id);
    setForm({ name: cat.name, parentId: cat.parentId || '', measurementUnit: cat.measurementUnit });
    setShowForm(true);
  }, []);

  const toggleActive = useCallback(async (cat: Category) => {
    await fetch(`/api/categories/${cat._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    fetchCategories();
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  const handleParentChange = (parentId: string) => {
    if (parentId) {
      const parent = categories.find(c => c._id === parentId);
      if (parent) {
        setForm({ ...form, parentId, measurementUnit: parent.measurementUnit });
        return;
      }
    }
    setForm({ ...form, parentId });
  };

  const topLevel = categories.filter(c => !c.parentId);
  const parentOptions = buildOptionList(categories, null, 0, editId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product categories with unlimited sub-levels</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', parentId: '', measurementUnit: 'meter' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editId ? 'Edit Category' : 'New Category'}</h3>
          {form.parentId && (
            <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
              Path: {getFullPath(form.parentId, categories)} &gt; <span className="font-medium text-gray-700">{form.name || '...'}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Category name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
              <select value={form.parentId} onChange={e => handleParentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">None (Top Level)</option>
                {parentOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {'—'.repeat(opt.depth)} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Unit *</label>
              <select value={form.measurementUnit} onChange={e => setForm({ ...form, measurementUnit: e.target.value as 'meter' | 'piece' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="meter">Meter (for fabric/cloth)</option>
                <option value="piece">Piece (for suits/garments)</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">
                {editId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100">
        {topLevel.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No categories yet. Create your first category to get started.</p>
            <p className="text-xs text-gray-400 mt-1">Example: Men &gt; Lawn &gt; 3 Piece &gt; Red</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topLevel.map(cat => (
              <CategoryNode
                key={cat._id}
                cat={cat}
                categories={categories}
                depth={0}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onEdit={handleEdit}
                onToggleActive={toggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
