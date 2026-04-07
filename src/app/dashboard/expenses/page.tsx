'use client';

import { useEffect, useState } from 'react';
import { Receipt, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const expenseCategories = {
  utility: ['Electricity', 'Water', 'Gas', 'Internet/Phone'],
  employee: ['Salaries', 'Bonuses', 'Food/Refreshments'],
  operational: ['Rent', 'Transportation', 'Packaging', 'Office Supplies'],
  misc: ['Repairs', 'Marketing', 'Other'],
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'utility', subCategory: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', paymentMethod: 'cash' });
  const [loading, setLoading] = useState(true);

  const fetchExpenses = () => {
    const params = filterCat ? `?category=${filterCat}` : '';
    fetch(`/api/expenses${params}`)
      .then(r => r.json())
      .then(data => { setExpenses(data.expenses || []); setTotal(data.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [filterCat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setShowForm(false);
    setForm({ category: 'utility', subCategory: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', paymentMethod: 'cash' });
    fetchExpenses();
  };

  const subCats = expenseCategories[form.category as keyof typeof expenseCategories] || [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track shop expenses and overheads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg border border-gray-100 px-4 py-2">
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(total)}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Expense</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subCategory: '' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="utility">Utility Bills</option>
                <option value="employee">Employee Related</option>
                <option value="operational">Operational</option>
                <option value="misc">Miscellaneous</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
              <select value={form.subCategory} onChange={e => setForm({ ...form, subCategory: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select</option>
                {subCats.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="cash">Cash</option><option value="bank">Bank</option><option value="cheque">Cheque</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div className="lg:col-span-3 flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">Save Expense</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-3 border-b border-gray-50">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Categories</option>
            <option value="utility">Utility</option>
            <option value="employee">Employee</option>
            <option value="operational">Operational</option>
            <option value="misc">Miscellaneous</option>
          </select>
        </div>
        {expenses.length === 0 ? (
          <div className="p-12 text-center"><Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No expenses found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sub-Category</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(e => (
                  <tr key={e._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3"><span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">{e.category}</span></td>
                    <td className="px-5 py-3 text-sm text-gray-600">{e.subCategory || '-'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{e.paymentMethod}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDate(e.date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{e.description || '-'}</td>
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
