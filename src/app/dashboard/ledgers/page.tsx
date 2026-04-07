'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, FileDown, Calendar, ChevronDown,
  ArrowDownLeft, ArrowUpRight, Minus, Scale,
  Users, Truck, TrendingUp, TrendingDown, LayoutList, User
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface LedgerRow {
  date: Date;
  particulars: string;
  reference: string;
  debit: number;
  credit: number;
}

interface AllRow {
  date: Date;
  party: string;
  partyType: 'supplier' | 'buyer';
  particulars: string;
  debit: number;
  credit: number;
}

type MainTab = 'all' | 'party';

export default function LedgersPage() {
  const [mainTab, setMainTab] = useState<MainTab>('all');

  // ── Shared date filter ──────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // ── Party tab state ─────────────────────────────────────────────────────
  const [partyType,       setPartyType]       = useState<'supplier' | 'buyer'>('supplier');
  const [parties,         setParties]         = useState<any[]>([]);
  const [selectedParty,   setSelectedParty]   = useState<any>(null);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [rows,            setRows]            = useState<LedgerRow[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [loadingParties,  setLoadingParties]  = useState(true);

  // ── All tab state ───────────────────────────────────────────────────────
  const [allRows,     setAllRows]     = useState<AllRow[]>([]);
  const [loadingAll,  setLoadingAll]  = useState(false);
  const [allLoaded,   setAllLoaded]   = useState(false);

  // ── Fetch parties list when partyType changes ───────────────────────────
  useEffect(() => {
    setLoadingParties(true);
    setSelectedPartyId('');
    setSelectedParty(null);
    setRows([]);
    const url = partyType === 'supplier' ? '/api/suppliers?active=true' : '/api/buyers?active=true';
    fetch(url).then(r => r.json()).then(d => {
      setParties(partyType === 'supplier' ? (d.suppliers || []) : (d.buyers || []));
    }).finally(() => setLoadingParties(false));
  }, [partyType]);

  // ── Build per-party ledger ──────────────────────────────────────────────
  const buildLedger = useCallback(async (partyId: string) => {
    if (!partyId) return;
    setLoading(true);
    try {
      const ledgerRows: LedgerRow[] = [];
      if (partyType === 'supplier') {
        const [stockRes, payRes] = await Promise.all([
          fetch(`/api/stock?supplier=${partyId}`).then(r => r.json()),
          fetch(`/api/payments?type=supplier&partyId=${partyId}`).then(r => r.json()),
        ]);
        for (const s of (stockRes.stocks || [])) {
          ledgerRows.push({ date: new Date(s.batchDate || s.createdAt), particulars: `Stock Purchase — ${s.batchName}`, reference: s.categoryId?.name ? `${s.categoryId.name} • ${s.quantity} ${s.measurementUnit}s` : '', debit: 0, credit: s.totalPrice });
          const subPaid = (s.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
          const initPaid = (s.amountPaid || 0) - subPaid;
          if (initPaid > 0.001) ledgerRows.push({ date: new Date(s.batchDate || s.createdAt), particulars: `Payment — Initial (${s.batchName})`, reference: s.paymentMethod || 'Cash', debit: initPaid, credit: 0 });
          for (const p of (s.payments || [])) ledgerRows.push({ date: new Date(p.date), particulars: `Payment — ${s.batchName}`, reference: `${p.method || 'Cash'}${p.notes ? ' · ' + p.notes : ''}`, debit: p.amount, credit: 0 });
        }
        for (const p of (payRes.payments || [])) ledgerRows.push({ date: new Date(p.date), particulars: 'Advance Payment', reference: `${p.method}${p.notes ? ' · ' + p.notes : ''}`, debit: p.amount, credit: 0 });
      } else {
        const [salesRes, payRes] = await Promise.all([
          fetch(`/api/sales?buyer=${partyId}`).then(r => r.json()),
          fetch(`/api/payments?type=buyer&partyId=${partyId}`).then(r => r.json()),
        ]);
        for (const s of (salesRes.sales || [])) {
          ledgerRows.push({ date: new Date(s.createdAt), particulars: `Sale — ${s.invoiceNumber}`, reference: `${s.items?.length || 0} item(s)`, debit: s.totalAmount, credit: 0 });
          const subPaid = (s.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
          const initPaid = (s.amountPaid || 0) - subPaid;
          if (initPaid > 0.001) ledgerRows.push({ date: new Date(s.createdAt), particulars: `Payment Received — Initial (${s.invoiceNumber})`, reference: s.paymentMethod || 'Cash', debit: 0, credit: initPaid });
          for (const p of (s.payments || [])) ledgerRows.push({ date: new Date(p.date), particulars: `Payment Received — ${s.invoiceNumber}`, reference: `${p.method || 'Cash'}${p.notes ? ' · ' + p.notes : ''}`, debit: 0, credit: p.amount });
        }
        for (const p of (payRes.payments || [])) ledgerRows.push({ date: new Date(p.date), particulars: 'Advance Payment Received', reference: `${p.method}${p.notes ? ' · ' + p.notes : ''}`, debit: 0, credit: p.amount });
      }
      setRows(ledgerRows);
    } finally { setLoading(false); }
  }, [partyType]);

  const handlePartyChange = (id: string) => {
    setSelectedPartyId(id);
    setSelectedParty(parties.find(p => p._id === id) || null);
    if (id) buildLedger(id); else setRows([]);
  };

  // ── Build ALL ledger ────────────────────────────────────────────────────
  const buildAllLedger = useCallback(async () => {
    setLoadingAll(true);
    try {
      const [stockRes, salesRes, suppliersRes, buyersRes, suppPayRes, buyPayRes] = await Promise.all([
        fetch('/api/stock').then(r => r.json()),
        fetch('/api/sales').then(r => r.json()),
        fetch('/api/suppliers?active=true').then(r => r.json()),
        fetch('/api/buyers?active=true').then(r => r.json()),
        fetch('/api/payments?type=supplier').then(r => r.json()),
        fetch('/api/payments?type=buyer').then(r => r.json()),
      ]);

      const supplierMap: Record<string, string> = {};
      for (const s of (suppliersRes.suppliers || [])) supplierMap[s._id] = s.name;
      const buyerMap: Record<string, string> = {};
      for (const b of (buyersRes.buyers || [])) buyerMap[b._id] = b.name;

      const combined: AllRow[] = [];

      for (const s of (stockRes.stocks || [])) {
        const name = s.supplierId?.name || supplierMap[s.supplierId] || 'Unknown Supplier';
        combined.push({ date: new Date(s.batchDate || s.createdAt), party: name, partyType: 'supplier', particulars: `Purchase — ${s.batchName}`, debit: 0, credit: s.totalPrice });
        const subPaid = (s.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
        const initPaid = (s.amountPaid || 0) - subPaid;
        if (initPaid > 0.001) combined.push({ date: new Date(s.batchDate || s.createdAt), party: name, partyType: 'supplier', particulars: `Payment — ${s.batchName} (initial)`, debit: initPaid, credit: 0 });
        for (const p of (s.payments || [])) combined.push({ date: new Date(p.date), party: name, partyType: 'supplier', particulars: `Payment — ${s.batchName}`, debit: p.amount, credit: 0 });
      }

      for (const s of (salesRes.sales || [])) {
        const name = s.buyerId?.name || buyerMap[s.buyerId] || 'Unknown Buyer';
        combined.push({ date: new Date(s.createdAt), party: name, partyType: 'buyer', particulars: `Sale — ${s.invoiceNumber}`, debit: s.totalAmount, credit: 0 });
        const subPaid = (s.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
        const initPaid = (s.amountPaid || 0) - subPaid;
        if (initPaid > 0.001) combined.push({ date: new Date(s.createdAt), party: name, partyType: 'buyer', particulars: `Payment Received — ${s.invoiceNumber} (initial)`, debit: 0, credit: initPaid });
        for (const p of (s.payments || [])) combined.push({ date: new Date(p.date), party: name, partyType: 'buyer', particulars: `Payment Received — ${s.invoiceNumber}`, debit: 0, credit: p.amount });
      }

      for (const p of (suppPayRes.payments || [])) {
        const name = supplierMap[p.partyId] || 'Unknown Supplier';
        combined.push({ date: new Date(p.date), party: name, partyType: 'supplier', particulars: 'Advance Payment to Supplier', debit: p.amount, credit: 0 });
      }

      for (const p of (buyPayRes.payments || [])) {
        const name = buyerMap[p.partyId] || 'Unknown Buyer';
        combined.push({ date: new Date(p.date), party: name, partyType: 'buyer', particulars: 'Advance Payment from Buyer', debit: 0, credit: p.amount });
      }

      setAllRows(combined);
      setAllLoaded(true);
    } finally { setLoadingAll(false); }
  }, []);

  useEffect(() => {
    if (mainTab === 'all' && !allLoaded) buildAllLedger();
  }, [mainTab, allLoaded, buildAllLedger]);

  // ── Filtered helpers ────────────────────────────────────────────────────
  const applyDateFilter = (d: Date) => {
    if (dateFrom) { const f = new Date(dateFrom); f.setHours(0,0,0,0); if (d < f) return false; }
    if (dateTo)   { const t = new Date(dateTo);   t.setHours(23,59,59,999); if (d > t) return false; }
    return true;
  };

  const filteredRows = rows.filter(r => applyDateFilter(r.date)).sort((a, b) => a.date.getTime() - b.date.getTime());
  const filteredAll  = allRows.filter(r => applyDateFilter(r.date)).sort((a, b) => a.date.getTime() - b.date.getTime());

  // ── Party ledger calculations ───────────────────────────────────────────
  const openingBalance = selectedParty?.openingBalance || 0;
  const runningBalance = (idx: number) => {
    let bal = openingBalance;
    for (let i = 0; i <= idx; i++) {
      const r = filteredRows[i];
      bal = partyType === 'supplier' ? bal + r.credit - r.debit : bal + r.debit - r.credit;
    }
    return bal;
  };
  const totalDebit  = filteredRows.reduce((s, r) => s + r.debit,  0);
  const totalCredit = filteredRows.reduce((s, r) => s + r.credit, 0);
  const closingBal  = partyType === 'supplier' ? openingBalance + totalCredit - totalDebit : openingBalance + totalDebit - totalCredit;
  const balTag = (bal: number) => partyType === 'supplier' ? (bal > 0 ? 'Payable' : bal < 0 ? 'Advance' : 'Settled') : (bal > 0 ? 'Receivable' : bal < 0 ? 'Overpaid' : 'Settled');

  // ── All ledger calculations ─────────────────────────────────────────────
  const allSupplierCredit  = filteredAll.filter(r => r.partyType === 'supplier' && r.credit > 0).reduce((s, r) => s + r.credit, 0);
  const allSupplierDebit   = filteredAll.filter(r => r.partyType === 'supplier' && r.debit  > 0).reduce((s, r) => s + r.debit,  0);
  const allBuyerDebit      = filteredAll.filter(r => r.partyType === 'buyer'    && r.debit  > 0).reduce((s, r) => s + r.debit,  0);
  const allBuyerCredit     = filteredAll.filter(r => r.partyType === 'buyer'    && r.credit > 0).reduce((s, r) => s + r.credit, 0);
  const supplierOutstanding = allSupplierCredit - allSupplierDebit;
  const buyerOutstanding    = allBuyerDebit     - allBuyerCredit;

  // ── Export PDF (party) ──────────────────────────────────────────────────
  const exportPDF = async () => {
    const jspdfModule = await import('jspdf');
    const JsPDF = (jspdfModule as any).jsPDF || jspdfModule.default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new JsPDF();
    doc.setFontSize(16); doc.text('Ray Cloth House', 105, 15, { align: 'center' });
    doc.setFontSize(11); doc.text(`${partyType === 'supplier' ? 'Supplier' : 'Buyer'} Ledger — ${selectedParty?.name || ''}`, 105, 23, { align: 'center' });
    if (dateFrom || dateTo) { doc.setFontSize(9); doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 105, 30, { align: 'center' }); }
    const body: any[] = [
      ['', 'Opening Balance', '', '', '', `${formatCurrency(Math.abs(openingBalance))} ${balTag(openingBalance)}`],
      ...filteredRows.map((r, i) => { const bal = runningBalance(i); return [formatDate(r.date), r.particulars, r.reference, r.debit > 0 ? formatCurrency(r.debit) : '', r.credit > 0 ? formatCurrency(r.credit) : '', `${formatCurrency(Math.abs(bal))} ${balTag(bal)}`]; }),
      ['', 'TOTALS', '', formatCurrency(totalDebit), formatCurrency(totalCredit), `${formatCurrency(Math.abs(closingBal))} ${balTag(closingBal)}`],
    ];
    autoTable(doc, { startY: 35, head: [['Date', 'Particulars', 'Reference', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance']], body, styles: { fontSize: 7.5 }, headStyles: { fillColor: [66, 99, 235] }, didParseCell: (data: any) => { if (data.row.index === 0 || data.row.index === body.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [245, 245, 255]; } } });
    doc.save(`ledger-${selectedParty?.name?.replace(/\s+/g, '-')}.pdf`);
  };

  // ── Export PDF (all) ────────────────────────────────────────────────────
  const exportAllPDF = async () => {
    const jspdfModule = await import('jspdf');
    const JsPDF = (jspdfModule as any).jsPDF || jspdfModule.default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new JsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text('Ray Cloth House', 148, 15, { align: 'center' });
    doc.setFontSize(11); doc.text('Complete Business Ledger', 148, 23, { align: 'center' });
    if (dateFrom || dateTo) { doc.setFontSize(9); doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 148, 30, { align: 'center' }); }
    autoTable(doc, { startY: 35, head: [['Date', 'Party', 'Type', 'Particulars', 'Debit (Rs.)', 'Credit (Rs.)']], body: filteredAll.map(r => [formatDate(r.date), r.party, r.partyType === 'supplier' ? 'Supplier' : 'Buyer', r.particulars, r.debit > 0 ? formatCurrency(r.debit) : '', r.credit > 0 ? formatCurrency(r.credit) : '']), styles: { fontSize: 7 }, headStyles: { fillColor: [66, 99, 235] } });
    doc.save('ledger-all.pdf');
  };

  // ── Date filter bar (shared) ────────────────────────────────────────────
  const DateBar = () => (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />From</p>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />To</p>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      {(dateFrom || dateTo) && (
        <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Clear</button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
          <p className="text-sm text-gray-400 mt-0.5">Account statements and financial records</p>
        </div>
        <div className="flex items-center gap-2">
          {mainTab === 'party' && selectedParty && filteredRows.length > 0 && (
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          )}
          {mainTab === 'all' && filteredAll.length > 0 && (
            <button onClick={exportAllPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition">
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 px-1 pt-1">
          <button onClick={() => setMainTab('all')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${mainTab === 'all' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <LayoutList className="w-4 h-4" /> All Transactions
          </button>
          <button onClick={() => setMainTab('party')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${mainTab === 'party' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <User className="w-4 h-4" /> Party Ledger
          </button>
        </div>

        {/* ── ALL TAB ──────────────────────────────────────────────────── */}
        {mainTab === 'all' && (
          <div className="p-4 space-y-4">
            {/* Date filter */}
            <DateBar />

            {loadingAll ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Truck className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Purchases</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(allSupplierCredit)}</p>
                    <p className="text-xs text-gray-400 mt-1">from all suppliers</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Sales</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(allBuyerDebit)}</p>
                    <p className="text-xs text-gray-400 mt-1">to all buyers</p>
                  </div>

                  <div className={`rounded-xl border p-4 ${supplierOutstanding > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${supplierOutstanding > 0 ? 'bg-amber-100' : 'bg-gray-50'}`}>
                        <TrendingDown className={`w-3.5 h-3.5 ${supplierOutstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${supplierOutstanding > 0 ? 'text-amber-500' : 'text-gray-400'}`}>Supplier Payable</p>
                    </div>
                    <p className={`text-xl font-bold ${supplierOutstanding > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{formatCurrency(Math.max(0, supplierOutstanding))}</p>
                    <p className={`text-xs mt-1 ${supplierOutstanding > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{supplierOutstanding > 0 ? 'outstanding dues' : 'fully paid'}</p>
                  </div>

                  <div className={`rounded-xl border p-4 ${buyerOutstanding > 0 ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${buyerOutstanding > 0 ? 'bg-green-100' : 'bg-gray-50'}`}>
                        <TrendingUp className={`w-3.5 h-3.5 ${buyerOutstanding > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${buyerOutstanding > 0 ? 'text-green-600' : 'text-gray-400'}`}>Buyer Receivable</p>
                    </div>
                    <p className={`text-xl font-bold ${buyerOutstanding > 0 ? 'text-green-700' : 'text-gray-400'}`}>{formatCurrency(Math.max(0, buyerOutstanding))}</p>
                    <p className={`text-xs mt-1 ${buyerOutstanding > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{buyerOutstanding > 0 ? 'pending collection' : 'fully collected'}</p>
                  </div>
                </div>

                {/* All transactions table */}
                {filteredAll.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <BookOpen className="w-7 h-7 text-gray-200" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">No transactions found</p>
                    <p className="text-xs text-gray-400 mt-1">Add stock purchases or sales to see records here</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {filteredAll.length} transaction{filteredAll.length !== 1 ? 's' : ''}
                        {(dateFrom || dateTo) && ' in period'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Supplier</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Buyer</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Party</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Particulars</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-red-400 uppercase tracking-wide w-36">Debit (Dr)</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-green-500 uppercase tracking-wide w-36">Credit (Cr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAll.map((r, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.date)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${r.partyType === 'supplier' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                                  <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{r.party}</span>
                                </div>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block ${r.partyType === 'supplier' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {r.partyType === 'supplier' ? 'Supplier' : 'Buyer'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.particulars}</td>
                              <td className="px-4 py-3 text-right">
                                {r.debit > 0
                                  ? <span className="text-sm font-semibold text-red-600">{formatCurrency(r.debit)}</span>
                                  : <Minus className="w-3 h-3 text-gray-200 ml-auto" />}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {r.credit > 0
                                  ? <span className="text-sm font-semibold text-green-600">{formatCurrency(r.credit)}</span>
                                  : <Minus className="w-3 h-3 text-gray-200 ml-auto" />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td className="px-4 py-3.5" colSpan={3}>
                              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Grand Total</span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <p className="text-sm font-bold text-red-600">{formatCurrency(filteredAll.reduce((s, r) => s + r.debit, 0))}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Total Dr</p>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <p className="text-sm font-bold text-green-600">{formatCurrency(filteredAll.reduce((s, r) => s + r.credit, 0))}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Total Cr</p>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PARTY TAB ────────────────────────────────────────────────── */}
        {mainTab === 'party' && (
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Type toggle */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Type</p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button onClick={() => setPartyType('supplier')}
                    className={`px-4 py-2 font-medium transition ${partyType === 'supplier' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Supplier
                  </button>
                  <button onClick={() => setPartyType('buyer')}
                    className={`px-4 py-2 font-medium transition border-l border-gray-200 ${partyType === 'buyer' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    Buyer
                  </button>
                </div>
              </div>

              {/* Party select */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-medium text-gray-500 mb-1.5">{partyType === 'supplier' ? 'Supplier' : 'Buyer'}</p>
                <div className="relative">
                  <select value={selectedPartyId} onChange={e => handlePartyChange(e.target.value)} disabled={loadingParties}
                    className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">— Select {partyType === 'supplier' ? 'Supplier' : 'Buyer'} —</option>
                    {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <DateBar />
            </div>

            {/* Empty state */}
            {!selectedParty ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a {partyType} to view their ledger</p>
                <p className="text-xs text-gray-400 mt-1">A complete debit-credit statement will appear here</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Opening Balance</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(Math.abs(openingBalance))}</p>
                    <p className="text-xs text-gray-400 mt-1">{openingBalance === 0 ? 'No opening balance' : balTag(openingBalance)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-red-50 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center"><ArrowDownLeft className="w-3.5 h-3.5 text-red-500" /></div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{partyType === 'supplier' ? 'Payments Made' : 'Total Sales'}</p>
                    </div>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
                    <p className="text-xs text-gray-400 mt-1">Debit side</p>
                  </div>
                  <div className="bg-white rounded-xl border border-green-50 p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /></div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{partyType === 'supplier' ? 'Purchases' : 'Payments Received'}</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
                    <p className="text-xs text-gray-400 mt-1">Credit side</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${closingBal > 0 ? 'bg-amber-50 border-amber-100' : closingBal < 0 ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${closingBal > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                        <Scale className={`w-3.5 h-3.5 ${closingBal > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                      </div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${closingBal > 0 ? 'text-amber-500' : 'text-green-500'}`}>Closing Balance</p>
                    </div>
                    <p className={`text-xl font-bold ${closingBal > 0 ? 'text-amber-700' : closingBal < 0 ? 'text-green-700' : 'text-gray-500'}`}>{formatCurrency(Math.abs(closingBal))}</p>
                    <p className={`text-xs mt-1 font-semibold ${closingBal > 0 ? 'text-amber-600' : closingBal < 0 ? 'text-green-600' : 'text-gray-400'}`}>{balTag(closingBal)}</p>
                  </div>
                </div>

                {/* Party ledger table */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedParty.name}</p>
                      {(selectedParty.phone || selectedParty.address) && (
                        <p className="text-xs text-gray-400 mt-0.5">{[selectedParty.phone, selectedParty.address].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${partyType === 'supplier' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {partyType === 'supplier' ? 'Supplier' : 'Buyer'} Ledger
                    </span>
                  </div>

                  {filteredRows.length === 0 ? (
                    <div className="p-12 text-center">
                      <BookOpen className="w-9 h-9 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No transactions found for this period</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Date</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Particulars</th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Reference</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-red-400 uppercase tracking-wide w-36">Debit (Dr)</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-green-500 uppercase tracking-wide w-36">Credit (Cr)</th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-44">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-50 bg-gray-50/60">
                            <td className="px-5 py-3 text-xs text-gray-400">—</td>
                            <td className="px-5 py-3"><span className="text-sm font-semibold text-gray-700">Opening Balance</span><span className="ml-2 text-xs text-gray-400">b/f</span></td>
                            <td className="px-5 py-3 hidden md:table-cell" />
                            <td className="px-5 py-3 text-right text-gray-300 text-xs">—</td>
                            <td className="px-5 py-3 text-right text-gray-300 text-xs">—</td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-sm font-bold text-gray-700">{formatCurrency(Math.abs(openingBalance))}</span>
                              {openingBalance !== 0 && <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded ${openingBalance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{balTag(openingBalance)}</span>}
                            </td>
                          </tr>
                          {filteredRows.map((r, i) => {
                            const bal = runningBalance(i);
                            const isPayment = (r.debit > 0 && partyType === 'supplier') || (r.credit > 0 && partyType === 'buyer');
                            return (
                              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                                <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.date)}</td>
                                <td className="px-5 py-3"><p className={`text-sm ${isPayment ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>{r.particulars}</p></td>
                                <td className="px-5 py-3 text-xs text-gray-400 hidden md:table-cell">{r.reference || '—'}</td>
                                <td className="px-5 py-3 text-right">{r.debit > 0 ? <span className="text-sm font-semibold text-red-600">{formatCurrency(r.debit)}</span> : <Minus className="w-3 h-3 text-gray-200 ml-auto" />}</td>
                                <td className="px-5 py-3 text-right">{r.credit > 0 ? <span className="text-sm font-semibold text-green-600">{formatCurrency(r.credit)}</span> : <Minus className="w-3 h-3 text-gray-200 ml-auto" />}</td>
                                <td className="px-5 py-3 text-right">
                                  <span className={`text-sm font-bold ${bal > 0 ? 'text-amber-700' : bal < 0 ? 'text-green-700' : 'text-gray-400'}`}>{formatCurrency(Math.abs(bal))}</span>
                                  {bal !== 0 && <span className={`ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded ${bal > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{balTag(bal)}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td className="px-5 py-3.5" colSpan={3}><span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Grand Total</span></td>
                            <td className="px-5 py-3.5 text-right"><p className="text-sm font-bold text-red-600">{formatCurrency(totalDebit)}</p><p className="text-xs text-gray-400 mt-0.5">Total Dr</p></td>
                            <td className="px-5 py-3.5 text-right"><p className="text-sm font-bold text-green-600">{formatCurrency(totalCredit)}</p><p className="text-xs text-gray-400 mt-0.5">Total Cr</p></td>
                            <td className="px-5 py-3.5 text-right">
                              <p className={`text-sm font-bold ${closingBal > 0 ? 'text-amber-700' : closingBal < 0 ? 'text-green-700' : 'text-gray-500'}`}>{formatCurrency(Math.abs(closingBal))}</p>
                              <p className={`text-xs font-semibold mt-0.5 ${closingBal > 0 ? 'text-amber-500' : closingBal < 0 ? 'text-green-500' : 'text-gray-400'}`}>{balTag(closingBal)}</p>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
