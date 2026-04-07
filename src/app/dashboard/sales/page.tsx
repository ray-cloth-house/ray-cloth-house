'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Eye, Download, UserPlus, X, ChevronDown, ChevronRight, CreditCard, Paperclip } from 'lucide-react';
import { formatCurrency, formatDate, fileProxyUrl } from '@/lib/utils';
import InvoiceUpload from '@/components/InvoiceUpload';

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const iconBtnCls = 'shrink-0 flex items-center justify-center w-10 h-[38px] border border-gray-200 rounded-lg text-gray-500 hover:text-primary-600 hover:border-primary-400 hover:bg-primary-50 transition';

const statusCls = (status: string) =>
  status === 'paid' ? 'bg-green-50 text-green-700' :
  status === 'partial' ? 'bg-amber-50 text-amber-700' :
  'bg-red-50 text-red-700';

function AddBuyerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (b: any) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', cnic: '', openingBalance: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/buyers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      onAdded(data.buyer); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div><h2 className="text-base font-bold text-gray-900">Add New Buyer</h2><p className="text-xs text-gray-500 mt-0.5">Available immediately after creation</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label><input value={form.cnic} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} className={inputCls} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (Rs.)</label><input type="number" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: Number(e.target.value) }))} className={inputCls} /></div>
          <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} /></div>
          <div className="col-span-2 flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-60">{saving ? 'Creating…' : 'Create Buyer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordPaymentModal({ sale, onClose, onRecorded }: { sale: any; onClose: () => void; onRecorded: (s: any) => void }) {
  const remaining = (sale.totalAmount || 0) - (sale.amountPaid || 0);
  const [form, setForm] = useState({ amount: remaining.toFixed(2), method: 'cash', date: new Date().toISOString().split('T')[0], notes: '', invoiceUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const res = await fetch(`/api/sales/${sale._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to record payment'); return; }
      onRecorded(data.sale); onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Invoice {sale.invoiceNumber} — Remaining: <span className="font-semibold text-red-600">{formatCurrency(remaining)}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.) *</label>
            <input type="number" step="0.01" min="0.01" max={remaining} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required autoFocus className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional note" className={inputCls} />
          </div>
          <InvoiceUpload value={form.invoiceUrl} onChange={url => setForm(f => ({ ...f, invoiceUrl: url }))} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-60">{saving ? 'Recording…' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState<any>(null);
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [recordPaymentSale, setRecordPaymentSale] = useState<any>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    buyerId: '', items: [{ stockId: '', quantity: '', unitPrice: '' }],
    amountPaid: '', paymentMethod: 'cash', notes: '', invoiceUrl: '',
  });

  const fetchData = () => {
    Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/buyers?active=true').then(r => r.json()),
      fetch('/api/stock').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([sData, bData, stData, cData]) => {
      setSales(sData.sales || []);
      setBuyers(bData.buyers || []);
      setStocks(stData.stocks || []);
      setCategories(cData.categories || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { stockId: '', quantity: '', unitPrice: '' }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx: number, field: string, value: string) => {
    const newItems = [...form.items];
    (newItems[idx] as any)[field] = value;
    setForm({ ...form, items: newItems });
  };

  const getSelectedStock = (stockId: string) => stocks.find(s => s._id === stockId);

  const calcTotal = () => form.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0);
  const calcProfit = () => form.items.reduce((sum, item) => {
    const stock = getSelectedStock(item.stockId);
    if (!stock) return sum;
    return sum + (parseFloat(item.unitPrice) - stock.unitPrice) * (parseFloat(item.quantity) || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerId: form.buyerId,
        items: form.items.map(i => ({ stockId: i.stockId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) })),
        amountPaid: parseFloat(form.amountPaid) || 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        invoiceUrl: form.invoiceUrl,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setShowForm(false);
      setForm({ buyerId: '', items: [{ stockId: '', quantity: '', unitPrice: '' }], amountPaid: '', paymentMethod: 'cash', notes: '', invoiceUrl: '' });
      fetchData();
      viewInvoice(data.sale._id);
    }
  };

  const handleBuyerAdded = (buyer: any) => {
    setBuyers(prev => [...prev, buyer]);
    setForm(f => ({ ...f, buyerId: buyer._id }));
  };

  const handlePaymentRecorded = (_updatedSale: any) => {
    fetchData();
  };

  const viewInvoice = async (id: string) => {
    const res = await fetch(`/api/sales/${id}`);
    const data = await res.json();
    setShowInvoice(data.sale);
  };

  const downloadInvoicePDF = async (sale: any) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule as any).default || autoTableModule;

      doc.setFontSize(18);
      doc.text('Ray Cloth House', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
      doc.setFontSize(11);
      doc.text('Invoice', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Invoice No: ${sale.invoiceNumber}`, 14, 36);
      doc.text(`Date: ${formatDate(sale.createdAt)}`, 14, 42);
      doc.text(`Buyer: ${sale.buyerId?.name || 'N/A'}`, 14, 48);
      doc.text(`Phone: ${sale.buyerId?.phone || 'N/A'}`, 14, 54);
      if (sale.buyerId?.address) doc.text(`Address: ${sale.buyerId.address}`, 14, 60);

      const tableRows = (sale.items || []).map((item: any) => [
        item.batchName || '',
        item.categoryId?.name || '',
        `${item.quantity} ${item.measurementUnit || ''}`,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalPrice),
      ]);

      autoTable(doc, {
        startY: 68,
        head: [['Item/Batch', 'Category', 'Qty', 'Unit Price', 'Total']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [66, 99, 235] },
        styles: { fontSize: 9 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY + 10 || 120;
      doc.setFontSize(10);
      doc.text(`Total Amount: ${formatCurrency(sale.totalAmount)}`, 14, finalY);
      doc.text(`Amount Paid: ${formatCurrency(sale.amountPaid)}`, 14, finalY + 7);
      const pending = sale.totalAmount - sale.amountPaid;
      if (pending > 0) doc.text(`Pending Balance: ${formatCurrency(pending)}`, 14, finalY + 14);
      doc.text(`Payment Status: ${sale.paymentStatus?.toUpperCase()}`, 14, finalY + (pending > 0 ? 21 : 14));

      if (sale.payments && sale.payments.length > 0) {
        const payY = finalY + (pending > 0 ? 32 : 25);
        doc.setFontSize(10);
        doc.text('Additional Payments:', 14, payY);
        autoTable(doc, {
          startY: payY + 4,
          head: [['Date', 'Amount', 'Method', 'Notes']],
          body: sale.payments.map((p: any) => [formatDate(p.date), formatCurrency(p.amount), p.method, p.notes || '']),
          theme: 'striped',
          headStyles: { fillColor: [100, 130, 255] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please try again.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">Record and manage sales transactions</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {showInvoice && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvoice(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Ray Cloth House</h2>
              <p className="text-sm text-gray-600 font-medium">{showInvoice.invoiceNumber}</p>
              <p className="text-xs text-gray-400">{formatDate(showInvoice.createdAt)}</p>
            </div>
            <div className="mb-4 text-sm">
              <p className="text-gray-600">Buyer: <span className="font-medium text-gray-900">{showInvoice.buyerId?.name || 'N/A'}</span></p>
              <p className="text-xs text-gray-500">{showInvoice.buyerId?.phone}{showInvoice.buyerId?.address ? ` • ${showInvoice.buyerId.address}` : ''}</p>
            </div>
            <table className="w-full mb-4 text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 text-gray-500">Item</th><th className="text-right py-2 text-gray-500">Qty</th><th className="text-right py-2 text-gray-500">Price</th><th className="text-right py-2 text-gray-500">Total</th></tr></thead>
              <tbody>
                {showInvoice.items?.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">{item.batchName}<br /><span className="text-xs text-gray-400">{item.categoryId?.name}</span></td>
                    <td className="text-right py-2">{item.quantity} {item.measurementUnit}s</td>
                    <td className="text-right py-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
              <div className="flex justify-between"><span className="text-gray-600">Total Amount</span><span className="font-bold">{formatCurrency(showInvoice.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Initial Payment</span><span className="text-green-600">{formatCurrency(showInvoice.amountPaid)}</span></div>
              {(showInvoice.payments || []).map((p: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-gray-500 pl-3 border-l-2 border-primary-200">
                  <span>+ Payment on {formatDate(p.date)} ({p.method}){p.notes ? ` — ${p.notes}` : ''}</span>
                  <span className="text-green-600 font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {showInvoice.totalAmount - showInvoice.amountPaid > 0 && (
                <div className="flex justify-between font-medium pt-1 border-t border-gray-100"><span className="text-gray-700">Remaining Balance</span><span className="text-red-600">{formatCurrency(showInvoice.totalAmount - showInvoice.amountPaid)}</span></div>
              )}
              <div className="flex justify-between pt-1"><span className="text-gray-600">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(showInvoice.paymentStatus)}`}>{showInvoice.paymentStatus}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => downloadInvoicePDF(showInvoice)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={() => setShowInvoice(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Sale</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
                <div className="flex gap-2">
                  <select value={form.buyerId} onChange={e => setForm({ ...form, buyerId: e.target.value })} required className={inputCls}>
                    <option value="">Select Buyer</option>
                    {buyers.filter(b => b.isActive).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAddBuyer(true)} title="Add new buyer" className={iconBtnCls}>
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className={inputCls}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {form.items.map((item, idx) => {
                const stock = getSelectedStock(item.stockId);
                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="md:col-span-2">
                      <select value={item.stockId} onChange={e => updateItem(idx, 'stockId', e.target.value)} required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Select Stock</option>
                        {stocks.filter(s => s.remainingQuantity > 0).map(s => (
                          <option key={s._id} value={s._id}>{s.batchName} - {s.categoryId?.name} ({s.remainingQuantity} {s.measurementUnit}s)</option>
                        ))}
                      </select>
                      {stock && <p className="text-xs text-gray-400 mt-1">Cost: {formatCurrency(stock.unitPrice)} per {stock.measurementUnit}</p>}
                    </div>
                    <div>
                      <input type="number" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <input type="number" step="0.01" placeholder="Sell Price" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}</span>
                      {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add Another Item</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(calcTotal())}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Expected Profit</p>
                <p className={`text-lg font-bold ${calcProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(calcProfit())}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount Paid Now (Rs.)</label>
                <input type="number" step="0.01" min="0" value={form.amountPaid} onChange={e => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0 for credit" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            <InvoiceUpload value={form.invoiceUrl} onChange={url => setForm(f => ({ ...f, invoiceUrl: url }))} />

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700">Complete Sale</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100">
        {sales.length === 0 ? (
          <div className="p-12 text-center"><ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No sales yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="w-8 px-3 py-3"></th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const hasPayments = s.payments && s.payments.length > 0;
                  const isExpanded = expandedSale === s._id;

                  return (
                    <React.Fragment key={s._id}>
                      <tr className={`border-b border-gray-50 hover:bg-gray-50/50 ${hasPayments ? 'cursor-pointer' : ''}`}
                        onClick={() => hasPayments ? setExpandedSale(isExpanded ? null : s._id) : undefined}>
                        <td className="px-3 py-3 text-gray-400">
                          {hasPayments ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : null}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.invoiceNumber}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{s.buyerId?.name || 'N/A'}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{s.items?.length || 0}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrency(s.totalAmount)}</td>
                        <td className="px-5 py-3 text-sm text-green-600">{formatCurrency(s.amountPaid)}</td>
                        <td className="px-5 py-3 text-sm text-green-600">{formatCurrency(s.totalProfit)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCls(s.paymentStatus)}`}>{s.paymentStatus}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                        <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {s.invoiceUrl && (
                              <a href={fileProxyUrl(s.invoiceUrl)} target="_blank" rel="noopener noreferrer" title="View attachment"
                                className="text-gray-400 hover:text-primary-600 transition">
                                <Paperclip className="w-4 h-4" />
                              </a>
                            )}
                            {(s.paymentStatus === 'partial' || s.paymentStatus === 'unpaid') && (
                              <button onClick={() => setRecordPaymentSale(s)} title="Record payment"
                                className="text-gray-400 hover:text-primary-600 transition">
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => viewInvoice(s._id)} title="View invoice"
                              className="text-gray-400 hover:text-primary-600 transition">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && hasPayments && s.payments.map((p: any, pIdx: number) => (
                        <tr key={`${s._id}-p-${pIdx}`} className="bg-primary-50/40 border-b border-primary-100/50">
                          <td className="px-3 py-2"></td>
                          <td className="px-5 py-2" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <div className="w-px h-4 bg-primary-300 ml-1" />
                              <span className="text-xs text-primary-700 font-medium">Payment #{pIdx + 1}</span>
                              <span className="text-xs text-gray-500">{formatDate(p.date)}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{p.method}</span>
                            </div>
                          </td>
                          <td className="px-5 py-2 text-sm text-gray-500">{p.notes || '—'}</td>
                          <td className="px-5 py-2 text-sm font-medium text-green-700" colSpan={6}>
                            +{formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddBuyer && <AddBuyerModal onClose={() => setShowAddBuyer(false)} onAdded={handleBuyerAdded} />}
      {recordPaymentSale && <RecordPaymentModal sale={recordPaymentSale} onClose={() => setRecordPaymentSale(null)} onRecorded={handlePaymentRecorded} />}
    </div>
  );
}
