'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, TrendingUp, Package, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const periods = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'all',   label: 'All Time' },
];

interface CategoryRow {
  category:  string;
  purchased: number;
  sold:      number;
  remaining: number;
  revenue:   number;
  cost:      number;
  profit:    number;
  margin:    string;
}

interface BatchRow {
  batch:         string;
  supplier:      string;
  category:      string;
  unit:          string;
  purchased:     number;
  sold:          number;
  remaining:     number;
  revenue:       number;
  cost:          number;
  profit:        number;
  purchaseTotal: number;
  amountPaid:    number;
}

export default function ReportsPage() {
  const [period, setPeriod]               = useState('all');
  const [categoryReport, setCategoryReport] = useState<CategoryRow[]>([]);
  const [batchReport, setBatchReport]       = useState<BatchRow[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(data => {
        setCategoryReport(data.categoryReport || []);
        setBatchReport(data.batchReport || []);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const catTotals = categoryReport.reduce(
    (acc, r) => ({
      purchased: acc.purchased + r.purchased,
      sold:      acc.sold      + r.sold,
      remaining: acc.remaining + r.remaining,
      revenue:   acc.revenue   + r.revenue,
      cost:      acc.cost      + r.cost,
      profit:    acc.profit    + r.profit,
    }),
    { purchased: 0, sold: 0, remaining: 0, revenue: 0, cost: 0, profit: 0 }
  );

  const batchTotals = batchReport.reduce(
    (acc, r) => ({
      purchased:     acc.purchased     + r.purchased,
      sold:          acc.sold          + r.sold,
      remaining:     acc.remaining     + r.remaining,
      revenue:       acc.revenue       + r.revenue,
      cost:          acc.cost          + r.cost,
      profit:        acc.profit        + r.profit,
      purchaseTotal: acc.purchaseTotal + r.purchaseTotal,
      amountPaid:    acc.amountPaid    + r.amountPaid,
    }),
    { purchased: 0, sold: 0, remaining: 0, revenue: 0, cost: 0, profit: 0, purchaseTotal: 0, amountPaid: 0 }
  );

  const exportCategoryPDF = async () => {
    const jspdfModule = await import('jspdf');
    const JsPDF = (jspdfModule as any).jsPDF || jspdfModule.default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new JsPDF();
    doc.setFontSize(16);
    doc.text('Ray Cloth House — Category Profit Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${periods.find(p => p.key === period)?.label}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [['Category', 'Purchased', 'Sold', 'Remaining', 'Revenue', 'Cost', 'Profit', 'Margin %']],
      body: [
        ...categoryReport.map(r => [
          r.category, r.purchased, r.sold, r.remaining,
          formatCurrency(r.revenue), formatCurrency(r.cost), formatCurrency(r.profit), `${r.margin}%`,
        ]),
        [
          'TOTAL',
          catTotals.purchased, catTotals.sold, catTotals.remaining,
          formatCurrency(catTotals.revenue), formatCurrency(catTotals.cost), formatCurrency(catTotals.profit),
          catTotals.revenue > 0 ? `${((catTotals.profit / catTotals.revenue) * 100).toFixed(1)}%` : '0.0%',
        ],
      ],
      headStyles: { fillColor: [66, 99, 235] },
      styles: { fontSize: 8 },
    });
    doc.save('category-profit-report.pdf');
  };

  const exportBatchPDF = async () => {
    const jspdfModule = await import('jspdf');
    const JsPDF = (jspdfModule as any).jsPDF || jspdfModule.default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new JsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Ray Cloth House — Batch Profit Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${periods.find(p => p.key === period)?.label}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [['Batch', 'Supplier', 'Category', 'Unit', 'Purchased', 'Sold', 'Remaining', 'Revenue', 'Cost', 'Profit', 'Batch Total', 'Paid']],
      body: [
        ...batchReport.map(r => [
          r.batch, r.supplier, r.category, r.unit,
          r.purchased, r.sold, r.remaining,
          formatCurrency(r.revenue), formatCurrency(r.cost), formatCurrency(r.profit),
          formatCurrency(r.purchaseTotal), formatCurrency(r.amountPaid),
        ]),
        [
          'TOTAL', '', '', '',
          batchTotals.purchased, batchTotals.sold, batchTotals.remaining,
          formatCurrency(batchTotals.revenue), formatCurrency(batchTotals.cost), formatCurrency(batchTotals.profit),
          formatCurrency(batchTotals.purchaseTotal), formatCurrency(batchTotals.amountPaid),
        ],
      ],
      headStyles: { fillColor: [66, 99, 235] },
      styles: { fontSize: 7 },
    });
    doc.save('batch-profit-report.pdf');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Category-wise and batch-wise profit analysis</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {periods.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === p.key ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Category Report ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Category-wise Profit Report</h2>
              </div>
              {categoryReport.length > 0 && (
                <button onClick={exportCategoryPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
              )}
            </div>

            {categoryReport.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                  <Tag className="w-6 h-6 text-gray-200" />
                </div>
                <p className="text-sm font-medium text-gray-500">No stock found for this period</p>
                <p className="text-xs text-gray-400 mt-1">Add stock batches to see category analysis here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Purchased</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sold</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Remaining</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cost</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Profit</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">{r.category}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{r.purchased}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{r.sold}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${r.remaining > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{r.remaining}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">{r.revenue > 0 ? formatCurrency(r.revenue) : <span className="text-gray-300">—</span>}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{r.cost > 0 ? formatCurrency(r.cost) : <span className="text-gray-300">—</span>}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${r.profit > 0 ? 'text-green-600' : r.profit < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {r.revenue > 0 ? formatCurrency(r.profit) : <span className="text-xs text-gray-300">No sales</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.revenue > 0
                            ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Number(r.margin) >= 20 ? 'bg-green-50 text-green-700' : Number(r.margin) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{r.margin}%</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                      <td className="py-3 px-4 text-gray-900 text-xs uppercase tracking-wide">Total</td>
                      <td className="py-3 px-4 text-right text-gray-900">{catTotals.purchased}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{catTotals.sold}</td>
                      <td className="py-3 px-4 text-right text-blue-700">{catTotals.remaining}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(catTotals.revenue)}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(catTotals.cost)}</td>
                      <td className={`py-3 px-4 text-right ${catTotals.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(catTotals.profit)}</td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {catTotals.revenue > 0 ? `${((catTotals.profit / catTotals.revenue) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Batch Report ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-orange-500" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Batch-wise Profit Report</h2>
              </div>
              {batchReport.length > 0 && (
                <button onClick={exportBatchPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
              )}
            </div>

            {batchReport.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-gray-200" />
                </div>
                <p className="text-sm font-medium text-gray-500">No stock batches found for this period</p>
                <p className="text-xs text-gray-400 mt-1">Add stock purchases to see batch analysis here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Batch</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Category</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Purchased</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sold</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Remaining</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Batch Total</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Paid</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchReport.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{r.batch}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.unit}s</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{r.supplier}</td>
                        <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{r.category}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{r.purchased}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={r.sold > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>{r.sold}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={r.remaining > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>{r.remaining}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 hidden md:table-cell">{formatCurrency(r.purchaseTotal)}</td>
                        <td className="py-3 px-4 text-right hidden md:table-cell">
                          <span className={r.amountPaid >= r.purchaseTotal ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                            {formatCurrency(r.amountPaid)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {r.revenue > 0 ? formatCurrency(r.revenue) : <span className="text-gray-300 text-xs">No sales</span>}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${r.profit > 0 ? 'text-green-600' : r.profit < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {r.revenue > 0 ? formatCurrency(r.profit) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                      <td className="py-3 px-4 text-gray-900 text-xs uppercase tracking-wide" colSpan={3}>Total</td>
                      <td className="py-3 px-4 text-right text-gray-900">{batchTotals.purchased}</td>
                      <td className="py-3 px-4 text-right text-green-700">{batchTotals.sold}</td>
                      <td className="py-3 px-4 text-right text-blue-700">{batchTotals.remaining}</td>
                      <td className="py-3 px-4 text-right text-gray-900 hidden md:table-cell">{formatCurrency(batchTotals.purchaseTotal)}</td>
                      <td className="py-3 px-4 text-right text-gray-900 hidden md:table-cell">{formatCurrency(batchTotals.amountPaid)}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(batchTotals.revenue)}</td>
                      <td className={`py-3 px-4 text-right ${batchTotals.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(batchTotals.profit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
