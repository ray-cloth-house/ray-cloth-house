import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ReturnStock from '@/models/ReturnStock';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const returns = await ReturnStock.find()
      .sort({ returnDate: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(returns);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    const { returnDate, returnType, partyName, itemName, quantity, measurementUnit, reason, notes } = body;

    if (!returnDate || !returnType || !partyName || !itemName || !quantity || !measurementUnit) {
      return NextResponse.json({ error: 'returnDate, returnType, partyName, itemName, quantity, and measurementUnit are required' }, { status: 400 });
    }
    if (!['from_buyer', 'to_supplier'].includes(returnType)) {
      return NextResponse.json({ error: 'returnType must be from_buyer or to_supplier' }, { status: 400 });
    }
    if (!['meter', 'piece'].includes(measurementUnit)) {
      return NextResponse.json({ error: 'measurementUnit must be meter or piece' }, { status: 400 });
    }
    if (Number(quantity) <= 0) {
      return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 });
    }

    const record = await ReturnStock.create({
      returnDate: new Date(returnDate),
      returnType,
      partyName: partyName.trim(),
      itemName: itemName.trim(),
      quantity: Number(quantity),
      measurementUnit,
      reason: reason?.trim() || '',
      notes: notes?.trim() || '',
      recordedBy: user.userId,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
