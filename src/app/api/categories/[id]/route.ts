import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import Stock from '@/models/Stock';
import { getAuthUser, requireRole } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    const roleCheck = requireRole(authUser, ['owner', 'admin']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();
    const { name, measurementUnit, isActive } = await req.json();
    const { id } = params;

    const category = await Category.findOneAndUpdate(
      { _id: id },
      {
        ...(name              && { name }),
        ...(measurementUnit   && { measurementUnit }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    );

    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(req);
    const roleCheck = requireRole(authUser, ['owner']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();
    const { id } = params;

    const category = await Category.findById(id);
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const stockCount = await Stock.countDocuments({ categoryId: id });
    if (stockCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${stockCount} stock batch(es) are linked to this category. Deactivate it instead.` },
        { status: 409 }
      );
    }

    await Category.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
