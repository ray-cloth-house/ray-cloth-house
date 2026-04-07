import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { name, email, password, phone } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name || '',
      email: email.toLowerCase(),
      password: hashedPassword,
      businessName: '',
      phone: phone || '',
      address: '',
      role: isFirstUser ? 'owner' : 'staff',
      status: isFirstUser ? 'active' : 'pending',
    });

    if (isFirstUser) {
      const token = signToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
      });

      const response = NextResponse.json({
        message: 'Registration successful',
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
    }

    return NextResponse.json({
      message: 'Registration successful. Your account is awaiting approval.',
      pending: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
