import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const categories = await Category.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ categories });
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
    const { name, parentId, measurementUnit } = await req.json();

    if (!name || !measurementUnit) {
      return NextResponse.json({ error: 'Name and measurement unit are required' }, { status: 400 });
    }

    const category = await Category.create({
      name,
      parentId: parentId || null,
      measurementUnit,
      userId: authUser.userId,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
