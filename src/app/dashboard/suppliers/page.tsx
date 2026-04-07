'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Plus, Search, BookOpen, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', cnic: '', openingBalance: 0, notes: '' });
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = () => {
    fetch(`/api/suppliers?search=${search}`)
      .then(res => res.json())
      .then(data => setSuppliers(data.suppliers || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/suppliers/${editId}` : '/api/suppliers';
    const method = editId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', phone: '', address: '', email: '', cnic: '', openingBalance: 0, notes: '' });
    fetchSuppliers();
  };

  const handleEdit = (s: any) => {
    setEditId(s._id);
    setForm({ name: s.name, phone: s.phone, address: s.address || '', email: s.email || '', cnic: s.cnic || '', openingBalance: s.openingBalance || 0, notes: s.notes || '' });
    setShowForm(true);
  };

  const toggleActive = async (s: any) => {
    await fetch(`/api/suppliers/${s._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !s.isActive }) });
    fetchSuppliers();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your suppliers and their accounts</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', phone: '', address: '', email: '', cnic: '', openingBalance: 0, notes: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
              <input value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (Rs.)</label>
              <input type="number" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div className="md:col-span-2 lg:col-span-3"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">{editId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 mb-4">
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        {suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Opening Bal.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {suppliers.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{s.phone}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{s.address || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(s.openingBalance || 0)}</td>
                    <td className="px-5 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/suppliers/${s._id}`} title="View ledger" className="text-gray-400 hover:text-primary-600"><BookOpen className="w-4 h-4" /></Link>
                        <button onClick={() => handleEdit(s)} className="text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleActive(s)} className="text-gray-400 hover:text-gray-600">
                          {s.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
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
    </div>
  );
}
