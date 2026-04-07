import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    const userObj = user.toObject();
    delete userObj.password;
    return NextResponse.json({ user: userObj });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
