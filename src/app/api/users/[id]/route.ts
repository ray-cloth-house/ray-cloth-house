import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const requestingUser = await User.findById(authUser.userId).select('role');
    if (!requestingUser || !['owner', 'admin'].includes(requestingUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify the owner account' }, { status: 403 });
    }

    const body = await req.json();
    const { role, status } = body;
    const changes: Record<string, { old: any; new: any }> = {};

    if (role !== undefined) {
      if (role === 'owner') {
        return NextResponse.json({ error: 'Cannot assign owner role' }, { status: 400 });
      }

      if (requestingUser.role === 'admin' && role !== 'staff') {
        return NextResponse.json({ error: 'Admins can only assign staff role' }, { status: 403 });
      }

      if (requestingUser.role === 'owner' && !['admin', 'staff'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      changes.role = { old: targetUser.role, new: role };
      targetUser.role = role;
    }

    if (status !== undefined) {
      const validTransitions: Record<string, string[]> = {
        pending: ['active', 'suspended'],
        active: ['suspended'],
        suspended: ['active'],
      };

      const allowed = validTransitions[targetUser.status];
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${targetUser.status} to ${status}` },
          { status: 400 }
        );
      }

      changes.status = { old: targetUser.status, new: status };
      targetUser.status = status;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await targetUser.save();

    await AuditLog.create({
      entityType: 'User',
      entityId: targetUser._id,
      action: 'edit',
      changes,
      userId: authUser.userId,
    });

    return NextResponse.json({
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      createdAt: targetUser.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
