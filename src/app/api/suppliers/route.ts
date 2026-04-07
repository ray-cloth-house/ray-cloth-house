import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';
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

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ suppliers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
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

    const duplicate = await Supplier.findOne({ phone: body.phone.trim() });
    if (duplicate) {
      return NextResponse.json(
        { error: `A supplier with phone ${body.phone} already exists (${duplicate.name})` },
        { status: 409 }
      );
    }

    const supplier = await Supplier.create({ ...body, userId: authUser.userId });

    await AuditLog.create({
      entityType: 'Supplier',
      entityId: supplier._id,
      action: 'create',
      changes: body,
      userId: authUser.userId,
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
