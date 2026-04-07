import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const sale = await Sale.findOne({ _id: params.id })
      .populate('buyerId', 'name phone address')
      .populate('items.categoryId', 'name measurementUnit');

    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    return NextResponse.json({ sale });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { amount, method, date, notes, invoiceUrl } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero' }, { status: 400 });
    }

    const sale = await Sale.findById(params.id);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    if (sale.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This sale is already fully paid' }, { status: 400 });
    }

    const remaining = sale.totalAmount - (sale.amountPaid || 0);
    if (Number(amount) > remaining + 0.001) {
      return NextResponse.json(
        { error: `Amount exceeds remaining due of Rs. ${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    const newPayment = {
      amount:    Number(amount),
      method:    method || 'cash',
      date:      date ? new Date(date) : new Date(),
      notes:     notes || '',
      createdAt: new Date(),
    };

    sale.payments.push(newPayment as any);
    sale.amountPaid = Math.min((sale.amountPaid || 0) + Number(amount), sale.totalAmount);
    sale.paymentStatus = sale.amountPaid >= sale.totalAmount ? 'paid' : 'partial';
    if (invoiceUrl) (sale as any).invoiceUrl = invoiceUrl;

    await sale.save();

    await AuditLog.create({
      entityType: 'Sale',
      entityId:   params.id,
      action:     'payment',
      changes:    { amount: Number(amount), method: method || 'cash', paymentStatus: sale.paymentStatus },
      userId:     authUser.userId,
    });

    const populated = await Sale.findById(sale._id)
      .populate('buyerId', 'name phone address')
      .populate('items.categoryId', 'name measurementUnit');

    return NextResponse.json({ sale: populated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
