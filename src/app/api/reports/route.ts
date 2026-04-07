import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Stock from '@/models/Stock';
import Category from '@/models/Category';
import Supplier from '@/models/Supplier';
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const roleCheck = requireRole(user, ['owner', 'admin']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();

    const period = req.nextUrl.searchParams.get('period') || 'all';

    const now = new Date();
    let fromDate: Date | null = null;
    if (period === 'today')  fromDate = startOfDay(now);
    else if (period === 'week')  fromDate = startOfWeek(now, { weekStartsOn: 1 });
    else if (period === 'month') fromDate = startOfMonth(now);
    else if (period === 'year')  fromDate = startOfYear(now);

    // Fetch all reference data
    const [categories, suppliers] = await Promise.all([
      Category.find({}).lean(),
      Supplier.find({}).lean(),
    ]);

    const categoryMap: Record<string, string> = {};
    (categories as any[]).forEach((c) => { categoryMap[c._id.toString()] = c.name; });

    const supplierMap: Record<string, string> = {};
    (suppliers as any[]).forEach((s) => { supplierMap[s._id.toString()] = s.name; });

    // Fetch all stocks (optionally filtered by batchDate)
    const stockQuery: any = fromDate ? { batchDate: { $gte: fromDate } } : {};
    const stocks = await Stock.find(stockQuery).lean();

    // Fetch all sales (optionally filtered by createdAt)
    const saleQuery: any = fromDate ? { createdAt: { $gte: fromDate } } : {};
    const sales = await Sale.find(saleQuery).lean();

    // Build per-stock sales aggregation
    const stockSalesMap: Record<string, { qty: number; revenue: number; cost: number; profit: number }> = {};
    for (const sale of sales as any[]) {
      for (const item of sale.items) {
        const sid = item.stockId?.toString();
        if (!sid) continue;
        if (!stockSalesMap[sid]) stockSalesMap[sid] = { qty: 0, revenue: 0, cost: 0, profit: 0 };
        stockSalesMap[sid].qty      += item.quantity;
        stockSalesMap[sid].revenue  += item.totalPrice;
        stockSalesMap[sid].cost     += item.costPrice * item.quantity;
        stockSalesMap[sid].profit   += item.profit ?? (item.totalPrice - item.costPrice * item.quantity);
      }
    }

    // Build per-category aggregation from stocks + sales
    const catAgg: Record<string, {
      purchased: number; sold: number; remaining: number;
      revenue: number; cost: number; profit: number;
    }> = {};

    for (const stock of stocks as any[]) {
      const catId = stock.categoryId?.toString() || 'unknown';
      if (!catAgg[catId]) catAgg[catId] = { purchased: 0, sold: 0, remaining: 0, revenue: 0, cost: 0, profit: 0 };
      catAgg[catId].purchased += stock.quantity;
      catAgg[catId].remaining += stock.remainingQuantity;

      const sd = stockSalesMap[stock._id.toString()];
      if (sd) {
        catAgg[catId].sold    += sd.qty;
        catAgg[catId].revenue += sd.revenue;
        catAgg[catId].cost    += sd.cost;
        catAgg[catId].profit  += sd.profit;
      }
    }

    // Batch-wise report: one row per stock batch
    const batchReport = (stocks as any[]).map((stock) => {
      const sd = stockSalesMap[stock._id.toString()] || { qty: 0, revenue: 0, cost: 0, profit: 0 };
      return {
        batch:     stock.batchName,
        supplier:  supplierMap[stock.supplierId?.toString()] || 'Unknown',
        category:  categoryMap[stock.categoryId?.toString()] || 'Unknown',
        unit:      stock.measurementUnit,
        purchased: stock.quantity,
        sold:      sd.qty,
        remaining: stock.remainingQuantity,
        revenue:   sd.revenue,
        cost:      sd.cost,
        profit:    sd.profit,
        purchaseTotal: stock.totalPrice,
        amountPaid:    stock.amountPaid || 0,
      };
    });

    // Category-wise report
    const categoryReport = Object.entries(catAgg).map(([catId, data]) => ({
      category:  categoryMap[catId] || 'Unknown',
      purchased: data.purchased,
      sold:      data.sold,
      remaining: data.remaining,
      revenue:   data.revenue,
      cost:      data.cost,
      profit:    data.profit,
      margin:    data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : '0.0',
    }));

    return NextResponse.json({ categoryReport, batchReport });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
