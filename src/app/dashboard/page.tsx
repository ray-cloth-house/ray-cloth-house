'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Package, ShoppingCart, TrendingUp, TrendingDown, Users, Truck,
  DollarSign, AlertCircle, ArrowUpRight, ArrowDownRight, RotateCcw, Plus, X
} from 'lucide-react';
import {
  AreaChart, PieChart, BarChart, ResponsiveContainer, Tooltip, Legend,
  XAxis, YAxis, CartesianGrid, Area, Bar, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6'];

const EMPTY_RETURN_FORM = {
  returnDate: new Date().toISOString().split('T')[0],
  returnType: 'from_buyer' as 'from_buyer' | 'to_supplier',
  partyName: '',
  itemName: '',
  quantity: '',
  measurementUnit: 'piece' as 'meter' | 'piece',
  reason: '',
  notes: '',
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [returns, setReturns] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN_FORM);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState('');

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch('/api/dashboard/summary').then(r => r.json()),
      fetch('/api/dashboard/charts').then(r => r.json()),
    ])
      .then(([summary, charts]) => {
        setData(summary);
        setChartData(charts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchReturns();
  }, []);

  const fetchReturns = () => {
    setReturnsLoading(true);
    fetch('/api/returns')
      .then(r => r.json())
      .then(d => setReturns(Array.isArray(d) ? d : []))
      .catch(() => setReturns([]))
      .finally(() => setReturnsLoading(false));
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnError('');
    setReturnSaving(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...returnForm,
          quantity: Number(returnForm.quantity),
        }),
      });
      const resData = await res.json();
      if (!res.ok) { setReturnError(resData.error || 'Failed to save'); return; }
      setShowReturnForm(false);
      setReturnForm(EMPTY_RETURN_FORM);
      fetchReturns();
    } catch {
      setReturnError('Network error. Please try again.');
    } finally {
      setReturnSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-12">Failed to load dashboard data</div>;
  }

  const statCards = [
    { label: 'Total Stock Value', value: formatCurrency(data.totalStockValue || 0), icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Sales Today', value: formatCurrency(data.sales?.today || 0), icon: ShoppingCart, color: 'bg-green-50 text-green-600' },
    { label: 'Monthly Sales', value: formatCurrency(data.sales?.month || 0), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Gross Profit', value: formatCurrency(data.profit?.gross || 0), icon: DollarSign, color: 'bg-amber-50 text-amber-600' },
    { label: 'Net Profit', value: formatCurrency(data.profit?.net || 0), icon: TrendingUp, color: data.profit?.net >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600' },
    { label: 'Monthly Expenses', value: formatCurrency(data.expenses?.month || 0), icon: TrendingDown, color: 'bg-red-50 text-red-600' },
    { label: 'Outstanding (Buyers)', value: formatCurrency(data.outstanding?.fromBuyers || 0), icon: ArrowUpRight, color: 'bg-orange-50 text-orange-600' },
    { label: 'Outstanding (Suppliers)', value: formatCurrency(data.outstanding?.toSuppliers || 0), icon: ArrowDownRight, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Truck className="w-4 h-4 text-gray-400" /> Active Suppliers</span>
              <span className="text-sm font-semibold">{data.counts?.suppliers || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Users className="w-4 h-4 text-gray-400" /> Active Buyers</span>
              <span className="text-sm font-semibold">{data.counts?.buyers || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Package className="w-4 h-4 text-gray-400" /> Stock Batches</span>
              <span className="text-sm font-semibold">{data.counts?.stockBatches || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-gray-600"><ShoppingCart className="w-4 h-4 text-gray-400" /> Total Sales</span>
              <span className="text-sm font-semibold">{data.counts?.totalSales || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Today&apos;s Profit</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(data.profit?.today || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(data.profit?.week || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(data.profit?.month || 0)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">This Year</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(data.profit?.year || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {mounted && chartData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sales Trend (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                  <Legend />
                  <Area type="monotone" dataKey="amount" name="Sales" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Category Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.categoryPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.categoryPerformance?.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Sales vs Profit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.expenseBreakdown?.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Buyers</h3>
              <div className="space-y-3">
                {chartData.topBuyers?.map((buyer: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{buyer.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(buyer.total)}</span>
                  </div>
                ))}
                {(!chartData.topBuyers || chartData.topBuyers.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No sales data yet</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Return Stock Section ── */}
      <div className="mt-8">
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Return Records</h3>
              {returns.length > 0 && (
                <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2 py-0.5 rounded-full">
                  {returns.length}
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowReturnForm(true); setReturnError(''); setReturnForm(EMPTY_RETURN_FORM); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Return
            </button>
          </div>

          {returnsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-10">
              <RotateCcw className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No return records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r: any, i: number) => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatDate(r.returnDate)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          r.returnType === 'from_buyer'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {r.returnType === 'from_buyer' ? 'From Buyer' : 'To Supplier'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{r.partyName}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{r.itemName}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {r.quantity} {r.measurementUnit}{r.quantity !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{r.reason || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Return Modal ── */}
      {showReturnForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReturnForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">Record Return</h2>
              </div>
              <button onClick={() => setShowReturnForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {returnError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{returnError}</div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    value={returnForm.returnDate}
                    onChange={e => setReturnForm(f => ({ ...f, returnDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Return Type</label>
                  <select
                    value={returnForm.returnType}
                    onChange={e => setReturnForm(f => ({ ...f, returnType: e.target.value as 'from_buyer' | 'to_supplier' }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="from_buyer">From Buyer</option>
                    <option value="to_supplier">To Supplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {returnForm.returnType === 'from_buyer' ? 'Buyer Name' : 'Supplier Name'}
                </label>
                <input
                  type="text"
                  value={returnForm.partyName}
                  onChange={e => setReturnForm(f => ({ ...f, partyName: e.target.value }))}
                  required
                  placeholder={returnForm.returnType === 'from_buyer' ? 'e.g. Ahmed Traders' : 'e.g. Lahore Textile Mills'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Item / Cloth Description</label>
                <input
                  type="text"
                  value={returnForm.itemName}
                  onChange={e => setReturnForm(f => ({ ...f, itemName: e.target.value }))}
                  required
                  placeholder="e.g. Lawn Suit Batch A, Cotton Fabric"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={returnForm.quantity}
                    onChange={e => setReturnForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={returnForm.measurementUnit}
                    onChange={e => setReturnForm(f => ({ ...f, measurementUnit: e.target.value as 'meter' | 'piece' }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="piece">Pieces</option>
                    <option value="meter">Meters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={returnForm.reason}
                  onChange={e => setReturnForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Defective stitching, Wrong color, Damaged fabric"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={returnForm.notes}
                  onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional details…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={returnSaving}
                  className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {returnSaving ? 'Saving…' : 'Save Return'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReturnForm(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
