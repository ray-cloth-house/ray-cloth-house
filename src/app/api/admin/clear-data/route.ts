import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthUser, requireRole } from '@/lib/auth';
import Stock from '@/models/Stock';
import Sale from '@/models/Sale';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import AuditLog from '@/models/AuditLog';
import Supplier from '@/models/Supplier';
import Buyer from '@/models/Buyer';
import Category from '@/models/Category';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const roleCheck = requireRole(authUser, ['owner']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();

    await Promise.all([
      Stock.deleteMany({}),
      Sale.deleteMany({}),
      Payment.deleteMany({}),
      Expense.deleteMany({}),
      AuditLog.deleteMany({}),
      Supplier.deleteMany({}),
      Buyer.deleteMany({}),
      Category.deleteMany({}),
    ]);

    return NextResponse.json({ success: true, message: 'All records cleared successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
