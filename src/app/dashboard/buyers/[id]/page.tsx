'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, X, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusCls = (status: string) =>
  status === 'paid' ? 'bg-green-50 text-green-700' :
  status === 'partial' ? 'bg-amber-50 text-amber-700' :
  'bg-red-50 text-red-700';

function InvoiceModal({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${saleId}`)
      .then(r => r.json())
      .then(data => setSale(data.sale))
      .finally(() => setLoading(false));
  }, [saleId]);

  const downloadPDF = async () => {
    if (!sale) return;
    try {
      const jspdfModule = await import('jspdf');
      const JsPDF = (jspdfModule as any).jsPDF || jspdfModule.default;
      const doc = new JsPDF();
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

      const tableRows = (sale.items || []).map((item: any) => [
        item.batchName || '',
        item.categoryId?.name || '',
        `${item.quantity} ${item.measurementUnit || ''}`,
        formatCurrency(item.unitPrice),
        formatCurrency(item.totalPrice),
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Item/Batch', 'Category', 'Qty', 'Unit Price', 'Total']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [66, 99, 235] },
        styles: { fontSize: 9 },
      });

      const y = (doc as any).lastAutoTable?.finalY + 10 || 110;
      doc.text(`Total: ${formatCurrency(sale.totalAmount)}`, 14, y);
      doc.text(`Paid: ${formatCurrency(sale.amountPaid)}`, 14, y + 7);
      const pending = sale.totalAmount - sale.amountPaid;
      if (pending > 0) doc.text(`Remaining: ${formatCurrency(pending)}`, 14, y + 14);

      doc.save(`${sale.invoiceNumber}.pdf`);
    } catch (e) {
      alert('Could not generate PDF.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Invoice Details</h2>
            {!loading && sale && <p className="text-xs text-gray-500 mt-0.5">{sale.invoiceNumber} • {formatDate(sale.createdAt)}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !sale ? (
          <div className="p-8 text-center text-sm text-gray-500">Invoice not found</div>
        ) : (
          <div className="p-6">
            <div className="mb-5 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-900">{sale.buyerId?.name}</p>
              {sale.buyerId?.phone && <p className="text-gray-500 text-xs mt-0.5">{sale.buyerId.phone}{sale.buyerId?.address ? ` • ${sale.buyerId.address}` : ''}</p>}
            </div>

            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</h4>
            <table className="w-full mb-5 text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500">Batch / Category</th>
                  <th className="text-right py-2 text-xs text-gray-500">Qty</th>
                  <th className="text-right py-2 text-xs text-gray-500">Price</th>
                  <th className="text-right py-2 text-xs text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{item.batchName}</p>
                      <p className="text-xs text-gray-400">{item.categoryId?.name}</p>
                    </td>
                    <td className="text-right py-2 text-gray-600">{item.quantity} {item.measurementUnit}s</td>
                    <td className="text-right py-2 text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-2 font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Initial Payment</span>
                <span className="text-green-600 font-medium">{formatCurrency(sale.amountPaid - (sale.payments || []).reduce((s: number, p: any) => s + p.amount, 0))}</span>
              </div>

              {(sale.payments || []).length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Additional Payments</p>
                  {(sale.payments || []).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center pl-3 border-l-2 border-primary-200">
                      <div>
                        <p className="text-xs text-gray-700">Payment #{i + 1} — {formatDate(p.date)}</p>
                        <p className="text-xs text-gray-400 capitalize">{p.method}{p.notes ? ` • ${p.notes}` : ''}</p>
                      </div>
                      <span className="text-green-600 font-medium text-sm">+{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Total Paid</span>
                  <span className="font-bold text-green-600">{formatCurrency(sale.amountPaid)}</span>
                </div>
                {sale.totalAmount - sale.amountPaid > 0 && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Remaining Balance</span>
                    <span className="font-bold text-red-600">{formatCurrency(sale.totalAmount - sale.amountPaid)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusCls(sale.paymentStatus)}`}>{sale.paymentStatus?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={downloadPDF} className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyerDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/buyers/${params.id}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data?.buyer) return <div className="text-center py-12 text-gray-500">Buyer not found</div>;

  const { buyer, sales, payments, summary } = data;

  return (
    <div>
      <Link href="/dashboard/buyers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Buyers
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{buyer.name}</h1>
          <p className="text-sm text-gray-500">{buyer.phone}{buyer.address ? ` • ${buyer.address}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Sales</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalSales)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Received</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalReceived)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Outstanding Balance</p>
          <p className={`text-xl font-bold ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.abs(summary.balance))}</p>
          {summary.balance <= 0 && <p className="text-xs text-green-500 mt-0.5">Fully cleared</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Sales / Invoices</h3>
            <span className="text-xs text-gray-400">Click to view invoice</span>
          </div>
          {sales.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No sales yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sales.map((s: any) => (
                <div
                  key={s._id}
                  onClick={() => setOpenInvoiceId(s._id)}
                  className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-primary-50/50 transition group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition">{s.invoiceNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{s.items?.length || 0} items</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls(s.paymentStatus)}`}>{s.paymentStatus}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(s.totalAmount)}</p>
                    {s.paymentStatus !== 'paid' && (
                      <p className="text-xs text-red-500 font-medium">{formatCurrency(s.totalAmount - s.amountPaid)} due</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(s.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50"><h3 className="text-sm font-semibold text-gray-900">Payment History</h3></div>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No general payments yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map((p: any) => (
                <div key={p._id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.method}{p.notes ? ` • ${p.notes}` : ''}</p>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {openInvoiceId && <InvoiceModal saleId={openInvoiceId} onClose={() => setOpenInvoiceId(null)} />}
    </div>
  );
}
