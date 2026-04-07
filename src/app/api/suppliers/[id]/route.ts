import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
import Stock from '@/models/Stock';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const supplier = await Supplier.findOne({ _id: params.id });
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const stocks = await Stock.find({ supplierId: params.id })
      .populate('categoryId', 'name measurementUnit')
      .sort({ createdAt: -1 });

    const payments = await Payment.find({ type: 'supplier', partyId: params.id })
      .sort({ date: -1 });

    // totalStockPaid = sum of all payments made against specific batches
    const totalStockPaid = stocks.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    // totalGeneralPayments = general ledger payments not tied to a specific batch
    const totalGeneralPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPurchases = stocks.reduce((sum, s) => sum + s.totalPrice, 0);
    // openingBalance = pre-existing debt owed to supplier before system start
    const balance = totalPurchases + (supplier.openingBalance || 0) - totalStockPaid - totalGeneralPayments;

    return NextResponse.json({
      supplier,
      stocks,
      payments,
      summary: {
        totalPurchases,
        totalStockPaid,
        totalGeneralPayments,
        totalPaid: totalStockPaid + totalGeneralPayments,
        balance,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const supplier = await Supplier.findOne({ _id: params.id });
    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const editEntries: any[] = [];
    const changes: any = {};

    for (const [key, value] of Object.entries(body)) {
      if (key === 'editHistory' || key === '_id' || key === 'userId') continue;
      const oldVal = (supplier as any)[key];
      if (oldVal !== value) {
        editEntries.push({ field: key, oldValue: oldVal, newValue: value, editedBy: authUser.userId, editedAt: new Date() });
        changes[key] = { old: oldVal, new: value };
      }
    }

    const updated = await Supplier.findByIdAndUpdate(
      params.id,
      { ...body, $push: { editHistory: { $each: editEntries } } },
      { new: true }
    );

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({ entityType: 'Supplier', entityId: params.id, action: 'edit', changes, userId: authUser.userId });
    }

    return NextResponse.json({ supplier: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}
