import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Stock from '@/models/Stock';
import Category from '@/models/Category';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

const MAX_VALUE    = 10_000_000;
const MAX_QUANTITY = 1_000_000;

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const supplier = searchParams.get('supplier');
    const search   = searchParams.get('search');

    const filter: any = {};
    if (category) filter.categoryId = category;
    if (supplier) filter.supplierId = supplier;
    if (search)   filter.batchName  = { $regex: search, $options: 'i' };

    const stocks = await Stock.find(filter)
      .populate('supplierId', 'name phone')
      .populate('categoryId', 'name measurementUnit parentId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ stocks });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (!body.supplierId || !body.categoryId || !body.batchName || !body.batchDate) {
      return NextResponse.json({ error: 'Supplier, category, batch name, and date are required' }, { status: 400 });
    }

    const category = await Category.findOne({ _id: body.categoryId });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const quantity   = Number(body.quantity)   || 0;
    const unitPrice  = Number(body.unitPrice)  || 0;
    const totalPrice = Number(body.totalPrice) || 0;

    if (quantity < 0 || unitPrice < 0 || totalPrice < 0) {
      return NextResponse.json({ error: 'Values cannot be negative' }, { status: 400 });
    }
    if (quantity > MAX_QUANTITY) {
      return NextResponse.json({ error: `Quantity cannot exceed ${MAX_QUANTITY.toLocaleString()}` }, { status: 400 });
    }
    if (unitPrice > MAX_VALUE || totalPrice > MAX_VALUE) {
      return NextResponse.json({ error: `Price cannot exceed Rs. ${MAX_VALUE.toLocaleString()}` }, { status: 400 });
    }

    const provided = [quantity > 0, unitPrice > 0, totalPrice > 0].filter(Boolean).length;
    if (provided < 2) {
      return NextResponse.json({ error: 'Provide at least two of: quantity, unit price, total price' }, { status: 400 });
    }

    let finalQty   = quantity;
    let finalUnit  = unitPrice;
    let finalTotal = totalPrice;

    if (finalQty > 0 && finalUnit > 0)        finalTotal = finalQty * finalUnit;
    else if (finalQty > 0 && finalTotal > 0)  finalUnit  = finalTotal / finalQty;
    else if (finalUnit > 0 && finalTotal > 0) finalQty   = finalTotal / finalUnit;

    const amountPaid = Number(body.amountPaid) || 0;
    if (amountPaid > finalTotal) {
      return NextResponse.json({ error: 'Amount paid cannot exceed total price' }, { status: 400 });
    }

    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
    if (amountPaid >= finalTotal) paymentStatus = 'paid';
    else if (amountPaid > 0)     paymentStatus = 'partial';

    const payments = [];
    if (amountPaid > 0) {
      payments.push({
        amount:    amountPaid,
        method:    body.paymentMethod || 'cash',
        date:      body.batchDate ? new Date(body.batchDate) : new Date(),
        notes:     'Initial payment at stock entry',
        createdAt: new Date(),
      });
    }

    const stock = await Stock.create({
      supplierId:        body.supplierId,
      categoryId:        body.categoryId,
      batchName:         body.batchName,
      batchDate:         body.batchDate,
      description:       body.description || '',
      quantity:          finalQty,
      remainingQuantity: finalQty,
      unitPrice:         finalUnit,
      totalPrice:        finalTotal,
      measurementUnit:   category.measurementUnit,
      images:            body.images  || [],
      colors:            body.colors  || [],
      sizes:             body.sizes   || [],
      invoiceUrl:        body.invoiceUrl || '',
      amountPaid,
      paymentStatus,
      paymentMethod:     body.paymentMethod || 'cash',
      payments,
      userId:            authUser.userId,
    });

    await AuditLog.create({
      entityType: 'Stock',
      entityId:   stock._id,
      action:     'create',
      changes:    { batchName: body.batchName, quantity: finalQty, totalPrice: finalTotal, measurementUnit: category.measurementUnit },
      userId:     authUser.userId,
    });

    return NextResponse.json({ stock }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create stock batch' }, { status: 500 });
  }
}
