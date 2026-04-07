import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Sale from '@/models/Sale';
import Stock from '@/models/Stock';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';
import { generateInvoiceNumber } from '@/lib/utils';

const MAX_UNIT_PRICE = 10_000_000;
const MAX_QUANTITY   = 1_000_000;

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = req.nextUrl;
    const buyer  = searchParams.get('buyer');
    const status = searchParams.get('status');

    const filter: any = {};
    if (buyer)  filter.buyerId       = buyer;
    if (status) filter.paymentStatus = status;

    const sales = await Sale.find(filter)
      .populate('buyerId', 'name phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({ sales });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (!body.buyerId || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Buyer and at least one item are required' }, { status: 400 });
    }

    // ── Phase 1: validate ALL items before touching any stock ──────────────
    const stockDocs: any[] = [];
    for (const item of body.items) {
      if (!item.stockId || item.quantity <= 0 || item.unitPrice < 0) {
        return NextResponse.json({ error: 'Each item requires a valid stockId, quantity, and unit price' }, { status: 400 });
      }
      if (item.quantity > MAX_QUANTITY) {
        return NextResponse.json({ error: `Quantity cannot exceed ${MAX_QUANTITY.toLocaleString()}` }, { status: 400 });
      }
      if (item.unitPrice > MAX_UNIT_PRICE) {
        return NextResponse.json({ error: `Unit price cannot exceed Rs. ${MAX_UNIT_PRICE.toLocaleString()}` }, { status: 400 });
      }

      const stock = await Stock.findById(item.stockId);
      if (!stock) {
        return NextResponse.json({ error: `Stock batch not found: ${item.stockId}` }, { status: 404 });
      }
      if (stock.remainingQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${stock.batchName}". Available: ${stock.remainingQuantity}` },
          { status: 400 }
        );
      }
      stockDocs.push(stock);
    }

    // ── Phase 2: all valid — compute totals and write ──────────────────────
    let totalAmount = 0;
    let totalCost   = 0;
    const processedItems = [];

    for (let i = 0; i < body.items.length; i++) {
      const item  = body.items[i];
      const stock = stockDocs[i];

      const itemTotal = item.quantity * item.unitPrice;
      const itemCost  = item.quantity * stock.unitPrice;
      totalAmount += itemTotal;
      totalCost   += itemCost;

      processedItems.push({
        stockId:         item.stockId,
        categoryId:      stock.categoryId,
        batchName:       stock.batchName,
        quantity:        item.quantity,
        unitPrice:       item.unitPrice,
        costPrice:       stock.unitPrice,
        totalPrice:      itemTotal,
        profit:          itemTotal - itemCost,
        measurementUnit: stock.measurementUnit,
      });

      await Stock.findByIdAndUpdate(item.stockId, { $inc: { remainingQuantity: -item.quantity } });
    }

    const amountPaid = Number(body.amountPaid) || 0;
    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (amountPaid >= totalAmount) paymentStatus = 'paid';
    else if (amountPaid > 0)       paymentStatus = 'partial';

    const payments = [];
    if (amountPaid > 0) {
      payments.push({
        amount:    amountPaid,
        method:    body.paymentMethod || 'cash',
        date:      body.saleDate ? new Date(body.saleDate) : new Date(),
        notes:     'Initial payment at sale',
        createdAt: new Date(),
      });
    }

    const sale = await Sale.create({
      buyerId:       body.buyerId,
      items:         processedItems,
      totalAmount,
      totalCost,
      totalProfit:   totalAmount - totalCost,
      amountPaid,
      paymentStatus,
      paymentMethod: body.paymentMethod || 'cash',
      notes:         body.notes || '',
      invoiceUrl:    body.invoiceUrl || '',
      saleDate:      body.saleDate ? new Date(body.saleDate) : new Date(),
      userId:        authUser.userId,
      invoiceNumber: generateInvoiceNumber(),
      payments,
    });

    await AuditLog.create({
      entityType: 'Sale',
      entityId:   sale._id,
      action:     'create',
      changes:    { totalAmount, items: processedItems.length, buyerId: body.buyerId },
      userId:     authUser.userId,
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}
