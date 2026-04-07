'use client';

import { useEffect, useState } from 'react';
import { Package, Plus, Search, Edit2, X, FolderPlus, UserPlus, Paperclip } from 'lucide-react';
import { formatCurrency, formatDate, fileProxyUrl } from '@/lib/utils';
import InvoiceUpload from '@/components/InvoiceUpload';

interface Category {
  _id: string;
  name: string;
  parentId: string | null;
  measurementUnit: 'meter' | 'piece';
  isActive: boolean;
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

function buildOptionList(
  categories: Category[],
  parentId: string | null,
  depth: number,
): { id: string; label: string; depth: number }[] {
  const result: { id: string; label: string; depth: number }[] = [];
  const children = categories.filter(c => c.parentId === parentId);
  for (const child of children) {
    result.push({ id: child._id, label: child.name, depth });
    result.push(...buildOptionList(categories, child._id, depth + 1));
  }
  return result;
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const iconBtnCls = 'shrink-0 flex items-center justify-center w-10 h-[38px] border border-gray-200 rounded-lg text-gray-500 hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50 transition';

function AddCategoryModal({
  categories,
  onClose,
  onAdded,
}: {
  categories: Category[];
  onClose: () => void;
  onAdded: (cat: Category) => void;
}) {
  const [form, setForm] = useState<{ name: string; parentId: string; measurementUnit: 'meter' | 'piece' }>({
    name: '', parentId: '', measurementUnit: 'meter',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parentOptions = buildOptionList(categories, null, 0);

  const handleParentChange = (parentId: string) => {
    if (parentId) {
      const parent = categories.find(c => c._id === parentId);
      if (parent) { setForm(f => ({ ...f, parentId, measurementUnit: parent.measurementUnit })); return; }
    }
    setForm(f => ({ ...f, parentId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create category'); return; }
      onAdded(data.category);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Category</h2>
            <p className="text-xs text-gray-500 mt-0.5">Supports nested sub-categories</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}
          {form.parentId && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500">
              Path: <span className="font-medium text-gray-700">{getFullPath(form.parentId, categories)}</span>
              {' '}&gt; <span className="font-medium text-primary-700">{form.name || '…'}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus placeholder="Category name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
            <select value={form.parentId} onChange={e => handleParentChange(e.target.value)} className={inputCls}>
              <option value="">None (Top Level)</option>
              {parentOptions.map(opt => <option key={opt.id} value={opt.id}>{'—'.repeat(opt.depth)} {opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Unit *</label>
            <select value={form.measurementUnit} onChange={e => setForm(f => ({ ...f, measurementUnit: e.target.value as 'meter' | 'piece' }))} className={inputCls}>
              <option value="meter">Meter (for fabric / cloth)</option>
              <option value="piece">Piece (for suits / garments)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-60">
              {saving ? 'Creating…' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSupplierModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (supplier: any) => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', cnic: '', openingBalance: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create supplier'); return; }
      onAdded(data.supplier);
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add New Supplier</h2>
            <p className="text-xs text-gray-500 mt-0.5">This supplier will be available immediately</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
            <input value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (Rs.)</label>
            <input type="number" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div className="col-span-2 flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-60">
              {saving ? 'Creating…' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSup, setFilterSup] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    supplierId: '', categoryId: '', batchName: '', batchDate: '', description: '',
    quantity: '', unitPrice: '', totalPrice: '', measurementUnit: 'piece' as string,
    colors: '', sizes: '', amountPaid: '', paymentMethod: 'cash', invoiceUrl: '',
  });
  const [loading, setLoading] = useState(true);

  const getCategoryPath = (catId: string): string => {
    const parts: string[] = [];
    let current = categories.find((c) => c._id === catId);
    while (current) {
      parts.unshift(current.name);
      current = current.parentId ? categories.find((c) => c._id === current!.parentId) : undefined;
    }
    return parts.join('/');
  };

  const getCategoryOptions = () => {
    return categories
      .filter((c) => c.isActive)
      .map((c) => ({
        _id: c._id,
        label: `${getCategoryPath(c._id)}/${c.measurementUnit.charAt(0).toUpperCase() + c.measurementUnit.slice(1)}`,
        measurementUnit: c.measurementUnit,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCat) params.set('category', filterCat);
    if (filterSup) params.set('supplier', filterSup);

    Promise.all([
      fetch(`/api/stock?${params}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
    ]).then(([stockData, catData, supData]) => {
      setStocks(stockData.stocks || []);
      setCategories(catData.categories || []);
      setSuppliers(supData.suppliers || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [search, filterCat, filterSup]);

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find((c) => c._id === catId);
    setForm({ ...form, categoryId: catId, measurementUnit: cat?.measurementUnit || 'piece' });
  };

  const handleCategoryAdded = (cat: Category) => {
    setCategories(prev => [...prev, cat]);
    setForm(f => ({ ...f, categoryId: cat._id, measurementUnit: cat.measurementUnit }));
  };

  const handleSupplierAdded = (supplier: any) => {
    setSuppliers(prev => [...prev, supplier]);
    setForm(f => ({ ...f, supplierId: supplier._id }));
  };

  const handleDynamicCalc = (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    const qty = parseFloat(newForm.quantity) || 0;
    const unit = parseFloat(newForm.unitPrice) || 0;
    const total = parseFloat(newForm.totalPrice) || 0;

    if (field === 'quantity') {
      if (qty > 0 && unit > 0) newForm.totalPrice = (qty * unit).toFixed(2);
      else if (qty > 0 && total > 0) newForm.unitPrice = (total / qty).toFixed(2);
    } else if (field === 'unitPrice') {
      if (qty > 0 && unit > 0) newForm.totalPrice = (qty * unit).toFixed(2);
      else if (unit > 0 && total > 0) newForm.quantity = (total / unit).toFixed(2);
    } else if (field === 'totalPrice') {
      if (total > 0 && qty > 0) newForm.unitPrice = (total / qty).toFixed(2);
      else if (total > 0 && unit > 0) newForm.quantity = (total / unit).toFixed(2);
    }
    setForm(newForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/stock/${editId}` : '/api/stock';
    const method = editId ? 'PUT' : 'POST';
    const body = {
      ...form,
      colors: form.colors ? form.colors.split(',').map(c => c.trim()) : [],
      sizes: form.sizes ? form.sizes.split(',').map(s => s.trim()) : [],
    };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowForm(false);
    setEditId(null);
    resetForm();
    fetchData();
  };

  const resetForm = () => setForm({
    supplierId: '', categoryId: '', batchName: '',
    batchDate: new Date().toISOString().split('T')[0],
    description: '', quantity: '', unitPrice: '', totalPrice: '',
    measurementUnit: 'piece', colors: '', sizes: '',
    amountPaid: '', paymentMethod: 'cash', invoiceUrl: '',
  });

  const handleEdit = (s: any) => {
    setEditId(s._id);
    setForm({
      supplierId: s.supplierId?._id || s.supplierId,
      categoryId: s.categoryId?._id || s.categoryId,
      batchName: s.batchName,
      batchDate: new Date(s.batchDate).toISOString().split('T')[0],
      description: s.description || '',
      quantity: s.quantity.toString(),
      unitPrice: s.unitPrice.toString(),
      totalPrice: s.totalPrice.toString(),
      measurementUnit: s.measurementUnit,
      colors: (s.colors || []).join(', '),
      sizes: (s.sizes || []).join(', '),
      amountPaid: (s.amountPaid || 0).toString(),
      paymentMethod: s.paymentMethod || 'cash',
      invoiceUrl: s.invoiceUrl || '',
    });
    setShowForm(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-1">Manage inventory batches and stock levels</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Stock
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editId ? 'Edit Stock' : 'Add New Stock'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <div className="flex gap-2">
                <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required className={inputCls}>
                  <option value="">Select Supplier</option>
                  {suppliers.filter(s => s.isActive).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowAddSupplier(true)} title="Add new supplier" className={iconBtnCls}>
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <div className="flex gap-2">
                <select value={form.categoryId} onChange={e => handleCategoryChange(e.target.value)} required className={inputCls}>
                  <option value="">Select Category</option>
                  {getCategoryOptions().map((c) => <option key={c._id} value={c._id}>{c.label}</option>)}
                </select>
                <button type="button" onClick={() => setShowAddCategory(true)} title="Add new category" className={iconBtnCls}>
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
              <input value={form.batchName} onChange={e => setForm({ ...form, batchName: e.target.value })} required
                placeholder="e.g. Batch-Jan-2026-001" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Date *</label>
              <input type="date" value={form.batchDate} onChange={e => setForm({ ...form, batchDate: e.target.value })} required className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity ({form.measurementUnit === 'meter' ? 'Meters' : 'Pieces'}) *
              </label>
              <input type="number" step="0.01" min="0.01" value={form.quantity}
                onChange={e => handleDynamicCalc('quantity', e.target.value)}
                placeholder={`Enter ${form.measurementUnit === 'meter' ? 'meters' : 'pieces'}`}
                required className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price (Rs. per {form.measurementUnit}) *
              </label>
              <input type="number" step="0.01" min="0" value={form.unitPrice}
                onChange={e => handleDynamicCalc('unitPrice', e.target.value)} required className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price (Rs.) *</label>
              <input type="number" step="0.01" min="0" value={form.totalPrice}
                onChange={e => handleDynamicCalc('totalPrice', e.target.value)} required className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid to Supplier (Rs.)</label>
              <input type="number" step="0.01" min="0" value={form.amountPaid}
                onChange={e => setForm({ ...form, amountPaid: e.target.value })}
                placeholder="0 = unpaid / credit" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colors (comma separated)</label>
              <input value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })}
                placeholder="Red, Blue, Green" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma separated)</label>
              <input value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })}
                placeholder="S, M, L, XL" className={inputCls} />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} />
            </div>

            <div className="lg:col-span-3">
              <InvoiceUpload value={form.invoiceUrl} onChange={url => setForm(f => ({ ...f, invoiceUrl: url }))} />
            </div>

            <div className="bg-primary-50 rounded-lg p-3 lg:col-span-3 text-sm text-primary-700">
              Enter any two of Quantity, Unit Price, or Total Price — the third will be calculated automatically.
            </div>

            <div className="lg:col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
                {editId ? 'Update Stock' : 'Add Stock'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batches..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filterSup} onChange={e => setFilterSup(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        {stocks.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No stock found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stocks.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.batchName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{s.categoryId?.name || 'N/A'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{s.supplierId?.name || 'N/A'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{s.quantity} {s.measurementUnit}s</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-medium ${s.remainingQuantity <= 0 ? 'text-red-600' : s.remainingQuantity < s.quantity * 0.2 ? 'text-amber-600' : 'text-green-600'}`}>
                        {s.remainingQuantity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(s.unitPrice)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(s.totalPrice)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(s.amountPaid || 0)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        s.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' :
                        s.paymentStatus === 'partial' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {s.paymentStatus === 'paid' ? 'Paid' : s.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(s.batchDate)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.invoiceUrl && (
                          <a href={fileProxyUrl(s.invoiceUrl)} target="_blank" rel="noopener noreferrer" title="View attachment"
                            className="text-gray-400 hover:text-primary-600 transition">
                            <Paperclip className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => handleEdit(s)} className="text-gray-400 hover:text-primary-600 transition">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddCategory && (
        <AddCategoryModal
          categories={categories}
          onClose={() => setShowAddCategory(false)}
          onAdded={handleCategoryAdded}
        />
      )}

      {showAddSupplier && (
        <AddSupplierModal
          onClose={() => setShowAddSupplier(false)}
          onAdded={handleSupplierAdded}
        />
      )}
    </div>
  );
}
