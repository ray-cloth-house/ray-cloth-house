'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, X, AlertCircle, ChevronDown, ChevronRight, Package, FileText, CheckCircle2, Info, Paperclip } from 'lucide-react';
import InvoiceUpload from '@/components/InvoiceUpload';
import { formatCurrency, formatDate, fileProxyUrl } from '@/lib/utils';

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

const statusBadge = (status: string) =>
  status === 'paid' ? 'bg-green-50 text-green-700' :
  status === 'partial' ? 'bg-amber-50 text-amber-700' :
  'bg-red-50 text-red-700';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'batch'>('batch');
  const [filterType, setFilterType] = useState('');

  // Batch payments data
  const [batchStocks, setBatchStocks] = useState<any[]>([]);
  const [batchSales, setBatchSales] = useState<any[]>([]);
  const [batchFilter, setBatchFilter] = useState<'all' | 'supplier' | 'buyer'>('all');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(true);

  // Form state
  const [form, setForm] = useState({
    type: 'supplier' as string,
    partyId: '',
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceUrl: '',
  });
  const [outstandingItems, setOutstandingItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [totalDues, setTotalDues] = useState(0);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<{ allocations: { label: string; appliedAmount: number; newStatus: string }[]; advance: number; total: number } | null>(null);

  const fetchData = () => {
    const params = filterType ? `?type=${filterType}` : '';
    Promise.all([
      fetch(`/api/payments${params}`).then(r => r.json()),
      fetch('/api/suppliers?active=true').then(r => r.json()),
      fetch('/api/buyers?active=true').then(r => r.json()),
    ]).then(([pData, sData, bData]) => {
      setPayments(pData.payments || []);
      setSuppliers(sData.suppliers || []);
      setBuyers(bData.buyers || []);
    }).finally(() => setLoading(false));
  };

  const fetchBatchPayments = () => {
    setLoadingBatch(true);
    Promise.all([
      fetch('/api/stock').then(r => r.json()),
      fetch('/api/sales').then(r => r.json()),
    ]).then(([stData, saData]) => {
      const stocksWithPayments = (stData.stocks || []).filter((s: any) => s.payments && s.payments.length > 0);
      const salesWithPayments = (saData.sales || []).filter((s: any) => s.payments && s.payments.length > 0);
      setBatchStocks(stocksWithPayments);
      setBatchSales(salesWithPayments);
    }).finally(() => setLoadingBatch(false));
  };

  useEffect(() => { fetchData(); fetchBatchPayments(); }, []);
  useEffect(() => { fetchData(); }, [filterType]);

  useEffect(() => {
    if (!form.partyId) {
      setOutstandingItems([]); setTotalDues(0);
      setSelectedItemId(''); setForm(f => ({ ...f, amount: '' }));
      return;
    }
    setLoadingItems(true); setSelectedItemId(''); setForm(f => ({ ...f, amount: '' }));
    if (form.type === 'supplier') {
      fetch(`/api/stock?supplier=${form.partyId}`).then(r => r.json()).then(data => {
        const outstanding = (data.stocks || []).filter((s: any) => s.paymentStatus !== 'paid');
        setOutstandingItems(outstanding);
        setTotalDues(outstanding.reduce((sum: number, s: any) => sum + (s.totalPrice - (s.amountPaid || 0)), 0));
      }).finally(() => setLoadingItems(false));
    } else {
      fetch(`/api/sales?buyer=${form.partyId}`).then(r => r.json()).then(data => {
        const outstanding = (data.sales || []).filter((s: any) => s.paymentStatus !== 'paid');
        setOutstandingItems(outstanding);
        setTotalDues(outstanding.reduce((sum: number, s: any) => sum + (s.totalAmount - (s.amountPaid || 0)), 0));
      }).finally(() => setLoadingItems(false));
    }
  }, [form.type, form.partyId]);

  const getRemaining = (item: any) =>
    form.type === 'supplier' ? item.totalPrice - (item.amountPaid || 0) : item.totalAmount - (item.amountPaid || 0);

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId); setError('');
    if (itemId) {
      const item = outstandingItems.find(i => i._id === itemId || i._id?.toString() === itemId);
      if (item) setForm(f => ({ ...f, amount: getRemaining(item).toFixed(2) }));
    } else {
      setForm(f => ({ ...f, amount: '' }));
    }
  };

  const handleTypeChange = (type: string) => {
    setForm({ type, partyId: '', amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], notes: '', invoiceUrl: '' });
    setSelectedItemId(''); setOutstandingItems([]); setTotalDues(0); setError('');
  };

  const maxAmount = () => {
    if (!selectedItemId) return undefined;
    const item = outstandingItems.find(i => i._id === selectedItemId || i._id?.toString() === selectedItemId);
    return item ? getRemaining(item) : undefined;
  };

  const handleAmountChange = (val: string) => {
    setError('');
    if (parseFloat(val) < 0) return;
    const max = maxAmount();
    if (max !== undefined && parseFloat(val) > max + 0.001)
      setError(`Amount cannot exceed the remaining due of ${formatCurrency(max)}`);
    setForm(f => ({ ...f, amount: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    const max = maxAmount();
    if (max !== undefined && amt > max + 0.001) {
      setError(`Amount cannot exceed the remaining due of ${formatCurrency(max)}`); return;
    }
    setSaving(true);
    try {
      let res: Response;
      const isGeneralPayment = !selectedItemId;
      if (selectedItemId) {
        const endpoint = form.type === 'supplier' ? `/api/stock/${selectedItemId}` : `/api/sales/${selectedItemId}`;
        res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, method: form.method, date: form.date, notes: form.notes, invoiceUrl: form.invoiceUrl }) });
      } else {
        res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: amt }) });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to record payment'); return; }
      setShowForm(false);
      setForm({ type: 'supplier', partyId: '', amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], notes: '', invoiceUrl: '' });
      setSelectedItemId(''); setOutstandingItems([]); setTotalDues(0);
      if (isGeneralPayment && data.allocations) {
        setLastResult({ allocations: data.allocations, advance: data.advance || 0, total: amt });
      } else {
        setLastResult(null);
      }
      fetchData(); fetchBatchPayments();
    } finally { setSaving(false); }
  };

  const getPartyName = (p: any) => {
    if (p.type === 'supplier') return suppliers.find(s => s._id === p.partyId)?.name || 'Unknown';
    return buyers.find(b => b._id === p.partyId)?.name || 'Unknown';
  };

  const parties = form.type === 'supplier' ? suppliers : buyers;

  // Merged batch list for display
  const allBatchItems = [
    ...batchStocks.map(s => ({ ...s, _kind: 'stock', _label: s.batchName, _party: s.supplierId?.name || '—', _total: s.totalPrice, _sublabel: `${s.categoryId?.name || ''} • ${s.quantity} ${s.measurementUnit}s` })),
    ...batchSales.map(s => ({ ...s, _kind: 'sale', _label: s.invoiceNumber, _party: s.buyerId?.name || '—', _total: s.totalAmount, _sublabel: `${s.items?.length || 0} item(s)` })),
  ].filter(item =>
    batchFilter === 'all' ? true :
    batchFilter === 'supplier' ? item._kind === 'stock' :
    item._kind === 'sale'
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Record and view all supplier and buyer payments</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Record Payment</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex gap-2 items-start"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className={inputCls}>
                  <option value="supplier">Payment to Supplier</option>
                  <option value="buyer">Payment from Buyer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.type === 'supplier' ? 'Supplier' : 'Buyer'} *</label>
                <select value={form.partyId} onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))} required className={inputCls}>
                  <option value="">Select {form.type === 'supplier' ? 'Supplier' : 'Buyer'}</option>
                  {parties.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className={inputCls}>
                  <option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (Rs.) *{maxAmount() !== undefined && <span className="ml-1 text-xs font-normal text-gray-400">max: {formatCurrency(maxAmount()!)}</span>}
                </label>
                <input type="number" step="0.01" min="0.01" max={maxAmount() !== undefined ? maxAmount()! + 0.001 : undefined}
                  value={form.amount} onChange={e => handleAmountChange(e.target.value)} required className={inputCls}
                  placeholder={totalDues > 0 ? `Total dues: ${formatCurrency(totalDues)}` : '0.00'} />
                {maxAmount() !== undefined && parseFloat(form.amount) < (maxAmount()!) - 0.001 && parseFloat(form.amount) > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Partial payment — {formatCurrency((maxAmount()!) - parseFloat(form.amount))} will remain due</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} placeholder="Optional note" />
              </div>
              <div>
                <InvoiceUpload value={form.invoiceUrl} onChange={url => setForm(f => ({ ...f, invoiceUrl: url }))} />
              </div>
            </div>

            {form.partyId && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Outstanding {form.type === 'supplier' ? 'Stock Batches' : 'Invoices'}
                  </h4>
                  {totalDues > 0 && <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">Total Dues: {formatCurrency(totalDues)}</span>}
                </div>
                {loadingItems ? (
                  <div className="p-5 flex justify-center"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : outstandingItems.length === 0 ? (
                  <div className="p-5 text-center text-sm text-green-600 font-medium">✓ No outstanding dues</div>
                ) : (
                  <div>
                    <div onClick={() => handleItemSelect('')}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition ${selectedItemId === '' ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedItemId === '' ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                        {selectedItemId === '' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Auto-apply to Oldest Outstanding Dues</p>
                        <p className="text-xs text-gray-500">Payment will be applied to oldest {form.type === 'supplier' ? 'batches' : 'invoices'} first; any excess is saved as advance</p>
                        {selectedItemId === '' && totalDues > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded px-2 py-1">
                            <Info className="w-3 h-3 shrink-0" />
                            <span>Will clear outstanding dues of <strong>{formatCurrency(totalDues)}</strong> first, any remainder saved as advance</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {outstandingItems.map((item: any) => {
                      const remaining = getRemaining(item);
                      const isSelected = selectedItemId === item._id || selectedItemId === item._id?.toString();
                      const label = form.type === 'supplier' ? item.batchName : item.invoiceNumber;
                      const sublabel = form.type === 'supplier'
                        ? `${item.categoryId?.name || ''} • ${item.quantity} ${item.measurementUnit}s • ${formatDate(item.batchDate)}`
                        : `${item.items?.length || 0} item(s) • ${formatDate(item.createdAt)}`;
                      return (
                        <div key={item._id} onClick={() => handleItemSelect(item._id)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition ${isSelected ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{label}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge(item.paymentStatus)}`}>{item.paymentStatus}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((item.amountPaid || 0) / (form.type === 'supplier' ? item.totalPrice : item.totalAmount)) * 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">{formatCurrency(item.amountPaid || 0)} of {formatCurrency(form.type === 'supplier' ? item.totalPrice : item.totalAmount)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-red-600">{formatCurrency(remaining)}</p>
                            <p className="text-xs text-gray-400">remaining</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* FIFO allocation result */}
      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-green-800">Payment of {formatCurrency(lastResult.total)} Processed</p>
                {lastResult.allocations.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {lastResult.allocations.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">↳</span>
                        <span className="font-medium text-green-800">{a.label}</span>
                        <span className="text-green-700">{formatCurrency(a.appliedAmount)} applied</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold ${a.newStatus === 'paid' ? 'bg-green-200 text-green-800' : 'bg-amber-100 text-amber-700'}`}>{a.newStatus}</span>
                      </div>
                    ))}
                    {lastResult.advance > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-500">↳</span>
                        <span className="font-medium text-blue-700">{formatCurrency(lastResult.advance)} saved as advance (no more outstanding dues)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-green-700 mt-1">No outstanding dues — {formatCurrency(lastResult.advance)} saved as advance payment</p>
                )}
              </div>
              <button onClick={() => setLastResult(null)} className="text-green-400 hover:text-green-600 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center border-b border-gray-100 px-1 pt-1">
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'batch' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="w-4 h-4" />
            Batch & Invoice Payments
            {(batchStocks.length + batchSales.length) > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-semibold">{batchStocks.length + batchSales.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === 'general' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CreditCard className="w-4 h-4" />
            Advance Payments
            {payments.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">{payments.length}</span>
            )}
          </button>
        </div>

        {activeTab === 'batch' && (
          <div>
            <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
              {(['all', 'supplier', 'buyer'] as const).map(f => (
                <button key={f} onClick={() => setBatchFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${batchFilter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'All' : f === 'supplier' ? 'Supplier Batches' : 'Buyer Invoices'}
                </button>
              ))}
            </div>

            {loadingBatch ? (
              <div className="p-12 flex justify-center"><div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : allBatchItems.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No batch or invoice payments recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Payments against specific batches or invoices will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {allBatchItems.map((item: any) => {
                  const isExpanded = expandedBatch === item._id;
                  const paidViaPayments = (item.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
                  const initialPaid = (item.amountPaid || 0) - paidViaPayments;

                  return (
                    <div key={item._id}>
                      <div
                        onClick={() => setExpandedBatch(isExpanded ? null : item._id)}
                        className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/60 transition ${isExpanded ? 'bg-gray-50' : ''}`}
                      >
                        <div className="shrink-0 text-gray-300">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-primary-500" /> : <ChevronRight className="w-4 h-4" />}
                        </div>

                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item._kind === 'stock' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                          {item._kind === 'stock' ? <Package className="w-4 h-4 text-purple-600" /> : <FileText className="w-4 h-4 text-blue-600" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{item._label}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item._kind === 'stock' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                              {item._kind === 'stock' ? 'Supplier Batch' : 'Buyer Invoice'}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge(item.paymentStatus)}`}>{item.paymentStatus}</span>
                            {item.invoiceUrl && (
                              <a href={fileProxyUrl(item.invoiceUrl)} target="_blank" rel="noopener noreferrer"
                                title="View attachment" onClick={e => e.stopPropagation()}
                                className="text-gray-400 hover:text-primary-600 transition">
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item._kind === 'stock' ? 'Supplier' : 'Buyer'}: <span className="font-medium">{item._party}</span>
                            {' • '}{item._sublabel}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, ((item.amountPaid || 0) / item._total) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{formatCurrency(item.amountPaid || 0)} of {formatCurrency(item._total)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400 mb-0.5">{item.payments?.length} payment{item.payments?.length !== 1 ? 's' : ''}</p>
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(paidViaPayments)}</p>
                          <p className="text-xs text-gray-400">recorded here</p>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-primary-50/30 border-t border-b border-primary-100/40">
                          {initialPaid > 0.001 && (
                            <div className="flex items-center justify-between px-5 py-2.5 border-b border-primary-100/40">
                              <div className="flex items-center gap-3 pl-12">
                                <div className="w-px h-5 bg-primary-200" />
                                <div>
                                  <p className="text-xs font-medium text-gray-600">Initial Payment (at time of recording)</p>
                                  <p className="text-xs text-gray-400 capitalize">{item.paymentMethod || 'cash'}</p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-green-700">+{formatCurrency(initialPaid)}</span>
                            </div>
                          )}
                          {(item.payments || []).map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between px-5 py-2.5 border-b border-primary-100/40 last:border-b-0">
                              <div className="flex items-center gap-3 pl-12">
                                <div className="w-px h-5 bg-primary-300" />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-semibold text-primary-700">Payment #{idx + 1}</p>
                                    <span className="text-xs text-gray-500">{formatDate(p.date)}</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-white border border-gray-100 text-gray-600 capitalize">{p.method}</span>
                                    {p.invoiceUrl && (
                                      <a href={fileProxyUrl(p.invoiceUrl)} target="_blank" rel="noopener noreferrer"
                                        title="View payment attachment"
                                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 transition">
                                        <Paperclip className="w-3 h-3" /> Attachment
                                      </a>
                                    )}
                                  </div>
                                  {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                                </div>
                              </div>
                              <span className="text-sm font-bold text-green-700">+{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50/60">
                            <span className="text-xs font-semibold text-gray-600 pl-12">Total Paid</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(item.amountPaid || 0)} of {formatCurrency(item._total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'general' && (
          <div>
            <div className="px-5 py-3 border-b border-gray-50">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Advance Payments</option>
                <option value="supplier">To Suppliers</option>
                <option value="buyer">From Buyers</option>
              </select>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No advance payments recorded</p>
                <p className="text-xs text-gray-400 mt-1">Advance payments (excess after clearing all outstanding dues) appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="w-8 px-3 py-3" />
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Party</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => {
                      const isExpanded = expandedBatch === `gen-${p._id}`;
                      const partyName = getPartyName(p);
                      const relatedBatchPayments = p.type === 'supplier'
                        ? batchStocks.filter((s: any) => (s.supplierId?._id?.toString() || s.supplierId?.toString()) === p.partyId?.toString())
                        : batchSales.filter((s: any) => (s.buyerId?._id?.toString() || s.buyerId?.toString()) === p.partyId?.toString());
                      const hasRelated = relatedBatchPayments.length > 0;

                      return (
                        <React.Fragment key={p._id}>
                          <tr
                            onClick={() => hasRelated ? setExpandedBatch(isExpanded ? null : `gen-${p._id}`) : undefined}
                            className={`border-b border-gray-50 transition ${hasRelated ? 'cursor-pointer hover:bg-gray-50/60' : 'hover:bg-gray-50/30'} ${isExpanded ? 'bg-gray-50' : ''}`}
                          >
                            <td className="px-3 py-3 text-center w-8">
                              {hasRelated && (isExpanded
                                ? <ChevronDown className="w-4 h-4 text-primary-500 mx-auto" />
                                : <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />)}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.type === 'supplier' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                {p.type === 'supplier' ? 'To Supplier' : 'From Buyer'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-900">{partyName}</td>
                            <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</td>
                            <td className="px-5 py-3 text-sm text-gray-600 capitalize">{p.method}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{formatDate(p.date)}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{p.notes || '-'}</td>
                            <td className="px-5 py-3">
                              {p.invoiceUrl ? (
                                <a href={fileProxyUrl(p.invoiceUrl)} target="_blank" rel="noopener noreferrer"
                                  title="View attachment"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 bg-primary-50 px-2 py-1 rounded border border-primary-100 transition">
                                  <Paperclip className="w-3 h-3" /> View
                                </a>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          </tr>

                          {isExpanded && hasRelated && (
                            <tr className="border-b border-gray-50">
                              <td colSpan={8} className="px-0 py-0">
                                <div className="bg-amber-50/50 border-t border-amber-100">
                                  <div className="px-8 py-2 border-b border-amber-100">
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                      Dues Paid Later — {p.type === 'supplier' ? 'Batch' : 'Invoice'} Payments for {partyName}
                                    </p>
                                  </div>
                                  <div className="divide-y divide-amber-100/60">
                                    {relatedBatchPayments.map((item: any) => {
                                      const isStock = item.batchName !== undefined;
                                      const label = isStock ? item.batchName : item.invoiceNumber;
                                      const total = isStock ? item.totalPrice : item.totalAmount;
                                      return (
                                        <div key={item._id} className="px-8 py-3">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${isStock ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                              {isStock ? <Package className="w-3.5 h-3.5 text-purple-600" /> : <FileText className="w-3.5 h-3.5 text-blue-600" />}
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">{label}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge(item.paymentStatus)}`}>{item.paymentStatus}</span>
                                            <span className="text-xs text-gray-400 ml-auto">{formatCurrency(item.amountPaid || 0)} paid of {formatCurrency(total)}</span>
                                          </div>
                                          <div className="space-y-1 pl-8">
                                            {(item.payments || []).map((pay: any, idx: number) => (
                                              <div key={idx} className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                                                <span className="text-amber-500 font-bold">↳</span>
                                                <span className="font-medium">Payment #{idx + 1}</span>
                                                <span className="text-gray-400">{formatDate(pay.date)}</span>
                                                <span className="capitalize bg-white border border-gray-100 px-1.5 py-0.5 rounded text-gray-500">{pay.method}</span>
                                                {pay.notes && <span className="text-gray-400">— {pay.notes}</span>}
                                                {pay.invoiceUrl && (
                                                  <a href={fileProxyUrl(pay.invoiceUrl)} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 transition">
                                                    <Paperclip className="w-3 h-3" /> Attachment
                                                  </a>
                                                )}
                                                <span className="ml-auto font-semibold text-green-700">+{formatCurrency(pay.amount)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
