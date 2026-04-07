import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Buyer from '@/models/Buyer';
import AuditLog from '@/models/AuditLog';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const search = req.nextUrl.searchParams.get('search') || '';
    const active = req.nextUrl.searchParams.get('active');

    const filter: any = {};
    if (active !== null && active !== undefined && active !== '') filter.isActive = active === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const buyers = await Buyer.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ buyers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch buyers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const duplicate = await Buyer.findOne({ phone: body.phone.trim() });
    if (duplicate) {
      return NextResponse.json(
        { error: `A buyer with phone ${body.phone} already exists (${duplicate.name})` },
        { status: 409 }
      );
    }

    const buyer = await Buyer.create({ ...body, userId: authUser.userId });

    await AuditLog.create({
      entityType: 'Buyer',
      entityId: buyer._id,
      action: 'create',
      changes: body,
      userId: authUser.userId,
    });

    return NextResponse.json({ buyer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create buyer' }, { status: 500 });
  }
}
