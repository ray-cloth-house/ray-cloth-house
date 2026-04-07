import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Sale from '@/models/Sale';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import Supplier from '@/models/Supplier';
import Buyer from '@/models/Buyer';
import { getAuthUser } from '@/lib/auth';
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart  = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart  = startOfYear(now);

    // Single-tenant: no userId filter — all data is shared across users
    const [stocks, allSales, allPayments, allExpenses, suppliers, buyers] = await Promise.all([
      Stock.find({}).lean(),
      Sale.find({}).lean(),
      Payment.find({}).lean(),
      Expense.find({}).lean(),
      Supplier.find({ isActive: true }).lean(),
      Buyer.find({ isActive: true }).lean(),
    ]);

    const totalStockValue  = (stocks as any[]).reduce((sum, s) => sum + s.remainingQuantity * s.unitPrice, 0);
    const totalPurchases   = (stocks as any[]).reduce((sum, s) => sum + s.totalPrice, 0);

    const salesByPeriod = (from: Date) => (allSales as any[]).filter(s => new Date(s.createdAt) >= from);
    const sumSales  = (list: any[]) => list.reduce((sum, s) => sum + s.totalAmount, 0);
    const sumProfit = (list: any[]) => list.reduce((sum, s) => sum + s.totalProfit, 0);

    const totalExpenses  = (allExpenses as any[]).reduce((sum, e) => sum + e.amount, 0);
    const monthExpenses  = (allExpenses as any[]).filter(e => new Date(e.date) >= monthStart).reduce((sum, e) => sum + e.amount, 0);

    // Supplier outstanding = total purchased - batch payments already made - advance payments (Payment model)
    const totalStockPaid        = (stocks as any[]).reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const supplierAdvancePayments = (allPayments as any[]).filter(p => p.type === 'supplier').reduce((sum, p) => sum + p.amount, 0);
    const suppliersOpeningBalance = (suppliers as any[]).reduce((sum, s) => sum + (s.openingBalance || 0), 0);
    const outstandingToSuppliers = Math.max(0, totalPurchases + suppliersOpeningBalance - totalStockPaid - supplierAdvancePayments);

    // Buyer outstanding = total sales - amounts received (batch + advance) - advance payments (Payment model)
    const totalSalesAmount     = sumSales(allSales as any[]);
    const totalSalePaid        = (allSales as any[]).reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    const buyerAdvancePayments = (allPayments as any[]).filter(p => p.type === 'buyer').reduce((sum, p) => sum + p.amount, 0);
    const buyersOpeningBalance = (buyers as any[]).reduce((sum, b) => sum + (b.openingBalance || 0), 0);
    const outstandingFromBuyers = Math.max(0, totalSalesAmount + buyersOpeningBalance - totalSalePaid - buyerAdvancePayments);

    const grossProfit = sumProfit(allSales as any[]);
    const netProfit   = grossProfit - totalExpenses;

    return NextResponse.json({
      totalStockValue,
      totalPurchases,
      sales: {
        today: sumSales(salesByPeriod(todayStart)),
        week:  sumSales(salesByPeriod(weekStart)),
        month: sumSales(salesByPeriod(monthStart)),
        year:  sumSales(salesByPeriod(yearStart)),
        total: totalSalesAmount,
      },
      profit: {
        today: sumProfit(salesByPeriod(todayStart)),
        week:  sumProfit(salesByPeriod(weekStart)),
        month: sumProfit(salesByPeriod(monthStart)),
        year:  sumProfit(salesByPeriod(yearStart)),
        gross: grossProfit,
        net:   netProfit,
      },
      expenses: { total: totalExpenses, month: monthExpenses },
      outstanding: { fromBuyers: outstandingFromBuyers, toSuppliers: outstandingToSuppliers },
      counts: {
        suppliers:    (suppliers as any[]).length,
        buyers:       (buyers as any[]).length,
        stockBatches: (stocks as any[]).length,
        totalSales:   (allSales as any[]).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
