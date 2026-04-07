import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import { getAuthUser, requireRole } from '@/lib/auth';

const VALID_CATEGORIES = ['utility', 'employee', 'operational', 'misc'] as const;
const MAX_AMOUNT = 10_000_000;

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const roleCheck = requireRole(authUser, ['owner', 'admin']);
    if (roleCheck) return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status });

    await dbConnect();
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const from     = searchParams.get('from');
    const to       = searchParams.get('to');

    const filter: any = {};
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total    = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, total });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
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

    if (!body.category || !body.amount || !body.date) {
      return NextResponse.json({ error: 'Category, amount, and date are required' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (Number(body.amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    if (Number(body.amount) > MAX_AMOUNT) {
      return NextResponse.json({ error: `Amount cannot exceed Rs. ${MAX_AMOUNT.toLocaleString()}` }, { status: 400 });
    }

    const expense = await Expense.create({ ...body, userId: authUser.userId });
    return NextResponse.json({ expense }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
