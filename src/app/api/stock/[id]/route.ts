import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

const MAX_VALUE    = 10_000_000;
const MAX_QUANTITY = 1_000_000;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const stock = await Stock.findOne({ _id: params.id })
      .populate('supplierId', 'name phone')
      .populate('categoryId', 'name measurementUnit');

    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 });

    const auditLogs = await AuditLog.find({ entityType: 'Stock', entityId: params.id }).sort({ timestamp: -1 });

    return NextResponse.json({ stock, history: auditLogs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stock batch' }, { status: 500 });
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

    const stock = await Stock.findById(params.id);
    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 });

    if (stock.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This stock batch is already fully paid' }, { status: 400 });
    }

    const remaining = stock.totalPrice - stock.amountPaid;
    if (Number(amount) > remaining + 0.001) {
      return NextResponse.json({ error: `Amount exceeds remaining due of Rs. ${remaining.toFixed(2)}` }, { status: 400 });
    }

    const newPayment = {
      amount:    Number(amount),
      method:    method || 'cash',
      date:      date ? new Date(date) : new Date(),
      notes:     notes || '',
      createdAt: new Date(),
    };

    (stock.payments as any[]).push(newPayment);
    stock.amountPaid    = Math.min((stock.amountPaid || 0) + Number(amount), stock.totalPrice);
    stock.paymentStatus = stock.amountPaid >= stock.totalPrice ? 'paid' : 'partial';
    if (invoiceUrl) (stock as any).invoiceUrl = invoiceUrl;

    await stock.save();

    await AuditLog.create({
      entityType: 'Stock',
      entityId:   params.id,
      action:     'payment',
      changes:    { amount: Number(amount), method, paymentStatus: stock.paymentStatus },
      userId:     authUser.userId,
    });

    const populated = await Stock.findById(stock._id)
      .populate('supplierId', 'name phone')
      .populate('categoryId', 'name measurementUnit');

    return NextResponse.json({ stock: populated });
  } catch {
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const stock = await Stock.findById(params.id);
    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 });

    // Validate numeric bounds on any edited fields
    if (body.quantity !== undefined) {
      if (Number(body.quantity) < 0) return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
      if (Number(body.quantity) > MAX_QUANTITY) return NextResponse.json({ error: `Quantity cannot exceed ${MAX_QUANTITY.toLocaleString()}` }, { status: 400 });
    }
    if (body.unitPrice !== undefined && Number(body.unitPrice) > MAX_VALUE) {
      return NextResponse.json({ error: `Unit price cannot exceed Rs. ${MAX_VALUE.toLocaleString()}` }, { status: 400 });
    }
    if (body.totalPrice !== undefined && Number(body.totalPrice) > MAX_VALUE) {
      return NextResponse.json({ error: `Total price cannot exceed Rs. ${MAX_VALUE.toLocaleString()}` }, { status: 400 });
    }

    const editEntries: any[] = [];
    const changes: any       = {};

    for (const [key, value] of Object.entries(body)) {
      if (key === 'editHistory' || key === '_id' || key === 'userId') continue;
      const oldVal = (stock as any)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
        editEntries.push({ field: key, oldValue: oldVal, newValue: value, editedBy: authUser.userId, editedAt: new Date() });
        changes[key] = { old: oldVal, new: value };
      }
    }

    // If quantity is being changed, recalculate remainingQuantity proportionally
    // remainingQuantity = newQuantity - soldQuantity
    // soldQuantity = oldQuantity - oldRemainingQuantity
    const updateData: any = { ...body };
    if (body.quantity !== undefined && Number(body.quantity) !== stock.quantity) {
      const newQuantity  = Number(body.quantity);
      const soldQuantity = stock.quantity - stock.remainingQuantity;
      const newRemaining = Math.max(0, newQuantity - soldQuantity);
      updateData.remainingQuantity = newRemaining;

      editEntries.push({
        field:     'remainingQuantity',
        oldValue:  stock.remainingQuantity,
        newValue:  newRemaining,
        editedBy:  authUser.userId,
        editedAt:  new Date(),
      });
      changes.remainingQuantity = { old: stock.remainingQuantity, new: newRemaining };
    }

    const updated = await Stock.findByIdAndUpdate(
      params.id,
      { ...updateData, $push: { editHistory: { $each: editEntries } } },
      { new: true }
    );

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({ entityType: 'Stock', entityId: params.id, action: 'edit', changes, userId: authUser.userId });
    }

    return NextResponse.json({ stock: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update stock batch' }, { status: 500 });
  }
}
