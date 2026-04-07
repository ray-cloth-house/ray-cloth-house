import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Buyer from '@/models/Buyer';
import Sale from '@/models/Sale';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const buyer = await Buyer.findOne({ _id: params.id });
    if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });

    const sales = await Sale.find({ buyerId: params.id }).sort({ createdAt: -1 });

    const payments = await Payment.find({ type: 'buyer', partyId: params.id }).sort({ date: -1 });

    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalSalePaid = sales.reduce((sum, s) => sum + s.amountPaid, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalReceived = totalSalePaid + totalPayments;
    const balance = totalSales + buyer.openingBalance - totalReceived;

    return NextResponse.json({
      buyer,
      sales,
      payments,
      summary: { totalSales, totalReceived, balance },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const buyer = await Buyer.findOne({ _id: params.id });
    if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });

    const editEntries: any[] = [];
    const changes: any = {};

    for (const [key, value] of Object.entries(body)) {
      if (key === 'editHistory' || key === '_id' || key === 'userId') continue;
      const oldVal = (buyer as any)[key];
      if (oldVal !== value) {
        editEntries.push({ field: key, oldValue: oldVal, newValue: value, editedBy: authUser.userId, editedAt: new Date() });
        changes[key] = { old: oldVal, new: value };
      }
    }

    const updated = await Buyer.findByIdAndUpdate(
      params.id,
      { ...body, $push: { editHistory: { $each: editEntries } } },
      { new: true }
    );

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({ entityType: 'Buyer', entityId: params.id, action: 'edit', changes, userId: authUser.userId });
    }

    return NextResponse.json({ buyer: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update buyer' }, { status: 500 });
  }
}
