import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Stock from '@/models/Stock';
import Sale from '@/models/Sale';
import Supplier from '@/models/Supplier';
import Buyer from '@/models/Buyer';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const roleCheck = requireRole(authUser, ['owner', 'admin']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type');
    const partyId = searchParams.get('partyId');

    const filter: any = {};
    if (type) filter.type = type;
    if (partyId) filter.partyId = partyId;

    const payments = await Payment.find(filter).sort({ date: -1 });
    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const roleCheck = requireRole(authUser, ['owner', 'admin']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();
    const body = await req.json();
    const { type, partyId, amount, method, date, notes, invoiceUrl } = body;

    if (!type || !partyId || !amount || !date) {
      return NextResponse.json({ error: 'Type, party, amount, and date are required' }, { status: 400 });
    }
    if (!['supplier', 'buyer'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
    }

    const totalAmount = Number(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (type === 'supplier') {
      const supplier = await Supplier.findById(partyId).select('_id').lean();
      if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    } else {
      const buyer = await Buyer.findById(partyId).select('_id').lean();
      if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    let remaining = totalAmount;
    const allocations: { label: string; appliedAmount: number; newStatus: string }[] = [];
    const paymentDate = date ? new Date(date) : new Date();
    const paymentMethod = method || 'cash';
    const paymentNotes = notes || '';

    if (type === 'supplier') {
      const batches = await Stock.find({
        supplierId: partyId,
        paymentStatus: { $ne: 'paid' },
      }).sort({ batchDate: 1, createdAt: 1 });

      for (const batch of batches) {
        if (remaining <= 0.001) break;
        const batchRemaining = batch.totalPrice - (batch.amountPaid || 0);
        if (batchRemaining <= 0.001) continue;
        const toApply = Math.min(remaining, batchRemaining);

        (batch.payments as any[]).push({
          amount: toApply,
          method: paymentMethod,
          date: paymentDate,
          notes: paymentNotes ? `[Auto] ${paymentNotes}` : 'Auto-applied from general payment',
          createdAt: new Date(),
        });
        batch.amountPaid = Math.min((batch.amountPaid || 0) + toApply, batch.totalPrice);
        batch.paymentStatus = batch.amountPaid >= batch.totalPrice ? 'paid' : 'partial';
        await batch.save();

        await AuditLog.create({
          entityType: 'Stock',
          entityId: batch._id,
          action: 'payment',
          changes: { amount: toApply, method: paymentMethod, paymentStatus: batch.paymentStatus, source: 'auto' },
          userId: authUser.userId,
        });

        allocations.push({ label: batch.batchName, appliedAmount: toApply, newStatus: batch.paymentStatus });
        remaining -= toApply;
      }
    } else {
      const sales = await Sale.find({
        buyerId: partyId,
        paymentStatus: { $ne: 'paid' },
      }).sort({ createdAt: 1 });

      for (const sale of sales) {
        if (remaining <= 0.001) break;
        const saleRemaining = sale.totalAmount - (sale.amountPaid || 0);
        if (saleRemaining <= 0.001) continue;
        const toApply = Math.min(remaining, saleRemaining);

        (sale.payments as any[]).push({
          amount: toApply,
          method: paymentMethod,
          date: paymentDate,
          notes: paymentNotes ? `[Auto] ${paymentNotes}` : 'Auto-applied from general payment',
          createdAt: new Date(),
        });
        sale.amountPaid = (sale.amountPaid || 0) + toApply;
        sale.paymentStatus = sale.amountPaid >= sale.totalAmount ? 'paid' : 'partial';
        await sale.save();

        await AuditLog.create({
          entityType: 'Sale',
          entityId: sale._id,
          action: 'payment',
          changes: { amount: toApply, method: paymentMethod, paymentStatus: sale.paymentStatus, source: 'auto' },
          userId: authUser.userId,
        });

        allocations.push({ label: sale.invoiceNumber, appliedAmount: toApply, newStatus: sale.paymentStatus });
        remaining -= toApply;
      }
    }

    let advancePayment = null;
    if (remaining > 0.001) {
      advancePayment = await Payment.create({
        type,
        partyId,
        amount: remaining,
        method: paymentMethod,
        date: paymentDate,
        notes: paymentNotes,
        invoiceUrl: invoiceUrl || '',
        userId: authUser.userId,
      });

      await AuditLog.create({
        entityType: 'Payment',
        entityId: advancePayment._id,
        action: 'create',
        changes: { type, partyId, amount: remaining, method: paymentMethod },
        userId: authUser.userId,
      });
    }

    return NextResponse.json(
      { allocations, advance: remaining > 0.001 ? remaining : 0, payment: advancePayment },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
