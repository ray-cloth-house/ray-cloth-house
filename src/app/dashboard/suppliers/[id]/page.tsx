'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Truck, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusCls = (s: string) =>
  s === 'paid' ? 'bg-green-50 text-green-700' :
  s === 'partial' ? 'bg-amber-50 text-amber-700' :
  'bg-red-50 text-red-700';

export default function SupplierDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/suppliers/${params.id}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data?.supplier) return <div className="text-center py-12 text-gray-500">Supplier not found</div>;

  const { supplier, stocks, payments, summary } = data;

  return (
    <div>
      <Link href="/dashboard/suppliers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Suppliers
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
          <Truck className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="text-sm text-gray-500">{supplier.phone}{supplier.address ? ` • ${supplier.address}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Purchases</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalPurchases)}</p>
          {supplier.openingBalance > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">+ {formatCurrency(supplier.openingBalance)} opening</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Paid (Batches)</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalStockPaid)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Via batch payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Paid (General)</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalGeneralPayments)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Via general payments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Balance Due</p>
          <p className={`text-xl font-bold ${summary.balance > 0.001 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(summary.balance))}
          </p>
          {summary.balance <= 0.001 && <p className="text-xs text-green-500 mt-0.5">Fully cleared</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Stock Batches</h3>
            <span className="text-xs text-gray-400">Click to see batch payments</span>
          </div>
          {stocks.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No purchases yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stocks.map((s: any) => {
                const remaining = s.totalPrice - (s.amountPaid || 0);
                const isExpanded = expandedBatch === s._id;
                const hasBatchPayments = s.payments && s.payments.length > 0;
                return (
                  <div key={s._id}>
                    <div
                      onClick={() => setExpandedBatch(isExpanded ? null : s._id)}
                      className={`px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition ${isExpanded ? 'bg-gray-50' : ''}`}
                    >
                      <div className="text-gray-300 shrink-0">
                        {hasBatchPayments
                          ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                          : <div className="w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{s.batchName}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls(s.paymentStatus)}`}>
                            {s.paymentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.categoryId?.name} • {s.quantity} {s.measurementUnit}s • {formatDate(s.batchDate)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1">
                            <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(100, ((s.amountPaid || 0) / s.totalPrice) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{formatCurrency(s.amountPaid || 0)} of {formatCurrency(s.totalPrice)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(s.totalPrice)}</p>
                        {remaining > 0.001 && <p className="text-xs text-red-500">{formatCurrency(remaining)} due</p>}
                      </div>
                    </div>

                    {isExpanded && hasBatchPayments && (
                      <div className="bg-primary-50/30 border-t border-primary-100/50">
                        {s.payments.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between px-5 py-2 border-b border-primary-100/30 last:border-b-0">
                            <div className="flex items-center gap-3 pl-4">
                              <div className="w-px h-4 bg-primary-300" />
                              <div>
                                <span className="text-xs font-medium text-primary-700">Payment #{idx + 1}</span>
                                <span className="text-xs text-gray-500 ml-2">{formatDate(p.date)}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize ml-1">{p.method}</span>
                                {p.notes && <span className="text-xs text-gray-400 ml-1">— {p.notes}</span>}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-green-700">+{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50"><h3 className="text-sm font-semibold text-gray-900">General Payments</h3></div>
          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No general payments recorded</div>
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
    </div>
  );
}
