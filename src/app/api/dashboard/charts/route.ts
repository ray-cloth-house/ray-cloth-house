import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Expense from '@/models/Expense';
import Category from '@/models/Category';
import Buyer from '@/models/Buyer';
import { getAuthUser } from '@/lib/auth';
import { subDays, format, startOfDay, startOfMonth, subMonths } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    // Single-tenant: no userId filter
    const [allSales, allExpenses, categories, buyers] = await Promise.all([
      Sale.find({}).lean(),
      Expense.find({}).lean(),
      Category.find({}).lean(),
      Buyer.find({}).lean(),
    ]);

    const categoryMap: Record<string, string> = {};
    (categories as any[]).forEach((c) => { categoryMap[c._id.toString()] = c.name; });
    const buyerMap: Record<string, string> = {};
    (buyers as any[]).forEach((b) => { buyerMap[b._id.toString()] = b.name; });

    const now = new Date();
    const thirtyDaysAgo = startOfDay(subDays(now, 29));
    const salesTrend: Record<string, { date: string; amount: number; profit: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(now, 29 - i), 'yyyy-MM-dd');
      salesTrend[d] = { date: format(subDays(now, 29 - i), 'MMM dd'), amount: 0, profit: 0 };
    }
    (allSales as any[]).forEach((s) => {
      const sDate = new Date(s.createdAt);
      if (sDate >= thirtyDaysAgo) {
        const key = format(sDate, 'yyyy-MM-dd');
        if (salesTrend[key]) {
          salesTrend[key].amount += s.totalAmount;
          salesTrend[key].profit += s.totalProfit;
        }
      }
    });

    const catPerf: Record<string, number> = {};
    (allSales as any[]).forEach((s) => {
      (s.items || []).forEach((item: any) => {
        const name = categoryMap[item.categoryId?.toString()] || 'Uncategorized';
        catPerf[name] = (catPerf[name] || 0) + item.totalPrice;
      });
    });

    const expBreakdown: Record<string, number> = {};
    (allExpenses as any[]).forEach((e) => {
      const cat = e.category || 'misc';
      expBreakdown[cat] = (expBreakdown[cat] || 0) + e.amount;
    });

    const buyerTotals: Record<string, { name: string; total: number }> = {};
    (allSales as any[]).forEach((s) => {
      const bId = s.buyerId?.toString();
      const name = buyerMap[bId] || 'Unknown';
      if (!buyerTotals[bId]) buyerTotals[bId] = { name, total: 0 };
      buyerTotals[bId].total += s.totalAmount;
    });
    const topBuyers = Object.values(buyerTotals).sort((a, b) => b.total - a.total).slice(0, 5);

    const monthlySales: { month: string; sales: number; profit: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = i > 0 ? startOfMonth(subMonths(now, i - 1)) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const mSales = (allSales as any[]).filter((s) => {
        const d = new Date(s.createdAt);
        return d >= mStart && d < mEnd;
      });
      monthlySales.push({
        month:  format(mStart, 'MMM yy'),
        sales:  mSales.reduce((sum, s) => sum + s.totalAmount, 0),
        profit: mSales.reduce((sum, s) => sum + s.totalProfit, 0),
      });
    }

    return NextResponse.json({
      salesTrend:          Object.values(salesTrend),
      categoryPerformance: Object.entries(catPerf).map(([name, value]) => ({ name, value })),
      expenseBreakdown:    Object.entries(expBreakdown).map(([name, value]) => ({ name, value })),
      topBuyers,
      monthlySales,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
