import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ownerExists = await User.countDocuments({ role: 'owner' });
    let needsUpdate = false;
    if (ownerExists === 0) {
      const oldestUser = await User.findOne().sort({ createdAt: 1 }).select('_id');
      if (oldestUser && oldestUser._id.toString() === user._id.toString()) {
        needsUpdate = true;
        await User.findByIdAndUpdate(user._id, { role: 'owner', status: 'active' });
        user.role = 'owner';
        user.status = 'active';
      }
    }
    if (!needsUpdate && (!user.role || !user.status)) {
      const updates: any = {};
      if (!user.role) { updates.role = 'staff'; user.role = 'staff'; }
      if (!user.status) { updates.status = 'active'; user.status = 'active'; }
      await User.findByIdAndUpdate(user._id, updates);
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Your account is awaiting approval from an administrator' }, { status: 403 });
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Your account has been suspended. Please contact the administrator.' }, { status: 403 });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user._id, email: user.email, businessName: user.businessName, role: user.role, status: user.status },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
